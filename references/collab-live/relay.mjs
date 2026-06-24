#!/usr/bin/env node
// rapid · collab live relay
// ----------------------------------------------------------------------------
// Zero-dependency bridge that turns the file-based `## Collab` chatroom into a
// real-time, push channel between two live agent sessions — WITHOUT any polling
// loop and WITHOUT API billing (the agents stay ordinary interactive `claude`
// sessions on your subscription).
//
// It runs in two modes from the same file:
//   • MCP server (default, no args): a stdio MCP server exposing `collab_send`
//     and `collab_register`, registered per-session via `.mcp.json`.
//   • CLI (`send` / `register` / `status`): the same actions for users who'd
//     rather shell out from the Bash tool than wire up MCP.
//
// Delivery = append + poke:
//   1. append the signed line to the PEER's `## Collab` (durable; the room is
//      still the source of truth, exactly as doc-mode collab),
//   2. `tmux send-keys "collab"` into the peer's pane so it re-reads the room
//      and acts immediately. (There is no `claude inject` yet, so tmux is the
//      injector — hence live mode is Unix + tmux only.)
//
// Nothing here loops or polls. The agents only act when poked; the relay only
// runs when an agent sends. A missed poke (peer mid-turn) merely DELAYS a
// message — never loses it — because the line is already durably in the room
// and the peer reads every unread line on its next `collab`.
//
// Identity is derived, never hardcoded: a session's slug comes from matching
// the process cwd against the `**Worktree:**` header in ~/.rapid/sessions/*.md,
// and its tmux pane from $TMUX_PANE (recorded into ~/.rapid/collab-panes.json).
// ----------------------------------------------------------------------------

import { homedir, hostname } from 'node:os';
import { join } from 'node:path';
import {
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline';

const VERSION = '0.1.0';

// ── Paths (honor config.json path overrides, else ~/.rapid defaults) ────────
function rapidHome() {
  return process.env.RAPID_HOME || join(homedir(), '.rapid');
}
function readConfig() {
  const f = join(rapidHome(), 'config.json');
  if (!existsSync(f)) return {};
  try {
    return JSON.parse(readFileSync(f, 'utf8'));
  } catch {
    return {};
  }
}
function sessionsDir() {
  const cfg = readConfig();
  // `sessionsRoot` is the documented config key (references/setup.md).
  const p = cfg?.sessionsRoot;
  return p ? expand(p) : join(rapidHome(), 'sessions');
}
function expand(p) {
  return p.startsWith('~') ? join(homedir(), p.slice(1)) : p;
}
function panesFile() {
  return join(rapidHome(), 'collab-panes.json');
}

// ── Pane registry ───────────────────────────────────────────────────────────
function readRegistry() {
  const f = panesFile();
  if (!existsSync(f)) return {};
  try {
    return JSON.parse(readFileSync(f, 'utf8'));
  } catch {
    return {};
  }
}
function writeRegistry(reg) {
  mkdirSync(rapidHome(), { recursive: true });
  writeFileSync(panesFile(), JSON.stringify(reg, null, 2) + '\n');
}

// ── Slug resolution: cwd → worktree → slug ──────────────────────────────────
function slugForCwd(cwd) {
  const dir = sessionsDir();
  if (!existsSync(dir)) return null;
  let best = null;
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.md')) continue;
    const body = readFileSync(join(dir, file), 'utf8');
    const m = body.match(/^\*\*Worktree:\*\*\s*(.+?)\s*$/m);
    if (!m) continue;
    const wt = expand(m[1].trim());
    if (wt === 'n/a') continue;
    // cwd is inside (or equal to) the worktree → this is our session.
    if (cwd === wt || cwd.startsWith(wt + '/')) {
      if (!best || wt.length > best.wt.length) {
        best = { slug: file.replace(/\.md$/, ''), wt };
      }
    }
  }
  return best ? best.slug : null;
}

function docPathForSlug(slug) {
  const dir = sessionsDir();
  const live = join(dir, `${slug}.md`);
  if (existsSync(live)) return live;
  const archived = join(dir, 'archive', `${slug}.md`);
  if (existsSync(archived)) return archived;
  return null;
}

// ── Append a line into a doc's `## Collab` section ──────────────────────────
function appendCollabLine(slug, line) {
  const path = docPathForSlug(slug);
  if (!path) throw new Error(`no session doc for "${slug}"`);
  let body = readFileSync(path, 'utf8');
  if (!/^## Collab\s*$/m.test(body)) {
    // Older doc with no room yet — create the section at the end.
    body = body.replace(/\s*$/, '\n') + '\n## Collab\n';
  }
  const lines = body.split('\n');
  const start = lines.findIndex((l) => /^## Collab\s*$/.test(l));
  // End of the section = next "## " heading after start, else EOF.
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^## /.test(lines[i])) {
      end = i;
      break;
    }
  }
  // Insert after the last non-blank line of the section.
  let insertAt = start + 1;
  for (let i = end - 1; i > start; i--) {
    if (lines[i].trim() !== '') {
      insertAt = i + 1;
      break;
    }
  }
  lines.splice(insertAt, 0, line);
  writeFileSync(path, lines.join('\n'));
  return path;
}

// ── tmux poke ────────────────────────────────────────────────────────────────
function tmuxPoke(pane, word = 'collab') {
  // Literal text, then a separate Enter so it submits as one prompt turn.
  // stdio:'pipe' keeps tmux's own stderr out of our stream (it surfaces in the
  // thrown error's message instead, where the caller already reports it).
  execFileSync('tmux', ['send-keys', '-t', pane, '-l', word], { stdio: 'pipe' });
  execFileSync('tmux', ['send-keys', '-t', pane, 'Enter'], { stdio: 'pipe' });
}
function inTmux() {
  return !!process.env.TMUX_PANE;
}

function hhmm(now = currentDate()) {
  return `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;
}
// Wrapped so the one unavoidable clock read is easy to find/stub.
function currentDate() {
  return new Date();
}

// ── Actions (shared by CLI + MCP) ───────────────────────────────────────────
function doRegister() {
  const slug = slugForCwd(process.cwd());
  if (!slug) {
    return {
      ok: false,
      msg: 'Not inside a rapid worktree — cannot resolve this session slug. Run from the session worktree.',
    };
  }
  if (!inTmux()) {
    return {
      ok: false,
      slug,
      msg: `Session "${slug}" is not running inside tmux (no $TMUX_PANE). Live mode needs tmux; falling back to doc-mode collab.`,
    };
  }
  const reg = readRegistry();
  reg[slug] = {
    pane: process.env.TMUX_PANE,
    host: hostname(),
    updated: hhmm(),
  };
  writeRegistry(reg);
  return { ok: true, slug, msg: `Registered "${slug}" → pane ${reg[slug].pane}.` };
}

function doSend(to, message) {
  if (!to || !message) {
    return { ok: false, msg: 'collab_send requires `to` (peer slug) and `message`.' };
  }
  const from = slugForCwd(process.cwd());
  if (!from) {
    return { ok: false, msg: 'Cannot resolve sender slug — run from the session worktree.' };
  }
  if (!docPathForSlug(to)) {
    return { ok: false, msg: `No session "${to}" found to deliver to.` };
  }
  const line = `- [${hhmm()}] rapid/${from} → rapid/${to}: ${message}`;
  appendCollabLine(to, line);

  // Poke the peer if it's registered live and we can reach its pane.
  const reg = readRegistry();
  const peer = reg[to];
  if (!peer || !peer.pane) {
    return {
      ok: true,
      delivered: 'doc-only',
      msg: `Posted to rapid/${to}'s room, but it isn't registered for live mode — ask the user to say \`collab\` in that chat once (doc-mode fallback).`,
    };
  }
  if (peer.host && peer.host !== hostname()) {
    return {
      ok: true,
      delivered: 'doc-only',
      msg: `Posted to rapid/${to}'s room, but its pane is on a different host (${peer.host}); can't poke across machines — ask the user to relay once.`,
    };
  }
  try {
    tmuxPoke(peer.pane);
  } catch (e) {
    return {
      ok: true,
      delivered: 'doc-only',
      msg: `Posted to rapid/${to}'s room, but poking pane ${peer.pane} failed (${e.message}). The peer will see it on its next \`collab\`.`,
    };
  }
  return { ok: true, delivered: 'live', msg: `Delivered to rapid/${to} (poked pane ${peer.pane}).` };
}

function doStatus() {
  const reg = readRegistry();
  const me = slugForCwd(process.cwd());
  return {
    ok: true,
    me,
    inTmux: inTmux(),
    registered: reg,
    msg: `self=${me || '(unknown)'} tmux=${inTmux()} registered=[${Object.keys(reg).join(', ')}]`,
  };
}

// ── CLI mode ─────────────────────────────────────────────────────────────────
function runCli(argv) {
  const [cmd, ...rest] = argv;
  let res;
  switch (cmd) {
    case 'register':
      res = doRegister();
      break;
    case 'send':
      res = doSend(rest[0], rest.slice(1).join(' '));
      break;
    case 'status':
      res = doStatus();
      break;
    default:
      process.stderr.write(
        'usage: relay.mjs <register|send <peer> <message>|status>\n' +
          '       (no args → run as an MCP stdio server)\n'
      );
      process.exit(2);
  }
  process.stdout.write((res.msg || JSON.stringify(res)) + '\n');
  process.exit(res.ok ? 0 : 1);
}

// ── MCP stdio server mode ────────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'collab_send',
    description:
      "Send a message to a peer rapid session's collab room and poke it to read immediately (real-time). Appends a signed line to the peer's `## Collab` and injects `collab` into its tmux pane. Falls back to doc-only delivery (asks the user to relay) if the peer isn't registered for live mode.",
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Peer session slug (e.g. "sonic-jet").' },
        message: { type: 'string', description: 'The message to post into the room.' },
      },
      required: ['to', 'message'],
    },
  },
  {
    name: 'collab_register',
    description:
      "Register this session's tmux pane so peers can poke it for live collab. Normally automatic on server start; call to re-register if the pane changed.",
    inputSchema: { type: 'object', properties: {} },
  },
];

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

function runMcp() {
  // Best-effort auto-register on launch so peers can reach us with no manual step.
  try {
    doRegister();
  } catch {
    /* non-fatal */
  }
  const rl = createInterface({ input: process.stdin });
  rl.on('line', (raw) => {
    const text = raw.trim();
    if (!text) return;
    let req;
    try {
      req = JSON.parse(text);
    } catch {
      return; // ignore non-JSON noise
    }
    const { id, method, params } = req;
    const isNotification = id === undefined || id === null;

    if (method === 'initialize') {
      send({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: params?.protocolVersion || '2025-06-18',
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'rapid-collab', version: VERSION },
        },
      });
      return;
    }
    if (method === 'notifications/initialized' || method === 'initialized') {
      return; // notification, no reply
    }
    if (method === 'tools/list') {
      send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
      return;
    }
    if (method === 'tools/call') {
      const name = params?.name;
      const args = params?.arguments || {};
      let res;
      if (name === 'collab_send') res = doSend(args.to, args.message);
      else if (name === 'collab_register') res = doRegister();
      else {
        send({ jsonrpc: '2.0', id, error: { code: -32601, message: `unknown tool: ${name}` } });
        return;
      }
      send({
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: res.msg || JSON.stringify(res) }],
          isError: !res.ok,
        },
      });
      return;
    }
    if (method === 'ping') {
      send({ jsonrpc: '2.0', id, result: {} });
      return;
    }
    // Unknown method: error for requests, ignore for notifications.
    if (!isNotification) {
      send({ jsonrpc: '2.0', id, error: { code: -32601, message: `method not found: ${method}` } });
    }
  });
}

// ── Entry ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.length > 0) runCli(args);
else runMcp();
