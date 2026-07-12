#!/usr/bin/env node
// rapid · guard-sealed-pr — PreToolUse(Bash) hook. Blocks a `git push` to a
// rapid/* branch whose PR is already MERGED or CLOSED (a "sealed" branch).
//
// WHY: the skill's rule — "verify the PR is still OPEN before any git write." A
// PR is sealed the moment it merges; commits pushed to its branch afterward
// land in NO PR and never reach main, silently orphaning the work. This checks
// PR state before the push and stops it, telling the agent to cut a fresh
// branch off origin/main instead.
//
// COST: one `gh pr view` per push of a rapid/* branch — from ANY checkout, not
// just rapid worktrees (a sealed rapid/* branch is just as sealed when pushed
// from the main repo clone; that exact miss orphaned a commit once). Fails
// OPEN on any error (no gh, no network, no PR) — never blocks on uncertainty.

import { readPayload, toolCommand, toolCwd, git, block } from './_shared.mjs';
import { execFileSync } from 'node:child_process';

// Which branch is this push targeting? An explicit `git push <remote> <branch>`
// wins; otherwise the current branch.
function pushedBranch(cmd, cwd) {
  const seg = cmd.split(/(?:&&|\|\||;)/).find((s) => /\bgit\s+push\b/.test(s)) || '';
  const after = seg.replace(/^.*\bgit\s+push\b/, '').trim();
  const toks = (after.match(/\S+/g) || []).filter((t) => !t.startsWith('-'));
  // tokens after `push` are typically: <remote> <branch> (or <remote> <src:dst>)
  if (toks.length >= 2) {
    const ref = toks[1].split(':').pop();       // handle src:dst
    if (ref && ref !== 'HEAD') return ref;
  }
  try { return git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']); } catch { return ''; }
}

async function main() {
  const payload = await readPayload();
  const cmd = toolCommand(payload);
  if (!/\bgit\s+push\b/.test(cmd)) return;       // not a push — allow
  const cwd = toolCwd(payload);
  const branch = pushedBranch(cmd, cwd);
  if (!branch || !branch.startsWith('rapid/')) return; // only guard rapid/* branches

  let state = '';
  try {
    state = execFileSync('gh', ['pr', 'view', branch, '--json', 'state', '--jq', '.state'], {
      cwd, stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim();
  } catch {
    return; // no PR for this branch, or gh/network unavailable — allow (fail open)
  }
  if (state === 'MERGED' || state === 'CLOSED') {
    block(
      `rapid guard: PR for "${branch}" is ${state} — that branch is sealed.\n` +
      `Commits pushed to a merged/closed PR's branch land in no PR and never reach main.\n` +
      `Cut a fresh branch off origin/main for this work:\n` +
      `  git fetch origin main && git checkout -b rapid/<slug>-<note> origin/main`
    );
  }
}

main().catch(() => process.exit(0)); // fail OPEN
