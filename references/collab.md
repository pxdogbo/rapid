# `collab` — a chatroom between two live agents

Read this when the user invokes `/rapid collab <slug>` or the bare word `collab`.

| Invocation | What it does |
|---|---|
| `/rapid collab <N>` (N = 1–4) | **Spin up N collab-ready sessions** in the current repo and print the one command to open them. A *number* means "make this many" (not a message). See "Spin up a collab set" below. |
| `/rapid collab setup` | **Enable live mode** (one time): register the relay, set `collabLive: true`, verify tmux. See "Enabling live mode" below + `references/setup.md`. |
| `/rapid collab <slug> [message]` | Open or continue a chatroom with the agent on session `<slug>`. Live mode pokes them in real time; otherwise post + relay. |
| `collab` (bare word, mid-session) | Re-read your `## Collab` (and any room you joined); show new messages from the peer; flag anything awaiting your reply. |

> **Disambiguating `/rapid collab <arg>`:** a **number** (1–4) spins up that many sessions; the literal word **`setup`** enables live mode; a **slug** messages that peer; **bare `collab`** checks your room.

`collab` is just a **chatroom**: two agents in two separate chats, each on its
own session, talking — to coordinate a shared file, settle a decision, or hand
something across. It's deliberately lightweight: no notes, no branches, just
messages. (To hand a whole scoped task to another chat instead of chatting, use
`handoff` — see `references/handoff.md`.)

---

## 🔴 Peers are NOT subagents — a named session routes through collab

A rapid peer is a **live agent in another chat**, with its own session,
worktree, and (usually cheaper) model. It is not a subagent of yours. When the
user names one — a slug ("quantum-kart"), "your peer", "the other agent", or
its worktree path — anything they ask you to send, assign, or request from it
goes through THIS skill: `collab_send` in live mode (or the doc-mode room),
`handoff` for a whole task, `inbox` only for a passive note they explicitly
asked for. **NEVER satisfy it by spawning your own background agent** (Plan,
general-purpose, or any subagent): "ask quantum-kart for a plan" means MESSAGE
quantum-kart and let IT write the plan — not "launch a Plan subagent and wait
for it". (That flow has a name — a **rapid-plan**; see "rapid-plan" under
Roles & roster.) A subagent runs on your own model inside your own chat, invisible to
the user and the peer — the opposite of what was asked, and it double-spends
the tokens the peer split exists to save. If you catch yourself typing
`Agent(...)` with a peer's name or worktree in the prompt, stop and
`collab_send` instead.

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
types the **message itself straight into the peer's chat**, so the two agents
talk in real time — the peer sees your message land and answers directly, no
"go read the room" hop, no self-poll loop, no per-message relay. The `## Collab`
room is still written as the durable record (and `[DONE]`/`[PAUSED]` still end
an exchange) — but the peer doesn't have to *read* it to get your message; it's
already in their chat. Live mode swaps only the *transport*. Setup + internals:
`references/collab-live/README.md`.

**Use live mode when ALL hold** (otherwise use the doc-mode flow below — it is
the default and the fallback):
- `collabLive: true` in `~/.rapid/config.json`, AND
- the `rapid-collab` MCP tools (`collab_send` / `collab_register`) are available
  (or the `relay.mjs` CLI is), AND
- both chats run inside **tmux** (Unix only).

**🟢 Your identity is the directory — auto-adopt it (skip `/rapid resume`).** Live
mode keys identity off the **working directory**: the relay maps each pane's cwd
to a slug via the `**Worktree:**` headers and pokes by pane. So in a collab pane
you don't need to `/rapid resume` first — when you run `/rapid collab …` (or bare
`collab`) and this chat has **no session bound yet**, **adopt the cwd's session
automatically**: read `self=<slug>` from `collab_register` (or `node
…/relay.mjs status`), bind this chat to that slug, and continue. The directory
already told us who you are, so the resume step is redundant in a collab pane.

**🔴 But if you're ALREADY bound to a DIFFERENT slug, STOP — don't misroute.** The
one failure mode is a *crossed* identity: this chat is bound to slug A while its
cwd is slug B's worktree (e.g. someone explicitly resumed the wrong slug). The
relay pokes by cwd, so sending would hit the wrong pane. Before you send/reply/act
on a poke, confirm your bound slug == the cwd's `self`; on a mismatch, **do not
send** — tell the user: `This pane is <self> (its worktree) but I'm bound to
<bound>. That inverts identity in live mode — run` `/rapid resume <self>` `here
(or move to <bound>'s worktree).` Re-check after the fix. The directory is ground
truth; when in doubt, trust `self`.

**What changes when live mode is on:**
- **🔴 CHAT with the peer — the conversation happens in the chats, not the
  doc.** Talk to the other agent the way you'd answer a user: send the message,
  get the reply, keep the exchange going. Never hand-write lines into a
  `## Collab` section as your way of "sending" (the relay writes the room copy
  of every `collab_send` for you), never reply by editing a doc, and never send
  a message that just says "check the room" / "I posted in the doc" — put the
  actual content in the message. The `## Collab` room mechanics below (manual
  append, relay-once, poll loop) are the **doc-mode fallback for non-live
  sessions**; in live mode the room is only the auto-maintained transcript.
- **Sending** — call **`collab_send(to, message)`** with the **raw message
  only** (no `rapid/x → rapid/y:` prefix — the relay signs the room copy and
  tags the injected copy; if you prefix it yourself the line double-signs). The
  relay types your message straight into the peer's pane AND records it in the
  peer's room. (Tool unavailable? CLI: `node …/relay.mjs send <peer> "<msg>"`.)
- **Receiving** — a turn that arrives as **`[collab from rapid/<peer>] <message>`**
  is a live message from that peer agent. Just answer it: reply with
  `collab_send(<peer>, <your reply>)`, which types your reply into *their* pane.
  You do **not** need to read the `## Collab` room — the message is already in
  front of you. (Read the room only to catch up after a gap, or if a tagged line
  looks truncated/garbled.)
  - **The `[collab from rapid/<peer>]` tag is how you tell a peer from the user.**
    A turn **with** that tag is the peer agent → answer via `collab_send`. A turn
    with **no** such tag is the **user** (the human) → respond to them normally in
    this chat; do **not** `collab_send` it to a peer. The tag is the only
    signal — when it's absent, it's the user.
- **No "tell the user to relay" step** — delivery is automatic. (If `collab_send`
  reports a doc-only fallback — peer not registered / different host / inject
  failed — THEN tell the user to relay once, exactly as doc-mode.)
- **No autonomous poll loop for receiving** — delivery is push, so do **not**
  `ScheduleWakeup`/`/loop` just to check for messages. Still glance at the room
  at natural pauses (cheap; covers a message that landed while you were
  mid-turn). **One sanctioned self-wake: the waiting watchdog** — when you are
  BLOCKED on something you asked a peer for, arm the nudge cycle in "Waiting on
  a peer" below so a silently-finished (or stuck) peer can't strand you.
- **Stopping** — still post `[DONE]` / `[PAUSED]` via `collab_send` the same way;
  the peer reads the tag and stops. No idle-budget countdown is needed (there's
  no loop to wind down), but `[PAUSED]` is still the right signal if you step
  away with work unfinished.

Because the relay also records every message in the room, a delivery that
garbles or lands while the peer is mid-turn only *delays* the message — it is
never lost: the full line is in the room, and the peer picks it up on its next
natural-pause `collab` check. So live mode needs no fallback poll.

### Enabling live mode (don't silently degrade)

If the user reaches for live collab (`/rapid collab <N>`, or messaging a peer)
and live mode is **not** configured — no `collabLive: true`, relay not
registered, or not in tmux — do **not** just quietly drop to doc-mode. **Surface
it and offer to fix it:** `Live collab isn't set up yet. Want me to enable it?
(\`/rapid collab setup\` — registers the relay + flips collabLive; needs tmux on
macOS/Linux.)` If they say yes, run the setup (see `references/setup.md` →
"Enabling live collab"), then continue. If they decline, or the platform can't
support it (no tmux / not Unix), fall back to doc-mode and say so in one line.
The bare `/rapid collab setup` verb runs the same setup on demand, any time.

---

## Spin up a collab set — `/rapid collab <N>` (N = 1–4)

A **number** (not a slug) means "create this many collab-ready sessions in the
current repo and hand me the command to open them." It's a **scaffolder**: it
mints sessions and prints how to open them — it does **not** bind this chat or
start working (close this chat after; the work happens in the opened panes).

1. **Cap at 4.** If N > 4, do nothing and reply: `Max 4 per spin-up (tmux gets
   cramped past that, and 4 live agents is plenty). Run \`/rapid collab\` again
   for more, or add one at a time with \`/rapid collab 1\`.` If N < 1 or
   non-numeric, treat as a slug/other (see the other rows).
2. **Resolve the repo** from cwd (`git rev-parse --show-toplevel`). Not in a repo
   → reply that spin-up needs a git repo and stop.
3. **Mint N fresh sessions** — run Step 2b (SKILL.md) N times: a unique
   `<adjective>-<vehicle>` slug, a worktree at `~/worktrees/<repo>/<slug>/` on
   `rapid/<slug>` off `origin/main`, and a session doc each. Do **not** bind this
   chat to any of them.
4. **Live-mode readiness.** If live mode isn't set up, append a one-liner to the
   printout: `(first run \`/rapid collab setup\` to enable real-time mode)`.
5. **Already mid-collab? Add to it — don't make the user fiddle with tmux.**
   The collab tmux is named **per repo** — `rapid-collab-<repo>` (repo =
   `basename` of `git rev-parse --show-toplevel` for the current repo). Check
   `tmux has-session -t rapid-collab-<repo>`:
   - **Running → mid-session add** (the usual reason for `/rapid collab 1`: "I've
     got a collab going and need one more"). Do NOT print a fresh-launch line.
     Drop the new session(s) into the live collab as panes — run the helper with
     `--add` (it resolves the running `rapid-collab-<repo>` tmux from the new
     slug's own repo, opens a pane per new session in its worktree, launches
     claude, re-tiles; refuses past 4 panes total):
     ```
     <skill-dir>/references/collab-live/collab-start --add <newslug> [<newslug2> …]
     ```
     Then **auto-join** each newcomer so the user types nothing: poll
     `~/.rapid/collab-panes.json` (a few times, ~30s) until the new slug appears
     — that means its claude + relay booted — then read its pane id from there and
     `tmux send-keys -t <pane> '/rapid collab <lead> joining — what should I take?' Enter`.
     **Then VERIFY it submitted** — any hand-typed `send-keys` can lose the text
     (pane still booting) or have its Enter eaten (TUI mid-render), leaving the
     line sitting in the composer unsent: `tmux capture-pane -t <pane> -p`, and
     if the line is still visible after the `❯` prompt, send Enter again (text
     never landed → re-send text with `-l`, pause, then Enter). Never assume a
     `send-keys` arrived — check the pane.
     Find `<lead>` from the room's roster line (the collab opener). If it hasn't
     registered in time, tell the user to type that line in the new pane. Report:
     `Added rapid/<slug> to the live collab — joining <lead> now.`
   - **Not running → fresh start.** Print the open command and tell the user to
     close this chat:
     - **N = 1** — one session, to pair with one you already have:
       ```
       Created rapid/<slug>.
       ▶ pair it with a session you've got going:  rapid-collab <slug> <other-slug>
         (live now for this repo: <list live slugs>)
       ▶ or open it solo:  cd ~/worktrees/<repo>/<slug> && claude
       ```
     - **N ≥ 2** — a fresh set; one launch line:
       ```
       Created rapid/<slugA> + rapid/<slugB>[ + …].
       ▶ rapid-collab <slugA> <slugB>[ …]
         (close this chat — the panes are where you'll work)
       ```
6. **Stop** (fresh-start path) — don't open tmux yourself or bind; the user runs
   the printed command. (The mid-session-add path already opened the pane above.)

Once opened, each pane **auto-adopts its directory's session** (no `/rapid
resume`), and `/rapid collab <peer> <message>` starts the real-time exchange.

---

## Reopen / shut down the collab tmux — `rapid-collab open` / `rapid-collab kill`

**Closing the terminal window only DETACHES tmux** — the panes and their agents
keep running invisibly in the background (and a later `/rapid collab <N>` piles
new panes onto the ghosts). The lifecycle verbs, both subcommands of
`collab-start` / the `rapid-collab` alias:

- **`rapid-collab open`** — reattach to the running collab (from inside tmux it
  switches clients instead). Nothing running → says so and points at the start
  command.
- **`rapid-collab kill`** — shut the whole thing down: kills the tmux session
  and every agent pane in it, and prunes those panes from the relay registry
  (`~/.rapid/collab-panes.json`) so a stale entry can't misroute a future live
  send. Session docs, worktrees, and branches are untouched — it ends the
  *processes*, not the work.

**Which collab do open/kill act on? The one for your repo — automatically.**
Each repo gets its own `rapid-collab-<repo>` tmux, so you can run several collabs
side by side (one per repo) with no bookkeeping. `open`/`kill` figure out the
target from where you run them:
- Run from inside a collab pane (or anywhere in the repo) → the current repo's
  collab. This is the normal case; nothing extra to type.
- Two collabs in the **same** repo? Start the second with `-n <name>`
  (`rapid-collab -n <name> <a> <b>` → `rapid-collab-<name>`), and pass the SAME
  `-n <name>` to that collab's `open`/`kill`.
- If a lifecycle verb can't tell which one (you're outside any repo and several
  are running), it lists the running collabs and asks you to add `-n <name>`.

**When the user says they're done with the collab** ("close the agents", "kill
the panes", "shut it down"), run `rapid-collab kill` for them — don't hand back
raw tmux commands. Same for reopening: `rapid-collab open`, not
`tmux attach -t rapid-collab-<repo>`. (If this chat is a collab pane, running
`kill`/`open` from it targets the right session on its own.)

---

## The `## Collab` section

Every session doc carries a `## Collab` section (blank until a collab opens). It
is an **append-only** chatroom — newest line last, never rewrite history:

> **Live mode: this section is the transcript, not the medium.** The relay
> writes a room line for every `collab_send` automatically; you never append
> chat lines by hand, and you read the room only to catch up after a gap. The
> manual mechanics in this and the following sections (hand-appending lines,
> relay-once, the poll loop) apply to **doc-mode (non-live) sessions** — plus
> the roster line and `<!-- collab-loop -->` state comment, which stay
> hand-maintained in both modes.

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

## Roles & roster — one agent fronts the user; the room says who's who

The **user is a shared, serial resource.** In a multi-agent collab only ONE chat
should take questions to them — otherwise a question gets missed behind a chat
that's blocked waiting on the user, two agents ask at once and split their
attention, or an incoming peer message interrupts an agent mid-decision. So:

**The opener is the lead.** Whoever opens the collab (the first `/rapid collab …`,
or the first agent to start talking in a `/rapid collab <N>` set) is the **lead**
— the single point of contact with the user. Everyone else is a **worker**. (If
the user names a different lead, honor that.)

### The lead delegates — it never spawns its own background agents to do the work

In a live collab the **work belongs to the peers; the lead coordinates and
QAs.** The peers usually run on a cheaper model — that split is the point of
the setup. A lead that spawns its own background agents (Agent tool /
subagents) to implement a lane defeats it twice: the work runs on the lead's
expensive model anyway (no cost saving), and it bypasses the peers the collab
was opened for.

- **Lead:** never spawn a background agent to do lane work. Assign the lane to
  a peer (`collab_send`) and review what comes back — reading diffs, testing,
  settling merge order is YOUR job, done yourself. (A quick read-only lookup
  agent for your own QA is fine; anything producing work product is not.)
- **Workers:** you own your lane and MAY use background agents inside it when
  they help — as long as the result stays reviewable by the lead: everything
  lands on your session's branch/worktree, and you report it through the room
  like any other work of yours. No side-channel output the lead can't inspect.

### rapid-plan — asking a peer to author a plan

A **rapid-plan** is a plan written by a PEER agent and delivered through
collab. The name exists to kill an ambiguity: "plan" alone pattern-matches the
harness's built-in Plan subagent / plan mode, which is the WRONG tool here — a
rapid-plan is never a subagent and never plan mode.

Trigger: `/rapid plan <slug> <task>`, or the user says "rapid-plan" / "have
<slug> plan it" / "ask your peer for a plan". Flow:

1. **Requester (usually the lead):** `collab_send(<slug>, "[plan-request]
   <task brief — goal, constraints, files/areas, what the plan must cover>")`.
   That's the whole send — no Agent tool, nothing to poll; the peer is a live
   chat and will answer like any collab message.
2. **Peer:** author the plan yourself in your own chat (your lane, your
   model; background agents allowed per the rules above) and send it back:
   `collab_send(<lead>, "[plan] <the plan>")`. Don't enter plan mode, don't
   ask the user anything — your reviewer is the lead.
3. **Requester:** review the plan (scope, overlap with other lanes, risks).
   Clear the peer to build, ask for a revision, or — only if something needs
   the user's call — surface it through your normal user queue.

### Workers don't plan at the user — a plan goes to the lead first

A worker's default is to just DO its assigned lane; the lead already scoped
it. As a worker, don't write plan documents, don't enter plan mode (its
approval prompt grabs the user), and NEVER ask the user to approve a plan or
"should I proceed?" — that's the same serial-resource violation as asking them
a question directly. If a lane is genuinely big or ambiguous enough to need a
plan first, keep it short and send it to the **lead** for review before any
work: `collab_send(<lead>, "[plan] <lane>: <the plan>")` — start only when the
lead clears it. The lead reviews plans the way it reviews diffs: it owns
scope, and it pulls the user in (through its normal question queue) only when
something actually needs their call.

**The roster lives in the room — that's how anyone, including a late joiner,
learns who's who.** The lead maintains a roster line at the top of the room (it
replaces the simple `**Room** · …` line once there are roles):
```
**Room** · lead: rapid/<lead> · members: rapid/<lead>, rapid/<w1>, rapid/<w2> · owns: <w1>=engine, <w2>=UI
```
This is the **one mutable line** in an otherwise append-only room — the
authoritative "who's lead, who's here, who owns what." The lead rewrites it
whenever membership or ownership changes (kickoff, a join, a reassignment).

**At kickoff** the lead posts that roster line AND `collab_send`s each peer a
roles note, so every agent records: *lead = rapid/<slug>* + its own lane.

### Routing a question to the user

**Worker** that hits something only the user can decide:
1. **Don't ask the user yourself.** Send it to the lead:
   `collab_send(<lead>, "[Q→user] <question + context> (blocks: <what it holds up>)")`.
2. **Pause just that item** — mark the note `[!] blocked: awaiting user via <lead>`
   — and keep doing any *other* independent work.
3. Resume when the lead relays the answer back.

**Lead:**
- Your *own* user-questions → ask the user directly (you're the front).
- A worker's `[Q→user]` → **surface it to the user prominently**, naming the
  worker; if several stack up, list them numbered. When the user answers, relay
  it: `collab_send(<worker>, "<answer>")` so they unblock. Don't sit on it — a
  worker is paused waiting.

The user becomes one ordered queue: every cross-agent question funnels through
the lead, nothing is lost behind a blocked chat, and workers pause cleanly.

### Bringing in a new agent mid-session

The user adds an agent mid-collab with **`/rapid collab 1`** — when this repo's
`rapid-collab-<repo>` tmux is already running it drops the new session in as a
pane and nudges it to join (see "Spin up a collab set" above), so no tmux
fiddling. The newcomer then:
1. **The newcomer reads the room first.** Before doing anything it reads the
   lead's `## Collab` — the **roster line** tells it who's lead and who's already
   here; the exchange tells it what's owned / in flight. That's how it learns
   "who's who" with nobody re-explaining. (No roster line? Older room → ask the
   lead "who's lead / what's mine?"; never guess.)
2. **It checks in with the lead** (not a worker):
   `collab_send(<lead>, "rapid/<me> joining — what should I take?")`.
3. **The lead onboards it:** assign a lane that doesn't overlap existing owners
   (Step 5 overlap rules), **rewrite the roster line** to add the newcomer + its
   ownership, and re-announce so everyone — including the newcomer — shares the
   updated map.
4. The newcomer routes its user-questions through the lead, same as any worker.

---

## Waiting on a peer — close the loop (both modes)

**Agents cannot see each other working.** There is no shared screen, no
process list, no progress signal — the ONLY thing that crosses between two
chats is a message (a live inject or a room line). A peer that finished
silently looks *identical* to a peer that is stuck, so a requester left
waiting has no way to tell "done, forgot to say" from "still going" from
"dead". Completing a request and moving on without messaging is the #1 way a
collab stalls. Two duties close the loop:

**If a peer's message asks you for something — or says they're blocked on
you — you owe them TWO messages:**
1. **Ack now**, before starting: one line saying what you'll do and roughly
   when ("taking it — after my current note", "starting now, ~10 min").
2. **Report the moment it lands**: message the requester the RESULT — what
   changed and where (branch, PR, file), not a bare "done". If you stall,
   park it, or hit a blocker instead, say that. Never let the requester
   discover completion by accident; assume they are sitting blocked on you.
   A worker finishing its assigned lane reports to the lead the same way —
   the lead is by definition waiting on every lane.

**If you're the one waiting, don't wait silently either:**
- Ask explicitly: name the deliverable and say you're blocked on it
  ("blocked on you for X — message me when it's in").
- Mark the item `[!] blocked: waiting on rapid/<peer> for <thing>` and pick
  up any independent work meanwhile.
- **Arm the waiting watchdog** (the one sanctioned live-mode self-wake):
  `ScheduleWakeup(delaySeconds: 270, prompt: "collab")`. On each wake with
  still no word, nudge once — `collab_send(<peer>, "status on <thing>? still
  blocked on it")`. Any peer message resets the count, exactly like the
  doc-mode idle budget. After **3 consecutive quiet nudge-cycles** (~15 min),
  stop nudging: surface it to the user (the lead directly; a worker as
  `[Q→user]` via the lead) and leave the item `[!]`.
- The watchdog also rescues a lost ask: if your original message garbled or
  the peer never really registered it, the nudge itself lands in their chat
  and wakes them. (In doc mode the normal poll loop already plays this role —
  add the nudge line on its checks when you're blocked.)

---

## `/rapid collab <slug> [message]`

> **Live mode? Skip this flow — just chat.** `collab_send(<slug>, <message>)`
> delivers the message into the peer's chat and writes the room line for you;
> there is nothing to append, no relay to request, no loop to arm. The numbered
> steps below are the **doc-mode (non-live) fallback**.

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
never queue `collab` as a note. (Live mode: this verb is just a catch-up read —
reply to anything new via `collab_send`, and don't arm any loop.)

---

## Autonomous loop — collaborate without a per-message relay (doc mode ONLY)

The relay above only STARTS each side. Once a chat is in an open room it
**self-polls**, so the two agents work back and forth on their own. **Live mode
never arms this loop** — messages arrive in the chat directly; this whole
section is the non-live fallback.

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
