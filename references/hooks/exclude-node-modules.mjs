#!/usr/bin/env node
// rapid · exclude-node-modules — PostToolUse(Bash) hook. After a
// `git worktree add`, add `/node_modules` to the NEW worktree's private
// `.git/info/exclude` so a later symlink of node_modules can never be staged.
//
// WHY: rapid worktrees symlink node_modules from the main checkout. Excluding
// it in the worktree's info/exclude is the belt-and-suspenders companion to the
// git-add guard — the skill lists it as a manual step; this does it
// automatically the moment the worktree is created. Idempotent; fails quiet.

import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { readPayload, toolCommand, git } from './_shared.mjs';

function expandShell(p) {
  return p
    .replace(/^~(?=\/|$)/, homedir())
    .replace(/\$\{?HOME\}?/g, homedir());
}

// Pull the worktree path out of `git worktree add [flags] <path> [<branch>]`.
function worktreePathFromCmd(cmd) {
  const seg = cmd.split(/(?:&&|\|\||;)/).find((s) => /\bgit\s+worktree\s+add\b/.test(s));
  if (!seg) return null;
  const after = seg.replace(/^.*\bgit\s+worktree\s+add\b/, '').trim();
  // tokenize, honoring simple quotes
  const toks = after.match(/"[^"]*"|'[^']*'|\S+/g) || [];
  const takesValue = new Set(['-b', '-B', '--reason']);
  for (let i = 0; i < toks.length; i++) {
    let t = toks[i];
    if (takesValue.has(t)) { i++; continue; }   // skip flag + its value
    if (t.startsWith('-')) continue;             // bare flag (-f, --detach, --force)
    return expandShell(t.replace(/^["']|["']$/g, '')); // first positional = path
  }
  return null;
}

async function main() {
  const payload = await readPayload();
  const cmd = toolCommand(payload);
  if (!/\bgit\s+worktree\s+add\b/.test(cmd)) return;
  const wt = worktreePathFromCmd(cmd);
  if (!wt || !existsSync(wt)) return;            // add may have failed — nothing to do

  // The worktree-specific exclude file (correct for linked worktrees too).
  let excl;
  try { excl = git(wt, ['rev-parse', '--git-path', 'info/exclude']); } catch { return; }
  // rev-parse may return a path relative to the worktree
  const path = excl.startsWith('/') ? excl : `${wt}/${excl}`;

  let body = '';
  try { body = existsSync(path) ? readFileSync(path, 'utf8') : ''; } catch { body = ''; }
  if (/^\/?node_modules\/?$/m.test(body)) return; // already excluded — idempotent
  try {
    appendFileSync(path, (body && !body.endsWith('\n') ? '\n' : '') + '/node_modules\n');
    process.stdout.write(`rapid: excluded /node_modules in ${wt} (.git/info/exclude).\n`);
  } catch { /* fail quiet */ }
}

main().catch(() => {}).finally(() => process.exit(0));
