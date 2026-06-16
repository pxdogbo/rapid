# `push` and `carpool` — shipping notes

Read this file when the user texts the bare word `push` or `carpool`
mid-session.

---

## Bare `push`

When the user texts just the word `push` (no slash, no other content) while
**this chat has a session**, this is a *deferred* ship instruction: finish
the current work first, then **roll every committed-but-unshipped `[c]`
note into a SINGLE combined PR and stop at PR-open**. `push` does NOT
auto-merge to `main`; the user merges via the GitHub UI when they're
ready. If this chat has no session, ignore — it's a normal message.

> ⚠️ **One PR per `push`, not one PR per note.** Each `push` = one
> consolidated branch + one combined PR covering everything `[c]` since
> the previous `push`. Per-note branches still exist locally so individual
> work is bisectable, but they ship together. The user does not want their
> GitHub PR list flooded with 8 PRs every time they say `push`.

> ⚠️ **PRs are sealed once opened — except via explicit `carpool`.** Once a
> `push` opens PR #N, never push additional commits to that PR on your own
> initiative — not from a follow-up `push`, not from a drive-by edit. New
> `[c]` notes accumulate locally until the next `push`, which cuts a
> *fresh* combined branch and opens a *fresh* PR. The batch number
> (`rapid/<slug>-batch-1`, `-batch-2`, …) increments every push so the
> boundary is loud. The ONE sanctioned way to amend an open PR is the
> user texting `carpool` (see below) — that is them explicitly asking for
> it. Anything short of that, treat the PR as closed-for-edits.

> 🚢 **Fleet lead with a synced set — one PR per assignment, not a
> combined branch.** If this session is a fleet **lead** (`**Fleet:**
> lead`) that has run `fleet sync` (roster rows marked `synced`), `push`
> ships those member branches directly: `git push origin
> rapid/<member-slug>` + `gh pr create --head rapid/<member-slug>` for each,
> one PR per assignment. Do NOT combine them — they're file-disjoint and
> mergeable on their own. See `references/fleet.md`. Everything below is
> the normal note-batching path for a non-fleet session.

Behavior:

1. **Acknowledge in one line**, e.g. `Got it — finishing note 4, then opening one PR for the batch.`
2. **Complete the current `[~]` note** before doing anything git-related.
   Don't drop or rush it. If there's no in-progress note, skip to step 3.
3. **Commit the current note's work** on its own branch (follow the normal
   commit protocol from the system prompt — never `--no-verify`, write a
   real message, ask if anything looks risky). Mark the note `[c]`
   (committed, awaiting push). Do NOT mark it `[x]` yet.
4. **Collect the notes to ship.** Walk the session doc and find every
   `[c]` note (committed locally, never pushed). Also include any `[~]`
   note from step 3 that was just committed. If none exist, reply
   `Nothing new to push.` and stop.
5. **Create the combined branch.** Pick a name like
   `rapid/<slug>-batch-<N>` (where `<N>` is the count of prior `## Pushes`
   sections + 1, e.g. `rapid/turbo-kart-batch-1`). The branch name MUST
   be new — never reuse a previous batch's branch. Run:
   ```
   git fetch origin main
   git checkout -B rapid/<slug>-batch-<N> origin/main
   ```
   Then **cherry-pick each note branch's commits** in note order:
   ```
   git cherry-pick <note-branch-1>
   git cherry-pick <note-branch-2>
   ...
   ```
   **If a cherry-pick conflicts**, abort the cherry-pick and report —
   do NOT resolve blindly. Name the colliding notes and offer the three
   ways out:
   ```
   Conflict while batching: note 2 (rapid/<slug>-avatar-size) and note 5
   (rapid/<slug>-sidebar-spacing) both changed src/Sidebar.tsx.
   Options:
     1. I resolve it now (I'll show you the resolution before continuing)
     2. drop note 5 from this batch — it ships on the next push
     3. ship them as two separate PRs
   ```
   Wait for the user's pick. If multiple batch notes touched the same
   file but merged **cleanly**, no stop needed — just add a one-line
   heads-up to the final summary, e.g. `notes 2 and 5 both touched
   Sidebar.tsx — merged clean.`
6. **Push the combined branch** with `git push -u origin
   rapid/<slug>-batch-<N>`. **Never force-push** without explicit user
   confirmation.
7. **Open ONE PR**. Prefer `gh pr create`; if it fails with a GraphQL
   error (the cli sometimes can't resolve repos in worktrees), fall back
   to `gh api -X POST 'repos/<owner>/<repo>/pulls'` with explicit
   `head=<owner>:<branch>` and `base=main`.
   - Title: short umbrella summary, e.g.
     `rapid/<slug> batch <N>: <N> fixes (lyrics ops, accent slider, …)`,
     under 70 chars.
   - Body: a Summary section listing **one bullet per note** (the note's
     committed outcome line, with its branch name and any relevant link),
     and a Test plan section combining each note's verification steps.
   - If `gh` auth is broken, push but skip PR creation; tell the user
     to run `gh auth login` and offer to retry. Stop here — without a PR
     the work isn't shipped, so do NOT flip notes to `[x]`.
8. **Flip the shipped notes from `[c]` to `[x]`** in the session doc. PR
   open is the licensing event; merge is the user's call and out of scope.
   **Always record the PR URL under each flipped note** — this is required,
   not optional. Format: `→ PR #<N> <url>` on its own indented line so the
   user can click straight to the PR from the session doc.
9. **Record the push** in the session doc under a `## Pushes` heading
   (one entry per `push` invocation, listing the rolled-up notes):
   ```
   ## Pushes
   - batch 1 — 2026-04-28 02:06 → rapid/<slug>-batch-1 → PR #123 (open)
     - rapid/<slug>-lyrics-block-ops, rapid/<slug>-accent-hue-slider, rapid/<slug>-confirm-modal-glass, …
   ```
10. **Reply with a one-block summary**: combined branch name, PR URL, and
    a bullet list of which notes shipped. Mention that the user merges
    via the GitHub UI when ready.

**Per-note branches stay local** — don't push them as standalone branches
unless the user explicitly asks (`push <branch-name>` or "push them
separately"). If a per-note branch was ALREADY pushed in an earlier
session/turn (has a stale `Pushes` entry in the doc, or a remote ref), skip
it from the combined cherry-pick — its commit will arrive via that
branch's existing PR — and surface it in the summary.

Edge cases:
- **Doc-only session** (no worktree, all work happened on whatever branch
  the user was on): push the current branch and open one PR for it. Same
  PR-open semantics — do not auto-merge.
- **Push fails** (non-fast-forward, hook failure, auth): stop, report which
  branch and why, do not retry destructively. Wait for instructions.
- **Uncommitted changes unrelated to the current note**: do not stage them.
  Mention them in the summary so the user can decide.
- **Detached HEAD or unclear branch state**: do not guess — ask.
- **Existing PR for a note branch**: `gh pr create` will fail with a
  conflict — detect that, parse the existing PR URL from `gh pr view
  --json url`, and report it instead of erroring.

---

## Bare `carpool`

When the user texts just the word `carpool` (no slash, no other content)
while **this chat has a session**, they want the latest work **added to
the most recent still-open PR from this session** instead of cutting a
new branch + PR. The typical flow: a PR is open but unmerged, the user
asks for a follow-up change, and wants it to ride along on that PR.
`carpool` IS the explicit user instruction that unseals the PR — it is
the only path that may push commits onto an already-opened PR.

Behavior:

1. **Find the target PR.** Read the most recent entry in the session
   doc's `## Pushes` block and verify its PR is still open:
   `gh pr view <PR#> --json state`. If it's merged or closed — or no
   `## Pushes` entry exists — say so in one line and fall back to a
   normal `push` (new batch branch + new PR).
2. **Complete and commit the current `[~]` note** on its own branch
   (same as `push` steps 2–3). Mark it `[c]`.
3. **Collect every unshipped `[c]` note** — same as `push` step 4. If
   none, reply `Nothing new to carpool.` and stop.
4. **Cherry-pick onto the existing batch branch.** Check out the target
   PR's branch (`rapid/<slug>-batch-<N>`), cherry-pick each new note
   branch's commits in note order, and push (a normal push — never
   force). Conflicts → same stop-and-ask flow as `push` step 5.
5. **Flip the carpooled notes `[c]` → `[x]`** with the SAME PR URL as
   the target PR (`→ PR #<N> <url>` under each note).
6. **Append to the batch's `## Pushes` entry** rather than creating a
   new one:
   ```
   - batch 1 — … → PR #123 (open)
     - rapid/<slug>-lyrics-line-block-ops, …
     - + carpooled [<date>]: rapid/<slug>-header-copy, rapid/<slug>-footer-link
   ```
7. **Reply in one block**: which notes were added, the PR URL, and a
   reminder that the PR now contains the extra commits.

Rules:
- **Carpool never creates a PR.** No open PR in this session → fall back
  to `push` and say so.
- **Carpool is per-invocation consent.** It unseals the PR for this one
  batch of notes only; afterwards the PR is sealed again until the next
  explicit `carpool`.
