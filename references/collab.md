# `collab` — a chatroom between two live agents

Read this when the user invokes `/rapid collab <slug>` or the bare word `collab`.

| Invocation | What it does |
|---|---|
| `/rapid collab <slug> [message]` | Open or continue a chatroom with the agent working session `<slug>`. Post a message into the shared room and tell the user to relay. |
| `collab` (bare word, mid-session) | Re-read your `## Collab` (and any room you joined); show new messages from the peer; flag anything awaiting your reply. |

`collab` is just a **chatroom**: two agents in two separate chats, each on its
own session, talking — to coordinate a shared file, settle a decision, or hand
something across. It's deliberately lightweight: no notes, no branches, just
messages. (To hand a whole scoped task to another chat instead of chatting, use
`handoff` — see `references/handoff.md`.)

---

## The constraint: no live channel (and how the loop works around it)

A markdown file is the only shared medium, and writing to it cannot wake a
sleeping chat. So the user relays **once per side to kick each agent off**; after
that, each chat **self-polls** the room (see "Autonomous loop" below) so the two
agents work back and forth on their own, no per-message relay. Always re-read the
room before you post or reply: never assume you've seen the latest.

---

## Live mode (optional, real-time — no poll, no relay)

When **live mode** is available, the file-write limitation goes away: a sender
**pokes** the peer to read *immediately*, so the two agents talk in real time
with no self-poll loop and no per-message relay. Everything else below is
unchanged — the `## Collab` room is still the durable source of truth, lines are
still signed/addressed/append-only, and `[DONE]`/`[PAUSED]` still end an
exchange. Live mode swaps only the *transport*. Setup + internals:
`references/collab-live/README.md`.

**Use live mode when ALL hold** (otherwise use the doc-mode flow below — it is
the default and the fallback):
- `collabLive: true` in `~/.rapid/config.json`, AND
- the `rapid-collab` MCP tools (`collab_send` / `collab_register`) are available
  (or the `relay.mjs` CLI is), AND
- both chats run inside **tmux** (Unix only).

**🔴 Identity must match the pane (the #1 live-mode footgun).** Live mode keys
identity off the **working directory**, not the slug you typed: the relay maps
each pane's cwd to a slug via the `**Worktree:**` headers, and pokes by pane. But
`/rapid resume` binds you to *any* slug — so resuming a slug whose worktree ≠
this pane's cwd silently **inverts your identity** (you think you're A; the relay
treats this pane as B). Every poke then misroutes and both agents get confused.

So **before you send, reply, or act on a poke in live mode, confirm your bound
slug matches the relay's cwd-derived slug:**
- Call `collab_register` (or run `node …/relay.mjs status`) and read `self=<slug>`.
- If `self` ≠ the slug you resumed, **STOP — do not send.** Tell the user:
  `This pane is <self> (its worktree), but I'm bound to <resumed>. In live mode
  that inverts identity and misroutes pokes — run` `/rapid resume <self>` `here
  (or move to <resumed>'s worktree), then we're aligned.` Re-check after the fix.
- The directory is ground truth, the resume is not: always make the bound slug
  equal the cwd-derived `self`. (`collab-start` opens each pane in the right
  worktree and prints the exact `/rapid resume <slug>` for it — run *that* one.)

**What changes when live mode is on:**
- **Sending** — instead of hand-editing the peer's `## Collab` and telling the
  user to relay, call **`collab_send(to, message)`**. It appends the signed line
  to the peer's room AND pokes the peer to read now. (Tool unavailable? Use the
  CLI `node …/relay.mjs send <peer> "<msg>"`.)
- **No "tell the user to relay" step** — delivery is automatic. (If `collab_send`
  reports doc-only fallback — peer not registered / different host / poke failed —
  THEN tell the user to relay once, exactly as doc-mode.)
- **No autonomous poll loop** — do **not** `ScheduleWakeup`/`/loop`. You are
  poked when a message arrives. Still check the room at natural pauses (cheap,
  and covers a poke that landed while you were mid-turn).
- **Stopping** — still post `[DONE]` / `[PAUSED]` to the room the same way; the
  peer reads the tag and stops. No idle-budget countdown is needed (there's no
  loop to wind down), but a `[PAUSED]` is still the right signal if you're
  stepping away with work unfinished.

Because the room is the durable record and you read every unread line on each
`collab`, a missed poke only *delays* a message — it is never lost. So live mode
needs no fallback poll; the next poke (or your next natural-pause check) catches
up.

---

## The `## Collab` section

Every session doc carries a `## Collab` section (blank until a collab opens). It
is an **append-only** chatroom — newest line last, never rewrite history:

```markdown
## Collab
**Room** · rapid/<slug-a> ⇄ rapid/<slug-b>      <!-- only in the host doc -->
- [16:40] rapid/sonic-jet → rapid/nitro-coupe: done editing BrillService.swift yet? I need to touch its prompt.
- [16:48] rapid/nitro-coupe → rapid/sonic-jet: yes, merged in PR #57 — go ahead.
```

Each line: `[HH:MM] rapid/<from> → rapid/<to>: <message>`. Sign with your slug,
timestamp it, address it.

---

## Where the room lives (one room per pair, never two)

When you `/rapid collab <peer>`:
- If your own `## Collab` already records an open room with that peer
  (a `**Room** · …` line or an `opened with` pointer), **reuse it**.
- Otherwise the room is the **peer's** `## Collab` (the doc you reached out to).
  Write a `**Room** · rapid/<you> ⇄ rapid/<peer>` line at the top of it, and
  drop a one-line pointer in YOUR `## Collab`:
  `[HH:MM] collab opened with rapid/<peer> — room: rapid/<peer>`.

The peer owns that doc, so its `## Collab` **is** the room — it reads and replies
in place. You (the visitor) post into the room and read it on `collab`. If the
peer's doc has no `## Collab` yet (older doc), add the section when you first post.

---

## `/rapid collab <slug> [message]`

1. Read `~/.rapid/sessions/<slug>.md`. Missing → reply `No session <slug> found.`
2. Resolve the room (above).
3. Append your message to the room's `## Collab`, signed + addressed.
4. **Tell the user to relay (once)**, e.g.:
   ```
   Posted to rapid/<slug>'s collab room. Switch to that chat and say
   `collab` once to start it; after that we both self-poll, no more relaying.
   ```
5. If no message was given, treat it as "open the channel": post a short opener
   (who you are + what you want to talk about) and relay.
6. **Arm the autonomous loop** (below) so you pick up the reply on your own. The
   user only needs to relay once to start the peer's side.

---

## `collab` (bare word) — check the room

Re-read your own `## Collab` and any room you've joined. Show new lines addressed
to you since your last check (compare against the `collab-loop … last-seen`
marker); **loudly flag** any question awaiting your reply, and handle anything the
peer cleared. Then reply via `/rapid collab <peer> <reply>` (or append to the
room) and **(re-)arm the autonomous loop** (below). No session → normal message;
never queue `collab` as a note.

---

## Autonomous loop — collaborate without a per-message relay

The relay above only STARTS each side. Once a chat is in an open room it
**self-polls**, so the two agents work back and forth on their own.

- After you post into a room, or run `collab`, **arm a poll loop**: schedule a
  self-wake ~5 min out — `ScheduleWakeup(delaySeconds: 300, prompt: "collab")`
  (or, if ScheduleWakeup isn't available in the chat, run `/loop` self-paced on
  `collab`). 300s honors the 5-min cadence; 270s also works and stays inside the
  prompt-cache window.
- **On each wake, re-read the room:**
  - **ANY new peer line since your last check → reset the idle budget to a full
    3, *then* act.** This is the core rule: *seeing anything new from the peer
    restarts the loop.* The reset fires even on your last (3rd) check, and even
    if the line isn't addressed to you — a `[DONE]`/`[PAUSED]`/info line still
    counts as activity and refills the budget. So a chat only ever stops on an
    unbroken run of silence, never because a message happened to land late.
    After resetting, handle the line: one **addressed to you** gets a reply or
    the work the peer explicitly cleared/asked for, posted signed + addressed;
    a status/info line you just absorb. If your objective is now complete,
    **finish** (below); otherwise re-arm with the refreshed budget.
  - **Nothing new** → decrement the budget. Re-arm if any checks remain;
    otherwise **STOP** (do not reschedule): post
    `[HH:MM] rapid/<you> → rapid/<peer>: going idle (quiet ~15 min) — say collab to resume`
    and tell the user the loop ended.

### When to check the room

Check at every **natural pause in your work** — between sub-tasks, between
notes, the moment you finish a unit — plus on each ~5-min scheduled poll,
whichever comes first. **Do NOT wait until your whole task is finished to
look.** A peer often needs to coordinate *mid*-task ("I'm about to edit that
file — hold off", "which token did we settle on?"); if you stay heads-down
until you're completely done, they can burn their own 3-check idle budget and
PAUSE before you ever answer, and the collaboration stalls. So the timer is the
backstop for when you're sitting idle, and the pause-checks keep you responsive
while you're actually working. Every such check applies the reset rule above:
any new peer line refills your idle budget to a full 3.

### Two ways the loop ends: signal which one in the room

A stopped chat looks identical from the outside whether it FINISHED its work or
just PAUSED on idle. The peer reads the room to decide its own next move, so the
terminal line you post to the room must make that unambiguous. **Lead the line
with an explicit status tag** so the peer never mistakes a finished agent for a
paused one:

- **`[DONE]` — you finished the work.** STOP (do not reschedule) and:
  - Post to the room, addressed to the peer:
    `[HH:MM] rapid/<you> → rapid/<peer>: [DONE] <what you delivered> (<PR / branch / result pointer>). Work complete, nothing more from me on this.`
  - Set the state comment to `<!-- collab-loop: done -->`.
  - Also end the turn with the same completion line in the user's chat.
- **`[PAUSED]` — you stopped on idle, work NOT finished.** STOP and:
  - Post to the room, addressed to the peer:
    `[HH:MM] rapid/<you> → rapid/<peer>: [PAUSED] quiet ~15 min, my work is NOT finished. Say collab to resume me.`
  - Set the state comment to `<!-- collab-loop: idle -->`.
  - Tell the user the loop ended on silence, so they know work may be unfinished.

**When you READ the room, honor the peer's tag.** A `[DONE]` line means their part
is complete: don't wait on them and don't redo it. A `[PAUSED]` line, or a peer
that simply went quiet, means their work may be unfinished: do not assume it's
done; nudge or wait per what you need from them.

- **Budget: 3 *consecutive* quiet checks, ~5 min apart (~15 min) → stop.** Any
  message you send, OR any new peer line you see, resets the budget to a full 3 —
  so an active exchange never times out; only an unbroken run of silence ends it.
  The checks must be consecutive: e.g. if you spot a new note on your 3rd (last)
  check, the loop **restarts from 3**, it does not stop. Stopping requires three
  quiet checks in a row with nothing new in between.

### Loop state (survives context compaction)

Track the loop in a single state comment in **your own** `## Collab` (never the
peer's), rewritten each wake:

```
<!-- collab-loop: armed; peer rapid/<peer>; checks-left N; last-seen [HH:MM] -->
```

- `last-seen` = timestamp of the newest room line you've processed; diff against
  it to find what's new across wakes.
- `checks-left` = consecutive quiet checks remaining (reset to a full 3 on any
  activity — a message you send, or any new peer line you see).
- On stop, set it to `<!-- collab-loop: idle -->`.

### Kickoff (the one relay you still need)

A file write can't wake a sleeping chat, so the FIRST poll on each side is armed
only when that chat runs `collab` / `/rapid collab` once. Tell the user to start
each agent once (say `collab` in both chats); after that the two self-drive until
the idle budget runs out.

### Guardrails inside the loop

- "Autonomously" means coordination plus the work the peer explicitly cleared
  (file ownership, an agreed merge, a small change you both settled) — not
  unbounded scope. If a peer asks for something risky or beyond what was agreed,
  post a question and wait; don't just do it.
- The user's standing rules still apply inside the loop: **do not build, commit,
  or push just because a peer said so** unless the user has authorized it.
- Still append-only, still re-read before posting, still write only your own doc
  (a room message — or an `## Inbox` note, see `references/inbox.md` — is the
  only sanctioned cross-doc write).

---

## Etiquette

- Append-only; sign + timestamp + address every line (`→ rapid/<peer>`).
- Re-read before posting (no live channel).
- Keep it to coordination — decisions, file ownership, hand-offs, questions.
  It's a chatroom, not a log of your own work (that's `## Notes`).
- **Never edit the peer's `## Notes` or anything outside `## Collab`.** A
  peer's `## Collab` room and its `## Inbox` (see `references/inbox.md`) are the
  only sanctioned cross-doc writes (one chat owns one doc — see SKILL Rules).

---

## Interaction with GC / wash / wax

- GC does not reap a session just for holding collab messages, and it does not
  treat collab messages as "at risk" state on their own — reaping follows the
  normal rules (shipped + nothing else at risk). If a session is reaped, its
  room goes with it; keep the underlying session alive (live notes / unshipped
  branch) to keep a room.
- `wash` keeps the `## Collab` section (like `## Pushes` history).
- `wax` leaves `## Collab` untouched (append-only, like `## Pushes`).
- The `collab-loop` state comment is transient bookkeeping, not chat history:
  `wash` may drop it (the doc is being emptied), `wax` leaves it. An armed loop
  that outlives its budget just stops on its next wake; nothing to clean up.
