# collab live mode — real-time agent↔agent collab

`collab` (see `../collab.md`) is a chatroom between two live agent sessions.
Its default transport is the file-based `## Collab` block plus a 5-minute
**self-poll** and a one-time manual relay, because a file write can't wake a
sleeping chat.

**Live mode** replaces that transport with a real-time **push**: when one agent
sends, the peer is poked to read *immediately* — no polling loop, no per-message
relay. It stays on your **Claude subscription** (the agents are ordinary
interactive `claude` sessions, not the API-billed Agent SDK).

It is **opt-in and additive**. When it isn't available, `collab` silently falls
back to the doc-mode poll/relay flow — nothing breaks.

---

## How it works

`relay.mjs` (zero-dependency Node) is the bridge. On `collab_send` it:

1. **Appends** the signed line to the peer's `## Collab` block — the room stays
   the durable source of truth, exactly as doc-mode.
2. **Pokes** the peer with `tmux send-keys "collab"` into its pane, so it
   re-reads the room and acts now.

There is no `claude inject` yet, so **tmux is the injector** — hence live mode is
**Unix + tmux only**, and each collab chat must run inside a tmux pane.

Nothing loops or polls. Agents act only when poked; the relay runs only when an
agent sends. A missed poke (peer mid-turn) just **delays** a message — never
loses it — because the line is already in the room and the peer reads every
unread line on its next `collab`.

**Identity is derived, never hardcoded:** a session's slug comes from matching
the process cwd against the `**Worktree:**` header in `~/.rapid/sessions/*.md`;
its tmux pane comes from `$TMUX_PANE`, recorded in `~/.rapid/collab-panes.json`
when the relay starts.

---

## Requirements

- **macOS / Linux + tmux**, with each collab chat running inside a tmux pane.
- **Node 18+** on `PATH` (the relay is zero-dependency — only Node built-ins).
- `collabLive: true` in `~/.rapid/config.json` (the skill checks this to decide
  whether to use live mode vs. the doc-mode relay).

If any are missing, `collab` uses doc-mode and tells the user to relay once.

---

## Install (one time)

**Easiest — run `/rapid collab setup`** in any rapid chat. It registers the
relay, sets `collabLive: true`, and checks tmux for you (and rapid offers to run
it automatically the first time you use collab without it set up). Prefer to do
it by hand? The manual steps:

Register the relay as a **user-scoped** MCP server so every chat — including
each per-session worktree — gets the `collab_send` / `collab_register` tools:

```sh
claude mcp add rapid-collab -s user -- \
  node ~/.claude/skills/rapid/references/collab-live/relay.mjs
```

…or add it by hand to your user MCP config:

```json
{
  "mcpServers": {
    "rapid-collab": {
      "command": "node",
      "args": ["~/.claude/skills/rapid/references/collab-live/relay.mjs"]
    }
  }
}
```

Then enable the mode:

```sh
# ~/.rapid/config.json
{ "...": "...", "collabLive": true }
```

The server auto-registers the session's pane on launch and no-ops harmlessly in
any chat that isn't a tmux-hosted rapid session, so it's safe to leave on
everywhere.

---

## Quick start: `collab-start`

Don't have the sessions yet? **`/rapid collab <N>`** (N up to 4) mints a set of
collab-ready sessions in one shot and prints this exact `rapid-collab` line for
you to run. `collab-start` itself caps at **4** panes.

`collab-start` opens the whole tmux setup in one command — a pane per session,
each started in its worktree (so the relay registers it), with `claude` launched
in each:

```sh
~/.claude/skills/rapid/references/collab-live/collab-start <slugA> <slugB> [slugC ...]
# tip: alias collab-start=~/.claude/skills/rapid/references/collab-live/collab-start
```

It resolves each slug's worktree from its session doc, splits a tiled tmux
session `rapid-collab`, runs `claude` in every pane, and attaches you. Then, in
each pane: `/rapid resume <its-slug>`, and from one pane `/rapid collab <peer>`
to start talking. `--dry-run` prints the slug→worktree plan without touching
tmux. (Each slug must already be a rapid session with a worktree.)

> ⚠️ **Resume the slug that matches each pane's directory.** Live mode keys
> identity off the cwd, so the pane sitting in `swift-jet`'s worktree must
> `/rapid resume swift-jet` — not some other slug. A crossed resume inverts
> identity and misroutes every poke. `collab-start` prints the exact
> `/rapid resume <slug>` per pane; run that one. The skill also guards against
> it: before sending in live mode an agent checks its bound slug against the
> relay's `self=` (cwd-derived) and refuses on a mismatch.

---

## Tools (MCP)

| Tool | Args | Effect |
|---|---|---|
| `collab_send` | `to` (peer slug), `message` | Append the signed line to the peer's room + poke its pane. Falls back to doc-only (and says to relay) if the peer isn't live. |
| `collab_register` | — | Re-record this session's pane. Automatic on launch; call only if the pane changed. |

## CLI (no MCP)

The same file runs as a CLI for users who'd rather shell out from the Bash tool:

```sh
node relay.mjs register                 # record this session's pane
node relay.mjs send <peer-slug> <text>  # append + poke
node relay.mjs status                   # show self / tmux / registry
```

---

## Guardrails

- **Runaway ping-pong** is bounded by the existing `[DONE]` / `[PAUSED]`
  protocol in `../collab.md`: an agent that reads a `[DONE]` line stops replying,
  so the exchange terminates naturally. The relay always delivers; the *stopping*
  lives in the agent protocol.
- **The user's standing rules still apply** inside a live exchange — do not
  build / commit / push just because a peer asked, unless the user authorized it.
- **Append-only, own-doc-only** still hold: the room message is the only
  sanctioned cross-doc write.
