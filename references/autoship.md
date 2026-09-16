# Autoship — the queue lands itself

Read this file at session start (it's cheap) and any time a note reaches `[c]`.

The user does not want to type a ship word. They ask for something, you do it,
and it reaches `main` — PR opened, PR merged, `main` up to date — without them
saying `push`, `pr` or `merge`. **`push` exists for the times they want it
*now*; autoship is the default path, and it is silent.**

> ⚠️ The failure this replaces: the agent finishes a note, opens nothing, and
> ends its turn with "say `push` when you want this shipped." The user reads
> "done," walks away believing it's live, and comes back twenty minutes later
> to a chat that was waiting on a word. **Never end a turn with the queue
> shippable and nothing armed.**

---

## The quiet window

Autoship is a **2-minute quiet window**, not an instant push. The window is
what keeps one PR per shipment instead of one PR per note: notes dropped
during it join the same batch.

**Arm it when the queue goes quiet** — i.e. all of:

- at least one note is `[c]` (committed, unshipped), and
- nothing is `[~]` in progress and nothing `[ ]` is queued for you to start
  next, and
- nothing is blocked *on the shipment itself* (a cherry-pick conflict you
  stopped on, broken `gh` auth, an unanswered `[!]` about the work you'd ship).

Arming is two things — a line in your reply and a real timer:

1. **End the reply with the window**, one line, stated not asked:
   ```
   🚀 landing in 2 min — say `hold` to stop, or drop another note and it rides along
   ```
2. **Arm the timer** as a backgrounded sleep, which re-invokes you when it
   elapses:
   ```
   Bash(command: "sleep 120", run_in_background: true,
        description: "rapid autoship window for <slug>")
   ```
   Never foreground-sleep (it's blocked) and never poll in a loop. One timer
   per session, ever — if one is already armed, don't arm a second.
3. **Record it in the doc header** so a compacted context, a fresh agent, and
   the `autoship-arm` hook all know a shipment is pending. The timestamp is a
   full ISO datetime — the hook parses it to tell a counting-down window from
   one whose timer never came back:
   ```
   **Autoship:** armed 2026-09-16T14:38:04Z — notes 3, 4 (2m)
   ```

## When the timer fires

The sleep exiting re-invokes you. Don't trust memory — **re-read
`sessions/<slug>.md` from disk first**, then:

- **Still quiet** (same `[c]` set, no `held` marker, nothing new in progress) →
  **run the `push` flow in full** (`references/push.md` steps 1–18: reconcile,
  one combined branch, one PR, merge it, verify from GitHub, mark the notes
  `(merged)`, bring `main` forward, print the headline + status). Skip step 1's
  ack — nobody asked, so there's nothing to acknowledge. Then clear the header
  to `**Autoship:** idle`.
- **A new note arrived** while the window ran → the window is void. Work the
  note. Re-arm when the queue goes quiet again, batch included.
- **`**Autoship:** held`** → do nothing at all. Stay silent; the notes sit
  `[c]` until the user says `push`/`pr`, or says `autoship on`.
- **Nothing `[c]` any more** (a `push` already landed it, a `reverse` discarded
  it) → do nothing, clear the header, stay silent.

A user message arriving while the timer runs **cancels the window implicitly** —
you're in a turn, and whatever they asked for now comes first. Re-arm at the
next quiet point. Their message doesn't need to mention shipping.

## Interventions

| Word | Effect |
|---|---|
| `hold` / `wait` | Cancel the armed window. Write `**Autoship:** held`, leave the notes `[c]`, reply in one line. Autoship stays off for this session until `autoship on`, a `push`, or a `pr`. |
| `push` / `merge` | Don't wait out the window — ship and land now (`references/push.md`). |
| `pr` | Ship now to a PR and leave it open (`pr-only`). Cancels the window. |
| `park <N>` / `drop <N>` | Cancels the window (the batch changed). Re-arm if anything is still `[c]`. |
| `reverse <N>` | Cancels the window and discards the work; nothing ships. |
| `autoship off` | This session stops arming windows entirely — back to explicit `push`. Persist it in the doc header (`**Autoship:** off`). |
| `autoship on` | Re-enable and arm now if the queue is quiet. |
| `autoship 30s` / `autoship 5m` | Change this session's window. Persist as `**Autoship:** on (5m)`. |

Set `"autoship": false` or `"autoshipWindow": "5m"` in `~/.rapid/config.json`
to change the default for every session (see `references/setup.md`). Absent
config, the default is **on, 2 minutes**.

## What autoship will not do unattended

Autoship uses `push`'s guards verbatim — it is the same flow, just unprompted.
It therefore **stops and reports instead of landing** when:

- a cherry-pick conflict needs a human choice (`push` step 6),
- a **required check fails** — it never overrides one,
- **branch protection** or a required review blocks the merge,
- `gh` auth is broken, or the PR can't be created.

In every one of those cases the reply leads with the loud headline
(`⚠️ NOT merged — <reason>`) and the notes stay honest in the doc. Checks still
running is not a block: it queues auto-merge and reports *queued*, which does
land by itself.

And two things it never does: **force-push**, or **reach for an admin
override**.

## The `autoship-arm` hook

Arming is not left to memory. The **`autoship-arm` Stop hook** (install:
`references/setup.md` → the hooks table) **blocks the turn from ending** when
the doc has `[c]` notes and no window is armed, held or disabled — and blocks it
again if an armed window's timer never came back while the notes still sit
`[c]`. It hands back the three ways out (arm it, land it now, or write `held`).
If you see that message, you were about to commit the exact failure at the top
of this file. Arm the window or ship.

## Why a window and not an instant push

- **Batching.** The user's notes arrive in bursts. A 2-minute quiet window
  turns a burst into one PR; an instant push turns it into five.
- **A real chance to intervene.** `hold` beats `reverse` — cheaper to stop a
  shipment than to unpick one.
- **It still feels immediate.** Two minutes after the last note, the work is on
  `main` and the reply says so. The user never types a word.
