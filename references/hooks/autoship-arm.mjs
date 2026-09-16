#!/usr/bin/env node
// rapid · autoship-arm — Stop hook. Refuses to let a turn end with shippable
// rapid work and no shipment pending.
//
// WHY: the user does not type a ship word. They ask for something, the agent
// does it, and it is supposed to reach `main` on its own (references/
// autoship.md). The failure that costs them twenty minutes every time is the
// quiet one: the agent finishes a note, commits it, ends the turn — and the
// chat sits there. The user reads "done", walks away believing the work is
// live, and comes back to a prompt that was waiting on a word. This hook makes
// that ending impossible: if the doc says work is committed-but-unshipped and
// nothing is armed, held or off, it blocks the stop and tells the agent to arm
// the window (or land it now).
//
// WHAT IT DOES: on Stop, finds the session doc for this cwd (worktree match
// first, then the repo root the doc names), reads its `**Autoship:**` header
// and its `## Notes` queue, and blocks only when ALL of:
//   · autoship is on for that session (header is not `held` / `off`, config
//     `autoship` is not false)
//   · at least one note is `[c]` (committed locally, no PR)
//   · no window is armed — or one is armed but went stale (its window elapsed
//     well past due and the notes are still `[c]`, i.e. the timer never came
//     back)
// Everything else — every non-rapid cwd, every clean queue, every held or
// disabled session, every already-armed window — ends the turn untouched.
//
// SAFETY: read-only. Never blocks twice (honours `stop_hook_active`), so it can
// never loop. Fails OPEN on any error — no config, no doc, unparseable header.
// Always exits 0 unless it is deliberately blocking (exit 2).
//
// INSTALL: Stop hook in ~/.claude/settings.json pointing at this file
// (see references/setup.md → the hooks table).

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { readPayload, sessionForCwd, sessionsDir, expand, rapidHome, git } from './_shared.mjs';

function configAutoship() {
  try {
    const c = JSON.parse(readFileSync(join(rapidHome(), 'config.json'), 'utf8'));
    return c.autoship !== false;
  } catch {
    return true; // default on
  }
}

// The doc for this cwd: a registered worktree wins; otherwise the most recently
// touched session doc whose **Repo:** is this repo's root.
function docFor(cwd) {
  const byWt = sessionForCwd(cwd);
  const dir = sessionsDir();
  if (byWt) return join(dir, `${byWt.slug}.md`);
  let root;
  try { root = git(cwd, ['rev-parse', '--show-toplevel']); } catch { return null; }
  if (!root || !existsSync(dir)) return null;
  let best = null;
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.md')) continue;
    const path = join(dir, file);
    let body;
    try { body = readFileSync(path, 'utf8'); } catch { continue; }
    const m = body.match(/^\*\*Repo:\*\*\s*(.+?)\s*$/m);
    if (!m || expand(m[1].trim()) !== root) continue;
    const mtime = statSync(path).mtimeMs;
    if (!best || mtime > best.mtime) best = { path, mtime };
  }
  return best?.path || null;
}

function windowMs(spec) {
  const m = /^(\d+)\s*(s|m|h)$/.exec((spec || '').trim());
  if (!m) return 2 * 60_000;
  const n = Number(m[1]);
  return m[2] === 's' ? n * 1000 : m[2] === 'h' ? n * 3_600_000 : n * 60_000;
}

async function main() {
  const payload = await readPayload();
  if (payload?.stop_hook_active) return;          // already blocked once — never loop
  if (!configAutoship()) return;

  const cwd = payload?.cwd || process.cwd();
  const path = docFor(cwd);
  if (!path) return;
  let body;
  try { body = readFileSync(path, 'utf8'); } catch { return; }
  const slug = path.split('/').pop().replace(/\.md$/, '');

  const header = (body.match(/^\*\*Autoship:\*\*\s*(.+?)\s*$/m) || [])[1] || 'on';
  if (/^(held|off)\b/i.test(header)) return;      // the user said don't

  // Committed-but-unshipped notes: `- [c] …`, one per line.
  const committed = (body.match(/^\s*-\s*\[c\]/gm) || []).length;
  if (!committed) return;                          // nothing to ship

  const armed = /^armed\b/i.test(header);
  if (armed) {
    const at = Date.parse((header.match(/armed\s+(\S+)/) || [])[1] || '');
    const win = windowMs((header.match(/\(([^)]+)\)\s*$/) || [])[1]);
    // Armed and still plausibly counting down → let the turn end.
    if (!Number.isFinite(at) || Date.now() - at < win + 5 * 60_000) return;
    process.stderr.write(
      `rapid autoship: the window armed in ${slug} elapsed and ${committed} note(s) ` +
      `are still [c] — the timer never came back. Land the batch now: run the push ` +
      `flow (references/push.md steps 4-18 — reconcile, one branch, one PR, merge it, ` +
      `verify from GitHub, mark the notes (merged), bring main forward). ` +
      `If the user asked you to wait, write "**Autoship:** held" in ${path} instead.\n`,
    );
    process.exit(2);
  }

  process.stderr.write(
    `rapid autoship: ${committed} note(s) in ${slug} are committed but unshipped and no ` +
    `window is armed. Do NOT end the turn asking the user to say \`push\` — they never ` +
    `type a ship word. Either:\n` +
    `  1. arm the window — end your reply with the one-line countdown, start the timer ` +
    `(Bash "sleep <window>" with run_in_background: true), and write ` +
    `"**Autoship:** armed <ISO datetime> — notes <n>, <n> (<window>)" in ${path}; or\n` +
    `  2. land it now via the push flow (references/push.md); or\n` +
    `  3. write "**Autoship:** held" in ${path} if the user asked you to hold.\n` +
    `See references/autoship.md.\n`,
  );
  process.exit(2);
}

main().catch(() => {}).finally(() => process.exit(0));
