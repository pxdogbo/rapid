# `fleet` — collaborate with other agents on one session's work

Read this file when the user invokes any fleet command:

| Invocation | Side | What it does |
|---|---|---|
| `/rapid fleet <N>` / "start a fleet of N" | lead | Split this session's work into N file-disjoint assignments, post them, emit the join command. |
| `/rapid fleet join <lead-slug>` | member (fresh chat) | Self-claim an open assignment, spin up your own session, start working. |
| `fleet` (bare word, mid-session) | either | Render fleet status; re-read the doc for new messages. |
| `/rapid fleet sync` | lead | Gather every member's committed branch into the lead's push set and report readiness — so one `push` to the lead ships them all (one PR per assignment), no chat-hopping. |
| `/rapid fleet end` | lead | Disband: final summary, mark the fleet closed. |

A **fleet** is several agents, in separate chats the user opens by hand,
working one session's backlog in parallel. The chat that starts the fleet
is the **lead**; its session doc becomes the war room. Every other chat is
a **member** that runs its own independent rapid session (own slug,
worktree, branch, PRs) and reports back to the lead's doc *only when
needed*.

---

## The constraint that shapes everything

There is **no live channel** between chats. A markdown file is the only
shared medium, and writing to it cannot wake a sleeping chat. So:

- **The user is the relay.** They flip between chats; the protocol leans
  on that instead of pretending messages auto-deliver. When the user says
  "check the fleet," re-read the doc.
- **The lead re-reads its doc at checkpoints** — on the bare word `fleet`,
  between its own actions, on user prod. It never assumes it has seen the
  latest.
- **The channel is quiet by design.** Members post on exactly four events:
  **claimed**, **blocked / need-decision**, **shipped (+ PR)**, **handoff**.
  No "still working" chatter. This keeps the doc readable and write
  contention near zero.

---

## The `## Fleet` block (lives in the lead's session doc)

```markdown
## Fleet
**Role:** lead
**Status:** active            <!-- active | disbanded <ISO> -->

### Assignments
| id | task | owns (paths) | status | member | PR |
|----|------|--------------|--------|--------|----|
| a1 | sidebar redesign | src/sidebar/** | open | — | — |
| a2 | export + toasts | src/export/**, src/toast/** | claimed | rapid/nitro-jet | — |
| a3 | onboarding copy | src/onboarding/** | shipped | rapid/zippy-luge | #43 |

### Log
- [14:02] lead: fleet of 3 opened, 3 assignments posted
- [14:09] rapid/nitro-jet: claimed a2
- [14:31] rapid/zippy-luge: shipped a3 → PR #43
- [14:40] rapid/nitro-jet: need src/shared/types.ts (a1 owns) — handoff?
```

`status` per assignment: `open` → `claimed` → `working` → `synced` →
`shipped` (or `blocked`). `synced` means `fleet sync` has staged the
member's committed branch and a `push` will ship it (see below). These are
**assignment statuses in the roster table** — a separate vocabulary from
the `## Notes` status boxes (`[ ]` `[~]` `[c]` `[x]` `[!]` `[p]` `[-]`),
which fleet does not change. The **Log is append-only** — never rewrite
past lines.

A member's own session doc carries one header line linking it back:
`**Fleet:** member of rapid/<lead-slug>, assignment a2`.

---

## Lead: `/rapid fleet <N>` / "start a fleet of N"

The lead chat must already have a session with work to divide (a queue, or
a scope the user just described). If it has no session, reply: `Start a
session with the work first (/rapid <note>), then "start a fleet of N".`

1. **Partition into N assignments by disjoint file-ownership.** This is the
   whole game: parallel agents that edit the same file collide. Group the
   queue notes + a scan of the repo so each assignment **owns a disjoint
   set of paths**. If two pieces of work must touch the same file, put them
   in the **same** assignment (serialize) — never split a file across two
   members. Balance the N assignments by rough effort.
2. **Write the `## Fleet` block** into the lead's doc: the roster table
   (all assignments `open`, member/PR blank) and a Log seeded with one
   opening line. Add `**Fleet:** lead` to the doc's metadata header.
3. **Emit the single join command** for the user to paste into each new
   chat, and say how many to open:
   ```
   Fleet of 3 ready. Open 3 new chats and paste this into each:

       /rapid fleet join <lead-slug>

   Each agent claims its own assignment and ships its own PRs.
   I'll coordinate from here — say "fleet" anytime for status.
   ```
4. **Switch to coordinator mode.** The lead does NOT go heads-down on an
   assignment. It tracks the roster, answers `need:` / handoff requests,
   and reconciles PR state. (It may take one slice itself only if the user
   asks and capacity is free — but its default job is coordination.)

---

## Member: `/rapid fleet join <lead-slug>` (in a fresh chat)

1. **Read the lead's doc** at `~/.rapid/sessions/<lead-slug>.md`. No
   `## Fleet` block, or status `disbanded` → reply `No active fleet for
   <lead-slug>.` and stop.
2. **Generate this chat's member slug** (normal slug-gen, Step 2b) — but do
   NOT build the worktree yet.
3. **Self-claim with read-after-write** (handles two agents racing for one
   slot, since there is no lock):
   a. Pick the **first assignment whose status is `open`**. If none →
      reply `Fleet fully claimed — nothing open. Want me to help the lead
      or open a fresh session?` and stop (no worktree created).
   b. Write your member slug + `claimed` + timestamp into that row
      (read-modify-write the whole table), and append a Log line
      `[HH:MM] rapid/<member-slug>: claimed <id>`.
   c. **Re-read the lead doc immediately.** If the row still shows your
      slug → claim confirmed. If a different slug is there (it raced and
      won the last write) → go back to (a) and take the next `open` one.
      If the row somehow shows two slugs, the **lexicographically smaller
      slug keeps it**; the other re-claims.
4. **Now create this chat's own session** (Step 2: reuse-or-create), on its
   own worktree + `rapid/<member-slug>` branch. Stamp the header with
   `**Fleet:** member of rapid/<lead-slug>, assignment <id>`.
5. **Seed `## Notes`** from the assignment's task (split into notes if it's
   several things). Flip the lead row to `working` when you start.
6. **Work as a normal rapid session** — own branches off `origin/main`, own
   `push`, all the usual rules. The assignment's `owns:` paths are your
   lane; stay in it.

---

## Member: posting back (only the four events)

Re-read the lead doc, then **append** (never rewrite history):

- **claimed** — on join (done in step 3 above).
- **blocked / need-decision** — `[HH:MM] rapid/<slug>: blocked — <why>`,
  and set your row to `blocked`.
- **need a file outside your lane** — do NOT edit it. Post `[HH:MM]
  rapid/<slug>: need <path> (<owner-id> owns) — handoff?`, set your row
  `blocked`, and keep working the rest of your lane if you can.
- **shipped** — after `push`: `[HH:MM] rapid/<slug>: shipped <id> → PR
  #<n>`, set your row `shipped` and fill its PR cell.
- **handoff** — handing your assignment (or a sub-piece) back: post it and
  set your row `open` (or `blocked`) so the lead can reassign.

Update only **your own** assignment row and append to the Log. Leave other
rows and the metadata to the lead.

---

## Conflict protocol (two lanes need the same file)

The lead resolves it on its next read of a `need:` line — either:
- **Reassign the path** to the requester and narrow the owner's `owns:`
  scope (write both rows, log the decision), or
- **Sequence it**: tell the requester to wait until the owner ships, then
  rebase onto that PR.

The lead writes the decision to the Log and updates the `owns:` cells; the
user relays it to the affected chats. Members never silently cross lanes.

---

## Bare `fleet` (status)

Re-read the doc first (per the no-live-channel rule), then render:

- **If this chat is the lead:** the roster table + the last several Log
  lines + a one-line tally (`3 members · 1 shipped · 1 working · 1
  blocked`). **Call out loudly** any `need:` / handoff line awaiting a lead
  decision. Per the skill's verify-before-asserting rule, reconcile
  `shipped` rows with `gh pr view <n> --json state,mergedAt` before
  reporting them merged.
- **If this chat is a member:** your assignment, your status, your PR, and
  any lead directive in the Log addressed to you since your last check.

`fleet` requires this chat to be in a session (lead or member). No session
→ normal message. Never queue `fleet` as a note.

---

## Lead: `/rapid fleet sync`

When the fleet's work is done, the user shouldn't have to visit each member
chat and say `push`. `fleet sync` lets the **lead** ship everyone's work,
because every member worktree shares the **same git repo** as the lead — so
the lead can see and push each `rapid/<member-slug>` branch directly.

> 🔑 **Sync gathers; `push` ships.** Per the skill's core rule (never open
> a PR until the user says `push`), `fleet sync` does NOT open PRs. It
> verifies each member branch is ready and stages it as the lead's push
> set. The user then says `push` to the lead, which opens **one PR per
> assignment**. This is exactly "so I can ask you to push."

Behavior:

1. **Re-read the fleet roster.** For each assignment with a
   `rapid/<member-slug>` branch, find its worktree (`git worktree list
   --porcelain` maps branch → path) and classify it:
   - **Already shipped** — `gh pr list --head rapid/<member-slug> --state
     all --json number,state,url` returns an OPEN/MERGED PR. Record the
     link; nothing to do.
   - **Ready** — has commits beyond `origin/main` (`git rev-list --count
     origin/main..rapid/<member-slug>` > 0), no PR yet, and its worktree is
     clean (`git -C <member-worktree> status --porcelain` empty).
   - **Uncommitted** — worktree has uncommitted changes. The lead **cannot
     see them** (they're in no branch). Flag this member.
   - **Idle** — no commits beyond main, no PR. Member did no work; note it.
2. **Mark each Ready member's row `synced`** in the roster and append one
   log line: `[HH:MM] lead: synced — ready a1,a2,a3 · a4 uncommitted · a5
   already shipped (#41)`.
3. **Report the plan** (do NOT push):
   ```
   fleet sync — turbo-kart

   ready to push (3):  a1 rapid/aero-jet · a2 rapid/nitro-rover · a3 rapid/zippy-luge
   already shipped (1): a5 → PR #41
   ⚠️ uncommitted (1):  a4 rapid/warp-sled — that chat must commit,
                        or say "sync force" and I'll commit it on its behalf

   Say "push" and I'll open one PR per ready assignment.
   ```
4. **`sync force`** (optional, only if the user opts in): for each
   Uncommitted member, `cd` into its worktree and commit on its behalf —
   stage **tracked changes only** (`git add -u`, never `git add -A`: member
   worktrees often hold a symlinked `node_modules`/`.env` that must not be
   committed), within the assignment's `owns:` paths, with a generic
   message (`<assignment>: sync commit on behalf of rapid/<member-slug>`).
   Then mark the row `synced`. Flag clearly that the lead committed for it.

### Then: `push` ships the synced set

When the user says `push` to a lead that has `synced` rows, the lead does
NOT cut a normal combined branch. Instead, for each `synced` member branch:
`git push origin rapid/<member-slug>`, then `gh pr create --head
rapid/<member-slug> --base main` with a title/body from the assignment.
Open **one PR per assignment** (they're file-disjoint, so independently
reviewable and mergeable). Flip each row to `shipped`, fill its PR cell,
and log `[HH:MM] lead: pushed a1 → PR #44`. (See `references/push.md` —
the fleet-lead case.)

---

## Lead: `/rapid fleet end`

1. Re-read the doc; reconcile every member's PR (`gh pr list --head
   <member-branch> --state all`).
2. Render the final fleet summary: each assignment · member · status · PR ·
   merged?.
3. Set the `## Fleet` header `**Status:** disbanded <ISO datetime>`.
4. **Members keep their own sessions** — they `done` / `off` / `wash`
   independently. The lead does NOT archive or touch member docs.
5. The lead's own session continues; the user can `/rapid done` it
   separately.

---

## Interaction with GC, wash, burn

- **A lead doc with an `active` `## Fleet` block is never auto-reaped** (it
  is coordination state, like a parked note). It becomes reapable once the
  fleet is `disbanded` and its own notes are shipped.
- **Member sessions are ordinary sessions** — own `**Repo:**`, own
  worktree — so GC, `wash`, `scrap`, and `burn` treat them exactly like any
  other session.
- `wax` on a lead doc grooms `## Notes` only; it leaves the `## Fleet`
  block (roster + append-only Log) untouched.

---

## Edge cases

- **Lead slug typo on join** → "No active fleet for <slug>" (step 1). Have
  the user copy the exact slug from the lead's reply.
- **All assignments claimed when a member joins** → don't force a claim;
  offer to help the lead or open a standalone session.
- **A member dies / the user closes its chat mid-work** → its row sits at
  `working`. The lead, on `fleet`, flags stale rows; the user can re-open a
  chat and `/rapid fleet join` to re-claim that `id` (set it back to `open`
  first, or claim the still-`working` row the lead reopened).
- **Lead chat lost** → the doc on disk is the source of truth; any chat can
  `/rapid resume <lead-slug>` to take the lead role back (it owns the
  `## Fleet` block again).
