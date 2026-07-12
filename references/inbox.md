# `inbox` — leave an async note for another session

Read this when the user invokes `/rapid inbox <slug>` or the bare word `inbox`.

| Invocation | What it does |
|---|---|
| `/rapid inbox <slug> [message]` | Leave a note in session `<slug>`'s `## Inbox`. Fire-and-forget — no loop, no poke, no relay. |
| `inbox` (bare word, mid-session) | Read **your own** session's `## Inbox`: show unread notes, mark them read, offer to queue actionable ones. |

`inbox` is the **async** cousin of `collab`. Where `collab` opens a live (or
polled) back-and-forth between two agents, `inbox` just **drops a note** into
another session's doc for it to find whenever it next looks. The user reaches
for it explicitly — "leave a note in warp-shuttle's inbox: I merged the shared
theme" — when a passive heads-up is enough and nothing should start moving.

What it deliberately is **not**:
- **No autonomous loop.** Leaving or reading a note never arms
  `ScheduleWakeup` / `/loop`. (That's `collab`.)
- **No poke, even in live mode.** Inbox never `tmux send-keys` the recipient —
  not even when `collabLive` is on. The note waits passively. Need real-time
  delivery and a reply? That's `collab`.
- **No auto-surfacing, no relay-to-start.** No menu marker, no resume flag,
  no "tell the user to switch chats." The note sits in the recipient's
  `## Inbox` until **the user goes to that chat and tells it to check**.

---

## 🔴 Inbox never triggers the recipient — don't use it to start work

Leaving a note does NOT make the other agent do anything. Nothing fires,
nothing wakes, nobody reads it until the user manually goes to that chat and
says `inbox`. So when YOU are choosing the channel — the user said "tell
rapid/<slug> to…", "hand this to your peer", "assign this to <slug>" — and the
message assigns work, asks a question, or expects any action or reply, that is
**`collab`** (message the agent directly — live mode types it straight into
its chat) or **`handoff`** (a whole scoped task), **never inbox**. Reach for
inbox only when the message is a passive FYI that can sit unread indefinitely,
or the user explicitly said "inbox" / "leave a note".

Pick the right tool: `inbox` to leave a quick async note, `collab` to have a
live conversation, `handoff` to hand a whole scoped task to a fresh chat.

---

## The `## Inbox` section

Every session doc carries an `## Inbox` section (blank until a note arrives).
Append-only; `[ ]` = unread, `[x]` = read:

```markdown
## Inbox
- [ ] [14:32] rapid/sonic-jet → rapid/warp-shuttle: also update the mobile layout when you touch the avatar sizing.
- [x] [09:10] rapid/nitro-coupe → rapid/warp-shuttle: heads up — I merged the shared theme in PR #57. → queued as note 4
```

Each line: `- [<state>] [HH:MM] rapid/<from> → rapid/<to>: <message>`. Sign with
your slug, timestamp it, address it. If the sending chat has no session of its
own, sign `rapid/—`.

---

## `/rapid inbox <slug> [message]`

1. Read `~/.rapid/sessions/<slug>.md`. Missing → reply `No session <slug>
   found.` (Check `archive/` too; if it's archived, say so and offer
   `/rapid resume <slug>` instead of dropping a note into an archived doc.)
2. Append the note to that doc's `## Inbox`, signed + addressed, as
   `- [ ] [HH:MM] rapid/<you> → rapid/<slug>: <message>`. Add the `## Inbox`
   section if an older doc lacks one, and if the section is missing the
   standard template reminder comment (SKILL.md doc template), add it under
   the heading while you're there — it warns the next sender in place.
3. **That's the whole action — do NOT** arm a loop, poke the peer, or tell the
   user to relay. Leaving the note is all that happens.
4. Confirm in one line: `Left a note in rapid/<slug>'s inbox. Go to that chat
   and tell it to check (\`inbox\`) whenever you're ready.` If the note is
   actionable (assigns work / expects a reply), append the reminder: `Note:
   this won't start them working — for that, \`/rapid collab <slug>\`.`
5. No message given → ask what the note should say; don't post an empty note.

The recipient's `## Inbox` (like its `## Collab`) is a **sanctioned cross-doc
write** — one of the few places you may write in another chat's doc. Never
touch its `## Notes` or anything else.

---

## `inbox` — read your inbox (on the user's cue)

The user reads an inbox by **going to the recipient chat and telling it to
check** — `inbox`, or natural phrasings like "check your inbox" / "check inbox"
/ "read your inbox". Treat any of those as this trigger. Acts only if **this
chat owns a session** (like every bare word). No session → treat as a normal
message; never queue it as a note.

1. Read your session doc's `## Inbox`.
2. Show every **unread** (`[ ]`) note, newest last, in plain language (who left
   it + the message).
3. **Mark each shown note read** — flip `[ ]` → `[x]`.
4. **Offer to queue the actionable ones.** If a note describes work to do, offer
   to add it to `## Notes` as a real note (or just add it and say so, per the
   user's call). When you queue one, append ` → queued as note N` to its inbox
   line so the trail is clear.
5. Nothing unread → reply `Inbox clear.` and stop.

---

## How a note gets read (manual — you're the trigger)

There is **no automatic surfacing** — no menu marker, no resume flag, no poke,
no poll. A note simply waits in the recipient's durable `## Inbox` until **you
go to that chat and tell it to check**. That is the whole point of the feature:
you decide when each agent reads what was left for it.

So the flow is just two steps, on your cue each time:
1. In one chat: `/rapid inbox <slug> <message>` → the note lands in `<slug>`'s
   `## Inbox`.
2. When you're ready, switch to that chat and say `inbox` (or "check your
   inbox") → it reads, marks read, and offers to queue anything actionable.

Nothing happens in between. The note can sit unread indefinitely; the only
thing that reads it is you asking the recipient to.

---

## Interaction with the reap / wash / wax

- **Unread inbox notes are at-risk for the reap.** The reap sweep skips a
  session that holds any unread (`[ ]`) `## Inbox` note — silently reaping a note
  someone left before it was read would lose it. Reading them (→ `[x]`) clears
  the block, so the session reaps normally afterward.
- `wash` keeps the `## Inbox` section (like `## Collab` / `## Pushes` history).
- `wax` leaves `## Inbox` untouched (append-only).

---

## Etiquette

- Append-only; sign + timestamp + address every line.
- Keep it to a note — a heads-up, a reminder, a small ask. For a conversation
  use `collab`; for a whole task use `handoff`.
- The recipient's `## Inbox` is the only thing you write in their doc. Never
  their `## Notes`.
