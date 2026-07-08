#!/usr/bin/env node
// rapid · guard-git-add — PreToolUse(Bash) hook. Blocks `git add -A` / `git add
// --all` / `git add .` inside a rapid worktree.
//
// WHY: a rapid worktree usually has node_modules SYMLINKED from the main
// checkout. Many repos ignore `node_modules/` with a trailing slash, which
// ignores directories but NOT a symlink of that name — so a blanket
// `git add -A` stages (and then commits) the symlink. The skill's rule is
// "never `git add -A` in such a worktree; stage explicit paths." This makes it
// deterministic instead of a rule the agent has to remember.
//
// SCOPE: only blocks the blanket forms, and only when cwd is inside a
// registered rapid worktree. `git add <explicit/path>` always passes. Fails
// OPEN on any error — a guard must never brick the shell.

import { readPayload, toolCommand, toolCwd, sessionForCwd, block } from './_shared.mjs';

function isBlanketGitAdd(cmd) {
  // Split on shell separators so `foo && git add -A` is caught too.
  for (const seg of cmd.split(/(?:&&|\|\||;|\|)/)) {
    const m = seg.match(/\bgit\s+add\b([^\n]*)/);
    if (!m) continue;
    const args = m[1].trim().split(/\s+/).filter(Boolean);
    for (const a of args) {
      if (a === '-A' || a === '--all' || a === '-a') return true;
      if (a === '.' || a === './') return true;             // `git add .`
      if (/^-[A-Za-z]*A[A-Za-z]*$/.test(a)) return true;     // bundled flags incl. A, e.g. -Av
    }
  }
  return false;
}

async function main() {
  const payload = await readPayload();
  const cmd = toolCommand(payload);
  if (!/\bgit\s+add\b/.test(cmd)) return;      // not a git add — allow
  if (!isBlanketGitAdd(cmd)) return;           // explicit paths — allow
  const sess = sessionForCwd(toolCwd(payload));
  if (!sess) return;                            // not a rapid worktree — allow
  block(
    `rapid guard: refusing "git add -A/./--all" inside rapid worktree ${sess.slug}.\n` +
    `node_modules is symlinked here; a blanket add commits the symlink (repos ignore\n` +
    `node_modules/ as a dir, not as a symlink). Stage explicit paths instead, e.g.\n` +
    `  git add <file> <file2>    (or a specific dir like src/).`
  );
}

main().catch(() => process.exit(0)); // fail OPEN: never block on a hook bug
