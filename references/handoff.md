# `handoff` — hand a session, a note, or a plan to a fresh chat

Read this when the user invokes `/rapid handoff …` or `/rapid start <slug>`.

| Invocation | Side | What it does |
|---|---|---|
| `/rapid handoff [this session \| <note N> \| <description>]` | originating chat | Seed a NEW session doc holding the full instructions, then hand back the `/rapid start <slug>` line. |
| `/rapid start <slug>` (a.k.a. `/rapid resume <slug>`) | fresh chat | Adopt that session: read its plan, make its worktree + branch, work it independently. |

A **hand-off** takes one scoped chunk of work — the whole current session, a
single note, or a task you describe — and turns it into its own standalone rapid
session that a DIFFERENT chat picks up and runs on its own branch. One plan, one
chat. (To just *talk* with another live agent instead of handing off a task, use
`collab` — see `references/collab.md`.)

⚠️ A hand-off is NOT a loose markdown file. A plan written to a random
`~/.rapid/<name>-plan.md` is owned by nobody — the adopting chat has no doc of
its own, so it writes its status back into YOUR session doc and the two clobber
each other. Always seed a real session.

---

## `/rapid handoff [this session | <note N> | <description>]` (originating chat)

Decide WHAT is being handed off from the argument:
- **`this session`** (or no argument) — the current session's open work (its
  `## Notes` + the context needed to act on them).
- **`<note N>`** (e.g. `handoff 3`) — just that one note, lifted into its own session.
- **`<description>`** — a task you scope on the spot (write the plan yourself).

Then:
1. Generate a fresh slug (Step 2b naming). Do NOT create a worktree yet.
2. Write a NEW session doc `~/.rapid/sessions/<slug>.md` (normal template) with
   header `**Handoff:** pending` and `**Repo:**` set to the target repo. Put the
   FULL instructions under `## Notes` (as `[ ]` notes and/or a plan body) plus
   all context the adopting chat needs to be self-sufficient — it will NOT see
   this chat's history.
3. Leave `**Worktree:**` / `**Branch:**` as `n/a (created on adopt)` — the
   adopting chat cuts the branch off the latest `origin/main` when it starts.
4. If you handed off a note from this session, mark that note `[p]` here
   (`handed off → rapid/<slug>`) so it isn't worked twice.
5. **ALWAYS end your reply with the copy-paste adopt command** — the user opens
   it in a fresh chat, so never make them hunt for it:
   ```
   Hand-off session rapid/<slug> ready (~/.rapid/sessions/<slug>.md).
   In a NEW chat, paste:  /rapid start <slug>
   It works in its own branch + doc and never touches this one.
   ```

---

## `/rapid start <slug>` — adopt it (fresh chat)

`/rapid start <slug>` / `/rapid resume <slug>` binds this chat to the hand-off
session. On adopt:
1. Read the doc. If its header is `**Handoff:** pending`, this is a fresh hand-off.
2. Flip the header to `**Handoff:** adopted <ISO> by this chat`.
3. Create the worktree + `rapid/<slug>` branch off `origin/main` (the Step 2b
   worktree step) — it had none.
4. Work it as an ordinary session: own notes, own `push`, own PRs. Write progress
   ONLY to this doc.

---

## Rules
- A hand-off session is owned by exactly ONE chat at a time (whoever adopted it).
  Two chats are never in the same session doc — never write another chat's doc to
  report progress (see SKILL Rules).
- A `**Handoff:** pending` doc is never auto-reaped and never reused-as-empty
  (it's a seeded plan waiting for a chat) — see SKILL Step 2·GC and Step 2a.
- Doc-only seed; the branch is born on adopt, off the latest `origin/main`.
- `wash` keeps a `**Handoff:**` header; `wax` leaves the seeded plan alone.
