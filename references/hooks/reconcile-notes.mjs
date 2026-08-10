#!/usr/bin/env node
// rapid · reconcile-notes — PostToolUse(Bash) hook that fires the moment work
// reaches a PR and hands the agent the exact reconciliation checklist for the
// session doc's `## Notes` queue.
//
// WHY: `push` opens the PR, then flips the shipped notes `[c]` → `[x]` with the
// PR URL and catches up any note left unchecked (push.md step 8). That flip is
// the last step of a long turn and the easiest one to half-do. When it's
// skipped the PR is fine but the queue is a lie: finished notes still read
// `[c]`/`[~]`/`[ ]`, so the next agent (or the next day's user) has to open
// every PR and diff it against the doc to learn what actually shipped. That
// archaeology is the slow burn this hook exists to end.
//
// WHAT IT DOES: on a Bash call that either (a) opened a PR (`gh pr create` with
// a GitHub pull URL in its output) or (b) pushed a branch the doc already ties
// to a PR (the `carpool` path), it parses the session doc for the tool's cwd and
// emits — as PostToolUse `additionalContext`, so it lands next to the tool
// result on the agent's very next turn — the notes that still need a decision:
//   · notes still `[c]` (must become `[x]` + `→ PR #<n> <url>` if they shipped)
//   · notes `[ ]`/`[~]` whose own branch has commits ahead of origin/main
//     (work exists but the queue doesn't say so)
//   · notes marked `[x]` with no PR URL anywhere in them
//   · what remains open, for the queue line the user gets under the PR link
// It writes NOTHING and decides nothing — which notes shipped is semantic and
// stays the agent's call. It only makes the checklist impossible to not see.
//
// SAFETY: read-only; never blocks (PostToolUse runs after the tool); silent when
// there is nothing to reconcile; wrapped so it can never throw. Always exits 0.
// The context it emits says outright that the push already succeeded, so an
// agent reading it never re-runs `gh pr create`.
//
// INSTALL: PostToolUse(Bash) hook in ~/.claude/settings.json pointing at this
// file (see references/setup.md → the hooks table).

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  readPayload, toolCommand, toolCwd, resolveCwd, sessionForCwd, sessionsDir, git,
} from './_shared.mjs';

const BOXES = { ' ': 'pending', '~': 'in progress', c: 'committed', x: 'shipped', '!': 'blocked', p: 'parked', '-': 'dropped' };

// The `## Notes` section, up to the next `## ` heading.
function section(body, name) {
  const i = body.search(new RegExp(`^## ${name}\\s*$`, 'm'));
  if (i === -1) return '';
  const rest = body.slice(i + 1);
  const n = rest.search(/^## /m);
  return n === -1 ? body.slice(i) : body.slice(i, i + 1 + n);
}

// Top-level note lines, numbered from 1 in doc order (all status types count —
// the same numbering `push`, `review` and `park <N>` use). Indented lines
// following a note belong to it.
function parseNotes(body) {
  const notes = [];
  for (const line of section(body, 'Notes').split('\n')) {
    const m = line.match(/^- \[([ ~cx!p-])\]\s*(.*)$/);
    if (m) {
      notes.push({ num: notes.length + 1, box: m[1], text: m[2], sub: [] });
    } else if (notes.length && /^\s+\S/.test(line)) {
      notes[notes.length - 1].sub.push(line.trim());
    }
  }
  return notes;
}

function noteBranch(note) {
  for (const line of [note.text, ...note.sub]) {
    const m = line.match(/branch:\s*`?([\w./-]+)`?/);
    if (m) return m[1];
  }
  return '';
}
function hasPrRef(note) {
  return [note.text, ...note.sub].some((l) => /PR #\d+/.test(l));
}
function label(note) {
  return note.text.replace(/^\[\d{1,2}:\d{2}\]\s*/, '').slice(0, 60);
}

// Base ref to measure "has unshipped commits" against.
function baseRef(cwd) {
  for (const ref of ['origin/main', 'origin/master']) {
    try { git(cwd, ['rev-parse', '--verify', '--quiet', ref]); return ref; } catch { /* next */ }
  }
  return '';
}
function commitsAhead(cwd, branch, base) {
  if (!branch || !base) return 0;
  try {
    git(cwd, ['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`]);
    return Number(git(cwd, ['rev-list', '--count', `${base}..${branch}`])) || 0;
  } catch {
    return 0;
  }
}

// The PR this call reached: an opened PR from `gh pr create` output, or — the
// carpool path — a plain push to a branch the doc already ties to a PR.
function targetPr(cmd, cwd, docBody) {
  const isCreate = /\bgh\s+pr\s+create\b/.test(cmd);
  if (isCreate) return null; // resolved from tool output by the caller
  if (!/\bgit\s+push\b/.test(cmd)) return null;
  let branch = '';
  try { branch = git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']); } catch { return null; }
  if (!branch.startsWith('rapid/')) return null;
  for (const line of docBody.split('\n')) {
    if (!line.includes(branch)) continue;
    const m = line.match(/PR #(\d+)/);
    if (m) {
      const url = (line.match(/https:\/\/github\.com\/\S+\/pull\/\d+/) || [])[0] || '';
      return { num: m[1], url, carpool: true };
    }
  }
  return null;
}

function buildReport(slug, pr, notes, cwd) {
  const base = baseRef(cwd);
  const ref = pr.url ? `PR #${pr.num} ${pr.url}` : `PR #${pr.num}`;
  const fmt = (ns) => ns.map((n) => `#${n.num} (${label(n)})`).join(', ');

  const committed = notes.filter((n) => n.box === 'c');
  const unmarked = notes
    .filter((n) => n.box === ' ' || n.box === '~')
    .map((n) => {
      const branch = noteBranch(n);
      return { n, branch, ahead: commitsAhead(cwd, branch, base) };
    })
    .filter((r) => r.ahead > 0);
  const noUrl = notes.filter((n) => n.box === 'x' && !hasPrRef(n));
  const open = notes.filter((n) => ' ~!p'.includes(n.box));
  const done = notes.filter((n) => n.box === 'x').length;
  const total = notes.filter((n) => n.box !== '-').length;

  const fixes = [];
  if (committed.length) {
    fixes.push(
      `- still \`[c]\`: ${fmt(committed)} — each one whose commit is in this PR becomes ` +
      `\`[x]\` with \`→ ${ref}\` on its own indented line. One that genuinely did NOT ship stays \`[c]\`; say which in your reply.`
    );
  }
  for (const r of unmarked) {
    fixes.push(
      `- #${r.n.num} (${label(r.n)}) is \`[${r.n.box}]\` but \`${r.branch}\` is ${r.ahead} commit(s) ` +
      `ahead of ${base} — that work exists and the queue doesn't say so. Flip it (\`[c]\`, or \`[x]\` + the PR ref if it rode this batch) or state why it's still open.`
    );
  }
  if (noUrl.length) {
    fixes.push(`- marked \`[x]\` with no PR URL: ${fmt(noUrl)} — add the \`→ PR #<n> <url>\` line. A shipped note with no link is what forces PR archaeology later.`);
  }
  if (!fixes.length && !open.length) return null; // queue already clean and empty
  const touched = committed.length + unmarked.length + noUrl.length + open.length;

  const lines = [
    `rapid reconcile · ${slug} → ${ref} is OPEN. The push already succeeded — do NOT run \`gh pr create\` again.`,
    '',
    `Reconcile \`${slug}.md\` before you reply (push.md step 8 — the whole queue, not just this batch):`,
  ];
  lines.push(...(fixes.length ? fixes : ['- no status fixes detected.']));
  lines.push('');
  lines.push(
    open.length
      ? `Still open after this PR: ${open.map((n) => `#${n.num} [${n.box}] ${BOXES[n.box]} — ${label(n)}`).join('; ')}. ` +
        `Relay that queue to the user in the same reply as the PR link — a PR link with no queue behind it reads as "that's everything".`
      : 'Nothing else open — say so explicitly under the PR link.'
  );
  lines.push(`Then re-read the doc from disk and close with the \`${done} of ${total} notes done\` tally (recount after your edits) + the status verdict.`);
  return { text: lines.join('\n'), touched };
}

async function main() {
  const payload = await readPayload();
  const cmd = toolCommand(payload);
  if (!/\bgh\s+pr\s+create\b/.test(cmd) && !/\bgit\s+push\b/.test(cmd)) return;
  const cwd = resolveCwd(cmd, toolCwd(payload));

  const sess = sessionForCwd(cwd);
  if (!sess) return; // not inside a rapid session worktree
  const docPath = join(sessionsDir(), `${sess.slug}.md`);
  if (!existsSync(docPath)) return;
  const body = readFileSync(docPath, 'utf8');

  let pr = null;
  if (/\bgh\s+pr\s+create\b/.test(cmd)) {
    const blob = typeof payload.tool_response === 'string'
      ? payload.tool_response
      : JSON.stringify(payload.tool_response || '');
    const url = (blob.match(/https:\/\/github\.com\/[^\s"']+\/pull\/(\d+)/) || [])[0];
    if (!url) return; // no PR opened (auth error, dry run…)
    pr = { num: url.match(/\/pull\/(\d+)/)[1], url };
  } else {
    pr = targetPr(cmd, cwd, body);
  }
  if (!pr) return;

  const notes = parseNotes(body);
  if (!notes.length) return; // nothing to reconcile against
  const report = buildReport(sess.slug, pr, notes, cwd);
  if (!report) return;

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: report.text },
    systemMessage: `rapid: PR #${pr.num} open — ${report.touched} note(s) in ${sess.slug} still need a status decision in the doc.`,
  }));
}

main().catch(() => {}).finally(() => process.exit(0));
