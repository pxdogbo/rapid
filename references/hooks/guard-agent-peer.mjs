#!/usr/bin/env node
// rapid · guard-agent-peer — PreToolUse(Task) hook. Blocks spawning a subagent
// whose prompt targets another LIVE rapid session (a peer).
//
// WHY: the skill's rule — "peers are NOT subagents." A rapid peer is a live
// agent in another chat (its own session, worktree, usually a cheaper model).
// When the user says "ask quantum-kart for a plan" / "send it to your peer",
// the request must route through collab (`collab_send`) or handoff — but
// "plan"/"task" phrasing pattern-matches the harness's Agent tool, and an agent
// under pressure spawns a background Plan subagent instead (observed live: the
// subagent ran on the lead's expensive model, invisible to the peer, while the
// user waited). This hook makes the routing rule deterministic: an Agent-tool
// prompt that names a live peer's slug or worktree is blocked with the fix.
//
// HOW IT MATCHES: only fires inside a rapid worktree (like every rapid hook).
// It collects the OTHER live sessions' slugs + worktree paths, then checks the
// subagent prompt/description. Branch-name tokens (`rapid/<slug>…`) are
// stripped first so "review branch rapid/hyper-moped-r2" (legit QC of shipped
// work) doesn't false-positive — a bare slug or a worktree path is the signal
// that the SUBAGENT is being pointed at a peer's territory.
//
// GENERIC ROLE WORDS: "delegate this to the rider" names no slug, so the
// slug/worktree match misses it — observed live in fresh collabs (the driver
// spawned a subagent as its "rider"). When a live collab is ACTUALLY running
// (this session AND at least one peer are registered in
// ~/.rapid/collab-panes.json with their panes still alive in tmux), the words
// rider/worker/peer/other-agent in a subagent prompt can only mean a live
// peer, so they block too — with the real peer slugs named in the fix.
// Technical uses (web/service worker, worker thread, peer dependency/review)
// are scrubbed first, and outside a running live collab the role words are
// ignored entirely, so ordinary subagent use never trips it.
//
// SAFETY: read-only; fails OPEN on any error. Blocking feeds the reason back to
// the agent (exit 2), which is the point — it converts the mistake into the
// correct collab_send in the same turn.

import { readPayload, toolCwd, sessionForCwd, sessionsDir, rapidHome, expand, block } from './_shared.mjs';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';

// Peer slugs of a LIVE collab this session is in right now: both this session
// and the peer are in the pane registry, and the peer's pane still exists in
// tmux. Empty array = not in a running live collab (role words stay inert).
function liveCollabPeers(ownSlug) {
  try {
    const reg = JSON.parse(readFileSync(join(rapidHome(), 'collab-panes.json'), 'utf8'));
    if (!reg[ownSlug]?.pane) return [];
    const others = Object.entries(reg).filter(([s]) => s !== ownSlug);
    if (!others.length) return [];
    let panes;
    try {
      panes = new Set(
        execFileSync('tmux', ['list-panes', '-a', '-F', '#{pane_id}'], {
          stdio: ['ignore', 'pipe', 'ignore'],
        }).toString().trim().split('\n')
      );
    } catch {
      return []; // no tmux → nothing live right now
    }
    if (!panes.has(reg[ownSlug].pane)) return [];
    return others.filter(([, i]) => i?.pane && panes.has(i.pane)).map(([s]) => s);
  } catch {
    return [];
  }
}

function livePeers(ownSlug) {
  const dir = sessionsDir();
  if (!existsSync(dir)) return [];
  const peers = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.md')) continue;
    const slug = file.replace(/\.md$/, '');
    if (slug === ownSlug) continue;
    let body;
    try { body = readFileSync(join(dir, file), 'utf8'); } catch { continue; }
    const m = body.match(/^\*\*Worktree:\*\*\s*(.+?)\s*$/m);
    const raw = m ? m[1].trim() : '';
    peers.push({ slug, wt: raw && raw !== 'n/a' ? expand(raw) : '', wtRaw: raw });
  }
  return peers;
}

async function main() {
  const payload = await readPayload();
  const input = payload?.tool_input || {};
  const text = [input.prompt, input.description].filter(Boolean).join(' ');
  if (!text) return;

  const sess = sessionForCwd(toolCwd(payload));
  if (!sess) return; // not a rapid chat — allow

  // Branch names contain slugs ("rapid/<slug>-batch-1"); strip them so QC-ing a
  // peer's SHIPPED branch stays allowed. Also normalize ~ so path forms match.
  const home = homedir();
  const scrubbed = text.replace(/rapid\/[a-z0-9][a-z0-9-]*/gi, ' ').replaceAll('~/', home + '/');

  for (const p of livePeers(sess.slug)) {
    const pathHit = p.wt && (scrubbed.includes(p.wt) || (p.wtRaw && text.includes(p.wtRaw)));
    const slugHit = new RegExp(`(?<![a-z0-9-])${p.slug}(?![a-z0-9-])`, 'i').test(scrubbed);
    if (pathHit || slugHit) {
      block(
        `rapid guard: "${p.slug}" is a LIVE peer agent (session rapid/${p.slug}), not a subagent.\n` +
        `Don't spawn a background agent for work aimed at a peer — message the peer and let IT do the work:\n` +
        `  live mode:  collab_send("${p.slug}", "<the request>")\n` +
        `  otherwise:  /rapid collab ${p.slug} <message>   (or /rapid handoff for a whole task)\n` +
        `A plan request is a rapid-plan: send [plan-request] via collab_send; the peer authors and returns [plan].`
      );
    }
  }

  // Generic role words ("the rider", "your worker", "the other agent") name no
  // slug, but inside a RUNNING live collab they can only mean a peer agent.
  const roleScrubbed = scrubbed
    .replace(/\b(?:web|service|shared|cloudflare|node)[\s-]?workers?\b/gi, ' ')
    .replace(/\bworkers?[\s-]?(?:threads?|pools?)\b/gi, ' ')
    .replace(/\bpeer[\s-]?(?:review\w*|dependenc\w*|to[\s-]?peer)\b/gi, ' ');
  const ROLE = /\b(riders?|workers?|peers?|other (?:live |collab )?agents?|collab agents?)\b/i;
  const roleHit = roleScrubbed.match(ROLE);
  if (roleHit) {
    const live = liveCollabPeers(sess.slug);
    if (live.length) {
      const peers = live.map((s) => 'rapid/' + s).join(', ');
      block(
        `rapid guard: this chat is in a LIVE COLLAB right now — "${roleHit[0]}" means one of your live peer agents (${peers}), not a subagent.\n` +
        `Delegated work goes to the peer, which does it in its own chat:\n` +
        `  collab_send("${live[0]}", "<the request>")\n` +
        `Your roster (who's driver, who owns what) is the **Room** line in the lead's session doc.\n` +
        `If this subagent is genuinely unrelated to the collab (e.g. a web/service-worker feature), re-run with the role word removed from the prompt.`
      );
    }
  }
}

main().catch(() => process.exit(0)); // fail OPEN
