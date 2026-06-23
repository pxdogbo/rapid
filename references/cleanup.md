# `wash`, `scrap`, `tidy`, `burn` — cleaning up

Read this file when the user texts one of the bare words `wash` /
`clean`, `scrap`, `tidy`/`reap`, or `burn`. The cleanup ladder:

| Verb | Scope | What survives |
|---|---|---|
| `wash` | this session's notes | slug, doc, worktree, branch, push history |
| `scrap` | this whole session | pushed PRs + remote branches |
| `tidy` | finished sessions in the repo | live/unshipped/parked/blocked sessions + other repos |
| `burn` | every rapid artifact in the repo | merged work on GitHub |

---

## Bare `wash` / `clean`

The two words are aliases for the same action. When the user texts just
one of them (no slash, no other content) while **this chat has a
session**, they want to **empty the session file in place** so the slug,
worktree, branch, and `## Pushes` history all survive for reuse on the
next batch of notes. The normal flow is "we shipped + merged the last
PR, now drop the notes queue so we can keep going on the same
session." If this chat has no session, treat the word as a normal
message — do NOT start a session or wipe anything.

> ⚠️ **Empty in place, do not delete.** `wash` does NOT remove the
> session doc, worktree, or branch. It clears the `## Notes` block and
> leaves everything else intact. Use `burn` if you actually want to
> nuke files.

Behavior:

1. **Read this chat's session doc one last time** so you have its slug,
   worktree path, and `## Notes` contents.
2. **Confirmation pass — look for anything risky before emptying:**
   - **Uncommitted changes** in the worktree (`git -C <worktree>
     status --porcelain` returns output).
   - **In-progress `[~]` notes** — work mid-flight.
   - **Committed-unshipped `[c]` notes** — local commits not yet pushed.
   - **Parked `[p]` notes** — explicitly set aside by the user.
   - **Blocked `[!]` notes** — waiting on something.

   If ANY of these exist, **stop and confirm** in one short message
   listing what's at risk. Example:

   ```
   Before I wash rapid/<slug>:
     - 2 parked notes (#3 logo padding, #7 confirm-modal copy)
     - 1 committed-unshipped (note #5 — local commit on fix/login-glow)
     - uncommitted: src/components/Sidebar.tsx
   Confirm "wash force" to clear anyway, or tell me what to keep.
   ```

   Wait for the user's response. Do NOT proceed silently.

   - If the user replies `wash force` (or `clean force` / a clear "yes
     wipe it" variant): proceed to step 3.
   - If the user replies anything else (e.g. "push first" or "keep the
     parked ones"): handle that request first and re-prompt before
     emptying.

   If none of those conditions trigger (all notes are `[x]` shipped or
   `[-]` dropped, working tree clean), skip straight to step 3 — the
   user picked the verb and there's nothing at risk.
3. **Empty the `## Notes` block** in the session doc. Replace every line
   between `## Notes` and the next heading (or EOF) with a single empty
   line, so the structure looks like:

   ```
   ## Notes

   ## Pushes
   - batch 1 — …
   ```

   Preserve every other section verbatim — the metadata header
   (`**Started:**`, `**Surface:**`, `**Repo:**`, `**Worktree:**`,
   `**Branch:**`) and the entire `## Pushes` history block stay
   untouched. `link` should still resolve past PRs after a wash.
4. **Leave the slug, worktree, and branch alone.** No git operations,
   no file deletions. The same worktree is ready for the next note.
5. **Reply in one line**: `Washed rapid/<slug> — notes cleared, worktree
   still at <path>. Drop new notes anytime.` Then stop — no recap, no
   summary, no work.
6. **Do nothing else.** Do not start a new session, do not push, do not
   pre-empt the next note. The user will drive.

What happens next:

- **Next message is a drive-by note**: this chat still has the same
  session bound, so append it as note 1 of the new batch and proceed
  normally. The doc is empty but the slug is still ours.
- **Next message is `/rapid <text>`**: the start flow fires. Since
  `sessions/` now contains an empty doc (this chat's just-washed one),
  the empty-session reuse scan will see it as reusable and rebind it.
  Net effect: same session, new first note. Do not create another doc.
- **No follow-up arrives**: the washed doc sits in `sessions/` as a
  reusable shell. Future `/rapid` invocations (this chat or another)
  may adopt it via empty-session reuse.

Edge cases:
- **No session in this chat when the word arrives**: normal message —
  do nothing rapid-related.
- **Worktree path no longer exists** (user deleted it manually): empty
  the notes block anyway and update `**Worktree:**` to `n/a` so the
  doc reflects reality. Mention it in the reply.
- **`## Notes` heading missing entirely** (malformed doc): re-emit the
  template skeleton (notes + pushes blocks) and proceed.
- **Confirmation refused**: do nothing destructive. The session
  continues unchanged.

---

## Bare `scrap`

When the user texts just the word `scrap` (no slash, no other content)
while **this chat has a session**, they want this **one session**
deleted — doc, worktree, and local branch — gone. Unlike `wash` (which
empties in place to keep the slug usable) and unlike `burn` (which nukes
every rapid session in the repo), `scrap` is a single-session delete.
The normal flow is "this whole session was a wash, throw it out and
I'll start fresh from `/rapid` next time." If this chat has no session,
treat as a normal message.

> ⚠️ **Destructive for local-only work.** Worktree + local branch
> deletion happens via `-D` / `--force` — anything not pushed is gone.
> Pushed PRs and remote branches are left alone (use `burn` if you
> want those gone too).

Behavior:

1. **Read this chat's session doc** to capture its slug, worktree
   path, and the branches it tracks (the session branch
   `rapid/<slug>` plus every `branch: <name>` recorded under notes).
2. **Risk pass — same checks as `wash`, plus the worktree:**
   - **Uncommitted changes** in the worktree (`git -C <worktree>
     status --porcelain`).
   - **Unshipped commits** on session-owned branches — decide by **PR
     state, NOT ancestry.** A squash/rebase-merged branch reads as ahead
     of `origin/main` (`rev-list origin/main..HEAD` non-zero) yet is fully
     shipped, so never use `rev-list` / `merge-base --is-ancestor` here. A
     branch is unshipped only when `gh pr list --head <branch> --state all
     --json state --jq '.[0].state'` is empty or OPEN **and** it has
     commits beyond its `origin/<branch>` tip (or no remote ref at all).
   - **In-progress `[~]`, committed-unshipped `[c]`, parked `[p]`,
     blocked `[!]`** notes.

   If anything is at risk, **stop and confirm**:

   ```
   Before I scrap rapid/<slug>:
     - 1 parked note (#3 logo padding)
     - 2 committed-unshipped (fix/login-glow, feat/avatar-size — local only)
     - uncommitted: src/Sidebar.tsx
   Confirm "scrap force" to delete anyway, or push first.
   ```

   Wait. Proceed only on `scrap force` / clear "yes wipe it." Otherwise
   treat as cancelled.

   If nothing is at risk (everything pushed, no in-flight work), skip
   confirmation — the user picked the verb.
3. **Remove the worktree** (skip if doc-only): `git -C <repo-root>
   worktree remove <worktree-path>` — add `--force` if confirmation
   was needed for a dirty tree. If the chat's cwd is the worktree,
   `cd <repo-root>` first.
4. **Delete the session branch and any note branches** that have no
   remote ref (or whose PRs are merged/closed) with `git -C
   <repo-root> branch -D <branch>`. **Leave branches whose PRs are
   open** alone — `scrap` does not touch remote state. List those in
   the reply so the user knows they're still around.
5. **Delete the doc**: `rm "~/.rapid/sessions/<slug>.md"`.
   Do NOT move to archive — scrap is delete, not done.
6. **Clear this chat's slug binding** in conversation context.
7. **Reply in one line**, mentioning anything left behind:
   - Clean case: `Scrapped rapid/<slug> (worktree + branch + doc). Standing by.`
   - With surviving open-PR branches: `Scrapped rapid/<slug> (worktree + doc deleted). Left these branches with open PRs alone: <list>. Standing by.`
8. **Stop.** No new session, no recap, no work. The user explicitly
   chose `scrap`.

What happens next:

- **Next message is `/rapid <text>`**: the start flow fires — the
  empty-session scan won't find the scrapped doc (it's gone), so a
  fresh session is created.
- **Next message is a drive-by note**: this chat has no session
  anymore — do NOT silently start one. Treat the message as a
  normal request.

Edge cases:
- **No session in this chat when `scrap` arrives**: treat as a
  normal message — do nothing.
- **Worktree already deleted manually**: skip step 3.
- **Branch deletion fails** (currently checked out in main checkout):
  `cd <repo-root>`, `git checkout main`, retry. Don't guess further.

---

## Bare `tidy` / `reap`

When the user texts just `tidy` (or `reap`) — no slash, no other content —
**run the reap sweep on demand, right now, for the CURRENT repo**, and report
what it did. It is the safe garbage-collection defined in SKILL.md (**The reap
sweep**) — the same sweep the menu's **Cleanup** option runs. As of 1.9.0
cleanup is never automatic: `tidy` (or picking Cleanup from the start menu) is
how it runs, and it always reports what it found. It needs no session in this
chat.

`tidy` is the gentle middle of the cleanup ladder: it removes ONLY sessions
that are **finished** (shipped/safe by PR state) and never touches live,
unshipped, parked, blocked, or `**Handoff:** pending` sessions, the main
checkout, other repos, or `config.json`. To wipe *everything* for the repo
regardless of state, that's `burn`.

Behavior:

1. **Resolve the current repo** (`git rev-parse --show-toplevel`). Not in a
   repo → reply `tidy needs a git repo — cd into one first.` and stop.
2. **Run the reap sweep** (SKILL.md "The reap sweep"): batch all PR states in
   one `gh pr list --state all --limit 300 --json number,headRefName,state`,
   then for each in-scope **finished** doc remove its worktree, delete its
   merged/closed branches (by EXACT ref name), and `rm` the doc. Decide
   "shipped" by PR state, never ancestry; skip anything at risk (uncommitted,
   parked, blocked, unshipped, or hand-off-pending). Then `git worktree prune`
   and fast-forward a clean local `main`. The once-daily version check rides
   along (see `references/setup.md`).
3. **Reply with a one-line summary**:
   - Reaped something: `Tidied <repo>: reaped 3 finished sessions (sonic-jet,
     nimble-sub, brisk-tram), deleted 5 branches; fast-forwarded main.`
   - Nothing to do: `Nothing to tidy — every session for <repo> is live or
     unshipped.`
4. **No confirmation, no force.** Unlike `burn`, `tidy` removes only finished,
   shipped work, so it runs without a prompt. The at-risk skip rules keep
   anything borderline; nothing live, parked, or unshipped is ever touched.

---

## Bare `burn`

When the user texts just the word `burn` (no slash, no other content),
**nuke every rapid artifact tied to the CURRENT repo** — session docs
(active + archived), worktrees, local `rapid/*` branches, and any
pushed remote branches whose PRs are merged or closed. This is a
cross-session reset **of the current project only**. It does NOT require
an active session in this chat.

> 🛑 **`burn` is STRICTLY scoped to the current repo — never other
> projects.** Resolve the repo root from cwd first, then touch ONLY
> artifacts that belong to it: session docs whose `**Repo:**` header
> equals that root, worktrees under `~/worktrees/<this-repo-name>/`, and
> `rapid/*` branches in this repo's clone. Sessions for other repos
> (different `**Repo:**` header) and their worktrees/branches are
> off-limits — even though they live in the same `~/.rapid/`
> and `~/worktrees/` trees. When in doubt, exclude.

> ⚠️ **Destructive and irreversible for local-only work.** Pushed +
> merged work is safe on GitHub. Pushed-but-open PRs prompt for
> confirmation. Local-only branches and uncommitted work are gone.

Behavior:

1. **Resolve the current repo** from cwd (`git rev-parse --show-toplevel`).
   If cwd is not in a git repo, reply `burn requires a git repo — cd
   into one first.` and stop.
2. **Inventory everything that would be deleted**, scoped to this repo:
   - **Session docs** in `~/.rapid/sessions/` and
     `~/.rapid/sessions/archive/` whose `**Repo:**` header
     matches the resolved repo root.
   - **Worktrees** under `~/worktrees/<repo-name>/` — but ONLY those
     checked out to a `rapid/*` branch or recorded as a session worktree
     in an in-scope doc. **Do NOT remove worktrees parked there on a
     non-rapid branch** (e.g. a `feat/*` / `fix/*` feature branch someone
     is using); leave those and their branches alone.
   - **Local branches** matching `rapid/*` plus every `branch: <name>`
     recorded under `## Notes` in the in-scope session docs.
   - **Remote branches** matching the same set that have an upstream.
3. **Risk pass — collect anything at risk before deleting**:
   - **Uncommitted changes** in any in-scope worktree.
   - **Unshipped commits** on in-scope branches — judged by **PR state,
     not ancestry** (squash/rebase merges read as ahead of `main` but are
     shipped; check `gh pr list --head <branch>` for MERGED/CLOSED). Flag a
     branch only if it has no merged/closed PR AND has commits beyond its
     remote tip. When deleting remote branches, exclude any keep-list by
     EXACT fully-qualified ref name, never a bare suffix.
   - **Parked notes** (`[p]`) in any active or archived in-scope doc.
   - **Open PRs** on in-scope remote branches (via `gh pr list --head
     <branch> --state open --json number,title,url`).
4. **Confirm before doing anything destructive.** Reply with the
   inventory + risk summary:

   ```
   burn — <repo>

   Would delete:
     - <N> session docs (<M> active, <K> archived)
     - <N> worktrees under ~/worktrees/<repo>/
     - <N> local branches (rapid/<slug>, fix/foo, …)
     - <N> remote branches with merged/closed PRs

   ⚠️ At risk:
     - <N> parked notes across <M> docs
     - <N> uncommitted file(s) in worktree <slug>
     - <N> open PRs (would be closed when their branch is deleted):
       - <branch> → PR #N "<title>"

   Confirm "burn force" to proceed, or tell me what to keep.
   ```

   Wait for the user. Do NOT proceed silently. If nothing is at risk
   (no parked, no uncommitted, no unpushed, no open PRs), still summarize
   what would be deleted and require a `burn confirm` / `burn force`
   / clear "yes" — `burn` is too big to run silently.
5. **On confirmation, delete in this order:**
   a. **Remote branches** with merged/closed PRs: `git push origin
      --delete <branch>` one at a time.
   b. **Remote branches** with open PRs (only if user opted in):
      `git push origin --delete <branch>` — closes the PR.
   c. **Worktrees**: `git worktree remove --force <path>` for each
      under `~/worktrees/<repo>/`. Then `rm -rf
      ~/worktrees/<repo>/` to clear the parent dir.
   d. **Local branches**: `git branch -D <branch>` for each in scope.
      If the current HEAD of the main checkout is on one of them,
      `git checkout main` first.
   e. **Session docs**: `rm` each in-scope `.md` in `sessions/` and
      `sessions/archive/`.
6. **Reply with a compact post-mortem**:

   ```
   burn — <repo> done

   Deleted: <N> docs, <N> worktrees, <N> local branches, <N> remote branches
   Skipped: <list, if user opted out of any group>
   ```

7. **Do not touch**:
   - `origin/main` or the repo's default branch
   - Session docs from **other repos** (filter by `**Repo:**` header)
   - Branches not traceable to a rapid session
   - The user's main checkout — `burn` never operates on the primary
     working tree
   - `~/.rapid/config.json` — setup survives a burn

Rules:
- **Confirmation is mandatory.** Never auto-burn, even on an empty repo.
  The word is too final.
- **Merged PRs are safe to lose.** GitHub keeps the PR record.
- **Open PRs need explicit opt-in.** Deleting their branch closes them,
  which is irreversible from the skill's side.
- **`burn` does not push.** If the user wants in-flight work shipped
  first, they should `push` before burning.
