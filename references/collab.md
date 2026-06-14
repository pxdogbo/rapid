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

## The constraint (same as fleet): no live channel

A markdown file is the only shared medium, and writing to it cannot wake a
sleeping chat. **The user is the relay.** After you post, tell the user which
chat to switch to and what to say there (`collab`). Re-read the room before you
post or reply — never assume you've seen the latest.

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
4. **Tell the user to relay**, e.g.:
   ```
   Posted to rapid/<slug>'s collab room. Switch to that chat and say
   `collab` so it picks up your message.
   ```
5. If no message was given, treat it as "open the channel": post a short opener
   (who you are + what you want to talk about) and relay.

---

## `collab` (bare word) — check the room

Re-read your own `## Collab` and any room you've joined. Show new lines addressed
to you since your last check; **loudly flag** any question awaiting your reply.
Then reply via `/rapid collab <peer> <reply>` (or append to the room) and relay
back. No session → normal message; never queue `collab` as a note.

---

## Etiquette

- Append-only; sign + timestamp + address every line (`→ rapid/<peer>`).
- Re-read before posting (no live channel).
- Keep it to coordination — decisions, file ownership, hand-offs, questions.
  It's a chatroom, not a log of your own work (that's `## Notes`).
- **Never edit the peer's `## Notes` or anything outside `## Collab`.** The
  `## Collab` room is the ONLY sanctioned cross-doc write
  (one chat owns one doc — see SKILL Rules).

---

## Interaction with GC / wash / wax

- GC does not reap a session just for holding collab messages, and it does not
  treat collab messages as "at risk" state on their own — reaping follows the
  normal rules (shipped + nothing else at risk). If a session is reaped, its
  room goes with it; keep the underlying session alive (live notes / unshipped
  branch) to keep a room.
- `wash` keeps the `## Collab` section (like `## Pushes` history).
- `wax` leaves `## Collab` untouched (append-only, like `## Pushes`).
