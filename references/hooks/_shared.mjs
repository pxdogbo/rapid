// rapid · hooks/_shared — tiny helpers shared by the rapid hook scripts.
// Node built-ins only. Everything here is read-only and fail-quiet: a hook must
// never crash the tool it guards, so callers wrap use in try/catch and fail OPEN.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';

export function rapidHome() {
  return process.env.RAPID_HOME || join(homedir(), '.rapid');
}
export function expand(p) {
  if (!p) return p;
  return p.startsWith('~') ? join(homedir(), p.slice(1)) : p;
}
function readConfig() {
  try {
    return JSON.parse(readFileSync(join(rapidHome(), 'config.json'), 'utf8'));
  } catch {
    return {};
  }
}
export function sessionsDir() {
  const p = readConfig()?.sessionsRoot;
  return p ? expand(p) : join(rapidHome(), 'sessions');
}

// Is `dir` inside (or equal to) a registered rapid session worktree?
// Returns { slug, wt } for the longest-matching **Worktree:** header, else null.
export function sessionForCwd(cwd) {
  const dir = sessionsDir();
  if (!cwd || !existsSync(dir)) return null;
  let best = null;
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.md')) continue;
    let body;
    try { body = readFileSync(join(dir, file), 'utf8'); } catch { continue; }
    const m = body.match(/^\*\*Worktree:\*\*\s*(.+?)\s*$/m);
    if (!m) continue;
    const wt = expand(m[1].trim());
    if (wt === 'n/a') continue;
    if (cwd === wt || cwd.startsWith(wt + '/')) {
      if (!best || wt.length > best.wt.length) best = { slug: file.replace(/\.md$/, ''), wt };
    }
  }
  return best;
}

// Read the PreToolUse/PostToolUse hook payload from stdin (JSON), best-effort.
export async function readPayload() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  try { return JSON.parse(raw); } catch { return {}; }
}

export function toolCommand(payload) {
  return payload?.tool_input?.command || '';
}
export function toolCwd(payload) {
  return payload?.cwd || payload?.tool_input?.cwd || process.cwd();
}

// A command can `cd <dir> && …` before the command a hook actually cares
// about — the harness's reported cwd is the shell's cwd BEFORE this command
// ran, so a leading `cd` changes the EFFECTIVE cwd for everything after it in
// the same command. Walk `&&`/`;`-separated segments applying each `cd` in
// order (relative targets resolve against the running cwd, `~` expands) so a
// hook checks the right directory instead of a stale one.
export function resolveCwd(cmd, baseCwd) {
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

export function git(cwd, args) {
  return execFileSync('git', ['-C', cwd, ...args], {
    stdio: ['ignore', 'pipe', 'ignore'],
  }).toString().trim();
}

// PreToolUse: block the tool and feed `reason` back to the agent (exit 2).
export function block(reason) {
  process.stderr.write(reason + '\n');
  process.exit(2);
}
