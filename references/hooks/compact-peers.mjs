#!/usr/bin/env node
// rapid · compact-peers — PostToolUse(Bash) hook. After a `gh pr create` that
// opened a PR from a live-collab pane, sends `/compact` into every OTHER pane
// of that repo's collab — the "push → compact the peers → hand back the PR
// link" sweep, made deterministic instead of lead-remembered.
//
// WHY: a push is the natural checkpoint of a collab round — the workers' lanes
// just shipped, so their contexts are full of chatter they no longer need
// (everything durable lives in the session docs). The skill tells the LEAD to
// run this sweep on every push; this hook makes it automatic: same trigger as
// mark-pushed (a real PR URL in the gh output), plus the requirement that the
// pushing session is registered in the live-collab pane registry.
//
// WHAT IT DOES: for each other registered pane whose session lives in the SAME
// repo: skip it if its agent is mid-turn (busy indicator in the pane tail —
// compacting can wait; the lead's sentinel will catch it idle), otherwise type
// `/compact` + Enter into the pane and verify the line actually submitted
// (send-keys can lose Enter mid-render). Prints one summary line so the lead
// can report what was compacted and retry any busy skips later.
//
// SAFETY: never touches the pushing pane itself; only panes registered in
// ~/.rapid/collab-panes.json on this host, same repo; wrapped so it can NEVER
// throw or block the push. Always exits 0.

import { readPayload, toolCommand, toolCwd, resolveCwd, sessionForCwd, sessionsDir, rapidHome, expand } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hostname } from 'node:os';
import { execFileSync } from 'node:child_process';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function tmux(args) {
  return execFileSync('tmux', args, { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
}
function paneTail(pane, n = 8) {
  try {
    return tmux(['capture-pane', '-p', '-t', pane]).split('\n').filter((l) => l.trim()).slice(-n);
  } catch {
    return null; // pane gone
  }
}
function paneBusy(lines) {
  return lines.some((l) => /esc to interrupt/i.test(l));
}
function repoOf(slug) {
  try {
    const body = readFileSync(join(sessionsDir(), slug + '.md'), 'utf8');
    const m = body.match(/^\*\*Repo:\*\*\s*(.+?)\s*$/m);
    return m ? expand(m[1].trim()) : '';
  } catch {
    return '';
  }
}

async function compactPane(pane) {
  tmux(['send-keys', '-t', pane, '-l', '/compact']);
  await sleep(300);
  tmux(['send-keys', '-t', pane, 'Enter']);
  await sleep(500);
  // Verify it submitted: if /compact is still sitting in the composer, hit
  // Enter once more (a TUI mid-render can eat the first one).
  const tail = paneTail(pane, 4);
  if (tail && tail.some((l) => /❯.*\/compact|^\s*\/compact\s*$/.test(l))) {
    tmux(['send-keys', '-t', pane, 'Enter']);
  }
}

async function main() {
  const payload = await readPayload();
  if (!/\bgh\s+pr\s+create\b/.test(toolCommand(payload))) return;
  const blob = typeof payload.tool_response === 'string'
    ? payload.tool_response
    : JSON.stringify(payload.tool_response || '');
  if (!/https:\/\/github\.com\/[^\s"']+\/pull\/\d+/.test(blob)) return; // no PR opened

  const sess = sessionForCwd(resolveCwd(toolCommand(payload), toolCwd(payload)));
  if (!sess) return; // not a rapid worktree

  let panes;
  try {
    panes = JSON.parse(readFileSync(join(rapidHome(), 'collab-panes.json'), 'utf8'));
  } catch {
    return; // no live collab registry
  }
  if (!panes[sess.slug]) return; // pusher isn't in a live collab — nothing to sweep

  const myRepo = repoOf(sess.slug);
  const host = hostname();
  const done = [], skipped = [], gone = [];
  for (const [slug, info] of Object.entries(panes)) {
    if (slug === sess.slug) continue;
    if (info.host && info.host !== host) continue;      // other machine
    if (myRepo && repoOf(slug) !== myRepo) continue;     // other repo's collab
    const tail = paneTail(info.pane);
    if (tail === null) { gone.push(slug); continue; }
    if (paneBusy(tail)) { skipped.push(slug); continue; }
    try { await compactPane(info.pane); done.push(slug); } catch { gone.push(slug); }
  }

  const bits = [];
  if (done.length) bits.push(`compacted: ${done.join(', ')}`);
  if (skipped.length) bits.push(`skipped (mid-turn — compact when idle): ${skipped.join(', ')}`);
  if (gone.length) bits.push(`pane gone: ${gone.join(', ')}`);
  if (bits.length) process.stdout.write(`rapid: post-push compact sweep — ${bits.join('; ')}.\n`);
}

main().catch(() => {}).finally(() => process.exit(0));
