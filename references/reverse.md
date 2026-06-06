# `reverse <N>` / `undo <N>` — rolling back a note

Read this file when the user texts `reverse <N>` or `undo <N>`
mid-session. `reverse` and `undo` are aliases. The user signals this
when you did something wrong, ran in a direction they didn't want, or
the note's outcome turned out to be incorrect. If this chat has no
session, treat as a normal message.

The action depends on how far the note's work has traveled. Walk down
this ladder until one applies:

1. **Note is `[~]` in progress, no commits yet** → discard any
   uncommitted changes in the worktree that belong to this note's
   branch. Run `git -C <worktree> checkout -- .` (or only the relevant
   files if other notes' work is also dirty — ask if unclear). Switch
   the worktree off the note's branch and delete it:
   `git -C <repo-root> branch -D <branch>`. Flip the note to `[ ]`
   pending. Acknowledge: `Reversed note <N>: discarded in-progress work
   on <branch>. Note is back in the queue.`

2. **Note is `[c]` committed locally, not pushed** → delete the note's
   local branch: `git -C <repo-root> branch -D <branch>` (capital `-D`,
   since the work is being thrown away). Confirm there's no remote ref
   first (`git ls-remote --exit-code origin <branch>`); if there IS a
   remote ref the note actually pushed via some other path — drop into
   case 3. Flip the note to `[ ]`. Acknowledge: `Reversed note <N>:
   deleted local branch <branch>. Note is back in the queue.`

3. **Note is `[x]` shipped with an open PR** → this is destructive,
   confirm first. Reply with the PR URL, title, and ask: `Reversing
   note <N> will close PR #<n> and delete remote branch <branch> —
   confirm "reverse force" to proceed.` Wait for explicit confirmation.
   On `reverse force`:
   - `gh pr close <PR#> --delete-branch` (closes PR + deletes remote
     branch in one shot).
   - Delete the local branch if it still exists: `git branch -D <branch>`.
   - Update the doc: flip the note to `[ ]`, remove its `→ PR #<n>` line,
     remove its entry from the `## Pushes` block (or annotate it as
     `(reversed)` so history is preserved).
   - Acknowledge: `Reversed note <N>: closed PR #<n>, deleted <branch>.
     Note is back in the queue.`
   - **If the PR contains OTHER notes too** (a combined batch), closing
     it would un-ship them as well — say so and ask before touching it.

4. **Note is `[x]` and the PR is already merged** → DO NOT
   auto-revert. The change is in `main` and reversing it is a real
   commit on `main`, not a skill operation. Reply: `Note <N> already
   merged in PR #<n>. Need a revert PR on main — I can prep it if you
   confirm, but won't touch main without you saying so.` Wait for
   the user to direct the revert flow.

5. **Note is `[p]` parked, `[!]` blocked, `[ ]` pending, or `[-]`
   dropped** → there is nothing to reverse. Reply: `Note <N> has no
   work to reverse (status: <box>).` Stop.

Rules:
- **Always confirm before touching the remote.** Cases 3 and 4 require
  explicit user confirmation. Case 1 and 2 are local-only and proceed
  on the first invocation.
- **Reverse does not re-drive the work.** It puts the note back in the
  queue as `[ ]`. The user decides whether to retry it, refine the
  spec, or drop it.
- **Reverse is not undo-all.** It operates on one note at a time. If
  the user wants multiple notes reversed they'll issue multiple
  commands.
- **Refinement vs reverse.** If the user just wants the implementation
  tweaked ("make it blue instead", "actually use route X") and the
  underlying spec was right, that's a refinement (fold-in) — not a
  reverse. Save reverse for "this direction was wrong, start over."
