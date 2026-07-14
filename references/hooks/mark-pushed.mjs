#!/usr/bin/env node
// rapid · mark-pushed — PostToolUse hook that stamps a session doc the moment
// its work reaches a PR, so nobody has to hand-update the doc after every push.
//
// WHY: rapid's push flow opens PRs on `rapid/<slug>-batch-<N>` branches. The
// session doc's `**Pushed:**` header + `## Pushes` log are the durable "this
// session shipped, on THIS branch, via THIS PR" record that cleanup (burn /
// tidy / reap) keys on before deleting anything. If that record is missing —
// because the agent forgot, or work shipped under a batch/-pr name the doc
// never captured — cleanup can't trace the work to its merged PR and flags the
// worktree as unshipped forever. This hook makes the stamp automatic and
// deterministic instead of a step the agent might skip.
//
// WHAT IT DOES: on any Bash tool call, if the command opened a PR
// (`gh pr create …` whose output contains a GitHub pull URL) AND the tool's cwd
// is inside a rapid session worktree, it:
//   1. flips the doc's `**Pushed:**` header to include `PR #<N> <url>`
//      (comma-appends if the session already opened PRs), and
//   2. appends a `## Pushes` entry: `- pushed <ts> → <branch> → PR #<N> (open)`.
// It NEVER flips individual notes ([c]→[x]) — which notes shipped is semantic
// and stays the agent's job (push.md step 8). It only guarantees the header +
// branch record that cleanup relies on.
//
// SAFETY: read-only unless it matches a real PR-open in a real rapid worktree;
// idempotent (skips if the PR # is already recorded); wrapped so it can NEVER
// throw or block the push — a hook that breaks `git push` would be worse than
// the problem it solves. Always exits 0.
//
// INSTALL: registered as a PostToolUse(Bash) hook in ~/.claude/settings.json
// pointing at this file (see references/setup.md → "Auto-mark pushed sessions").

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';

function rapidHome() {
  return process.env.RAPID_HOME || join(homedir(), '.rapid');
}
function expand(p) {
  return p.startsWith('~') ? join(homedir(), p.slice(1)) : p;
}
function readConfig() {
  try {
    return JSON.parse(readFileSync(join(rapidHome(), 'config.json'), 'utf8'));
  } catch {
    return {};
  }
}
function sessionsDir() {
  const p = readConfig()?.sessionsRoot;
  return p ? expand(p) : join(rapidHome(), 'sessions');
}

// cwd → session slug + doc path, via the `**Worktree:**` header (same rule the
// collab relay uses). Only live docs in sessions/ (a pushed session is live).
function sessionForCwd(cwd) {
  const dir = sessionsDir();
  if (!cwd || !existsSync(dir)) return null;
  let best = null;
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.md')) continue;
    const path = join(dir, file);
    let body;
    try { body = readFileSync(path, 'utf8'); } catch { continue; }
    const m = body.match(/^\*\*Worktree:\*\*\s*(.+?)\s*$/m);
    if (!m) continue;
    const wt = expand(m[1].trim());
    if (wt === 'n/a') continue;
    if (cwd === wt || cwd.startsWith(wt + '/')) {
      if (!best || wt.length > best.wt.length) best = { slug: file.replace(/\.md$/, ''), path, wt };
    }
  }
  return best;
}

// A command can `cd <dir> && gh pr create …` — the harness's reported cwd is
// the shell's cwd BEFORE this command ran, so a leading `cd` changes where the
// PR actually opened. Walk `&&`/`;`-separated segments applying each `cd`.
function resolveCwd(cmd, baseCwd) {
  let cwd = baseCwd;
  for (const seg of (cmd || '').split(/&&|;/)) {
    const m = seg.trim().match(/^cd\s+(.+)$/);
    if (!m) continue;
    let target = expand(m[1].trim().replace(/^["']|["']$/g, ''));
    if (!target.startsWith('/')) target = join(cwd, target);
    cwd = target;
  }
  return cwd;
}

function currentBranch(cwd) {
  try {
    return execFileSync('git', ['-C', cwd, 'rev-parse', '--abbrev-ref', 'HEAD'], {
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim();
  } catch {
    return '';
  }
}

// yyyy-mm-dd HH:MM in local time (hook runs in a real shell, so Date is fine).
function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function markDoc(path, prNum, prUrl, branch) {
  let body = readFileSync(path, 'utf8');

  // Idempotent: if this PR # is already recorded anywhere, do nothing.
  if (new RegExp(`PR #${prNum}\\b`).test(body)) return false;

  // 1) `**Pushed:**` header — replace a `no`, else comma-append the new ref.
  const ref = `PR #${prNum} ${prUrl}`;
  body = body.replace(/^\*\*Pushed:\*\*\s*(.*)$/m, (line, val) => {
    const v = val.trim();
    if (v === '' || v.toLowerCase() === 'no') return `**Pushed:** ${ref}`;
    return `**Pushed:** ${v}, ${ref}`;
  });

  // 2) `## Pushes` entry. Count existing `- ` entries under the heading to
  //    number this batch; create the section (before ## Collab, else at EOF).
  const entry = `- pushed ${stamp()} → ${branch} → PR #${prNum} (open)`;
  const pushesRe = /^## Pushes\s*$/m;
  if (pushesRe.test(body)) {
    const idx = body.search(pushesRe);
    const after = body.slice(idx);
    const nextHead = after.slice(1).search(/^## /m); // start of the next section
    const end = nextHead === -1 ? body.length : idx + 1 + nextHead;
    const block = body.slice(idx, end).replace(/\s*$/, '');
    body = body.slice(0, idx) + block + '\n' + entry + '\n\n' + body.slice(end);
  } else {
    const collabIdx = body.search(/^## Collab\s*$/m);
    const section = `## Pushes\n${entry}\n\n`;
    if (collabIdx === -1) body = body.replace(/\s*$/, '') + '\n\n' + section;
    else body = body.slice(0, collabIdx) + section + body.slice(collabIdx);
  }

  writeFileSync(path, body);
  return true;
}

async function main() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  let payload;
  try { payload = JSON.parse(raw); } catch { return; }

  const command = payload.tool_input?.command || '';
  if (!/\bgh\s+pr\s+create\b/.test(command)) return; // only PR-open events
  const cwd = resolveCwd(command, payload.cwd || payload.tool_input?.cwd || process.cwd());

  // Find the PR URL in the tool output (gh prints it on success).
  const blob = typeof payload.tool_response === 'string'
    ? payload.tool_response
    : JSON.stringify(payload.tool_response || '');
  const url = (blob.match(/https:\/\/github\.com\/[^\s"']+\/pull\/(\d+)/) || [])[0];
  if (!url) return; // no PR created (auth error, dry run, etc.)
  const prNum = url.match(/\/pull\/(\d+)/)[1];

  const sess = sessionForCwd(cwd);
  if (!sess) return; // not inside a rapid worktree — nothing to mark

  const branch = currentBranch(cwd) || 'rapid/<branch>';
  const changed = markDoc(sess.path, prNum, url, branch);
  if (changed) {
    // Surface a one-liner so the agent/user can see the doc was stamped.
    process.stdout.write(`rapid: marked ${sess.slug} pushed → PR #${prNum} (${branch}).\n`);
  }
}

main().catch(() => {}).finally(() => process.exit(0));
