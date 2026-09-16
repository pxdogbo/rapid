# `push`, `pr` and `carpool` — shipping notes

Read this file when the user texts the bare word `push`, `pr`, `merge` or
`carpool` mid-session — and when an **autoship** window elapses
(`references/autoship.md`), which runs the `push` flow below unprompted. That
is the usual way work ships: the user types nothing at all.

> **`push` lands the work.** It batches the queue, opens ONE PR, and then
> merges that PR onto `main` — one word, all the way live. `merge` is an alias
> for it. If you want the PR opened and left for a human to merge, that is the
> separate `pr` verb below. **Never stop at PR-open on a `push` and wait for the
> user to say `merge`** — that is the exact failure this default exists to kill:
> the user walks away believing the work is live while the chat sits waiting on
> a word.

---

## Bare `push`

When the user texts just the word `push` (no slash, no other content) while
**this chat has a session**, this is a *deferred ship-it* instruction: finish
the current work first, then **roll every committed-but-unshipped `[c]` note
into a SINGLE combined PR and land that PR on `main`**. If this chat has no
session, ignore — it's a normal message.

> ⚠️ **One PR per `push`, not one PR per note.** Each `push` = one
> consolidated branch + one combined PR covering everything `[c]` since
> the previous `push`. Per-note branches still exist locally so individual
> work is bisectable, but they ship together. The user does not want their
> GitHub PR list flooded with 8 PRs every time they say `push`.

> ⚠️ **`push` writes to `main`.** It is the one flow in this skill that does
> (along with its `merge` alias). Because the user typed the word, no extra
> confirmation is needed — but every guard in steps 12–16 is mandatory, and the
> merge is never *claimed* without re-reading the PR state from GitHub
> afterwards.

> ⚠️ **PRs are sealed once opened — except via explicit `carpool`.** Once a
> `push` opens PR #N, never push additional commits to that PR on your own
> initiative — not from a follow-up `push`, not from a drive-by edit. New
> `[c]` notes accumulate locally until the next `push`, which cuts a
> *fresh* combined branch and opens a *fresh* PR. The batch number
> (`rapid/<slug>-batch-1`, `-batch-2`, …) increments every push so the
> boundary is loud. The ONE sanctioned way to amend an open PR is the
> user texting `carpool` (see below) — that is them explicitly asking for
> it. Anything short of that, treat the PR as closed-for-edits.

> ⚠️ **No PR opens over an unreconciled queue.** Before you cut the batch
> branch, the doc's `## Notes` must already match what git says is done
> (step 4). A note whose work is finished but still reads `[ ]`/`[~]`
> doesn't just look wrong — it is **excluded from the batch**, so the work
> lands in no PR and nothing in the doc says where it went. The cost is
> paid later by whoever has to open every PR and diff it against the doc to
> learn what actually shipped. Reconcile first, then ship; every note the
> batch touches carries its PR URL before you reply.
>
> 🚢 **Fleet lead with a synced set — one PR per assignment, not a
> combined branch.** If this session is a fleet **lead** (`**Fleet:**
> lead`) that has run `fleet sync` (roster rows marked `synced`), `push`
> ships those member branches directly: `git push origin
> rapid/<member-slug>` + `gh pr create --head rapid/<member-slug>` for each,
> one PR per assignment. Do NOT combine them — they're file-disjoint and
> mergeable on their own, and each one still gets the merge last mile below.
> See `references/fleet.md`. Everything below is the normal note-batching path
> for a non-fleet session.

Behavior:

1. **Acknowledge in one line**, e.g. `Got it — finishing note 4, then opening and landing one PR for the batch.`
2. **Complete the current `[~]` note** before doing anything git-related.
   Don't drop or rush it. If there's no in-progress note, skip to step 3.
3. **Commit the current note's work** on its own branch (follow the normal
   commit protocol from the system prompt — never `--no-verify`, write a
   real message, ask if anything looks risky). Mark the note `[c]`
   (committed, awaiting push). Do NOT mark it `[x]` yet.
4. **Reconcile the queue against git — before you cut anything.** Re-read
   the doc from disk (not from memory; context may have been compacted) and
   walk **every** note, not just the ones you remember working. For each,
   compare its status box to what git actually shows:
   ```
   git branch --list 'rapid/<slug>-*'          # which note branches exist
   git rev-list --count origin/main..<branch>  # does it carry commits?
   git log <branch> --oneline -3               # what did it do?
   ```
   Then fix the box before it can mislead anything downstream:
   - `[ ]` / `[~]` whose branch carries commits → the work is done and the
     doc doesn't say so. Flip to `[c]` and add its `branch:` line if
     missing, so **this batch picks it up**. This is the case that silently
     loses work: an unreconciled note is never collected, so its commits
     ship in no PR at all.
   - `[~]` with no commits anywhere → genuinely still open. Leave it.
   - `[c]` whose branch was already pushed and has a PR → it shipped
     earlier. Flip to `[x]` with that PR's URL now, and keep it out of this
     batch (see the per-note-branch rule below).
   - `[x]` with no `→ PR #` line → find the PR (`gh pr list --head
     <branch> --state all --json number,url`) and add the URL. If no PR
     exists, it isn't shipped — put it back to `[c]`.
   - Work you did this session that never got a note at all → append the
     note now (Step 3), at the status it has actually reached. A commit
     with no note is invisible in exactly the way that matters.
   **Write those fixes to the doc before step 5.** Don't invent completion:
   only flip what git can back up. If the audit changed anything, say so in
   one line in the final summary (`reconciled: note 3 was [~], its branch
   was already committed`).
5. **Collect the notes to ship.** From the reconciled doc, take every `[c]`
   note (committed locally, never pushed) — including anything step 3 or
   step 4 just moved to `[c]`.
   - **Nothing new to ship?** Don't stop there. Look up the most recent
     `## Pushes` entry and, if its PR is still open, **that PR is the merge
     target** — the user is asking you to land work that already reached a PR.
     Skip to step 12 with that PR number. No open PR either → reply
     `Nothing to push.` and stop.
6. **Create the combined branch.** Pick a name like
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
7. **Push the combined branch** with `git push -u origin
   rapid/<slug>-batch-<N>`. **Never force-push** without explicit user
   confirmation.
8. **Open ONE PR**. Prefer `gh pr create`; if it fails with a GraphQL
   error (the cli sometimes can't resolve repos in worktrees), fall back
   to `gh api -X POST 'repos/<owner>/<repo>/pulls'` with explicit
   `head=<owner>:<branch>` and `base=main`.
   - Title: short umbrella summary, e.g.
     `rapid/<slug> batch <N>: <N> fixes (lyrics ops, accent slider, …)`,
     under 70 chars.
   - Body: a Summary section listing **one bullet per note, led by its note
     number** (`- note 3 — <outcome line> (rapid/<slug>-<note>)`), and a
     Test plan section combining each note's verification steps.
   - **End the body with the queue**, so the PR states its own scope and
     nobody has to diff it later to find out:
     ```
     ## Notes in this PR
     3, 4, 7 of rapid/<slug>

     ## Still open after this PR
     - note 5 — footer link (queued)
     - note 8 — blocked: which color token?
     ```
     If nothing is left, write `Queue clear.` — say it explicitly rather
     than omitting the section.
   - If `gh` auth is broken, push but skip PR creation; tell the user
     to run `gh auth login` and offer to retry. Stop here — without a PR
     the work isn't shipped, so do NOT flip notes to `[x]`.
9. **Flip the shipped notes from `[c]` to `[x]`** in the session doc.
   **Every note in the batch gets the PR URL** — this is required, not
   optional. Format: `→ PR #<N> <url>` on its own indented line so the user
   can click straight to the PR from the session doc, and so a later agent
   learns what shipped by reading the doc instead of the PR list. (The
   ` (merged)` suffix comes in step 15, once GitHub confirms it.)
   The whole-queue audit already happened in step 4; if anything drifted
   since (a note you finished while batching), catch it here too — after a
   push, **no note whose work is done may still read `[ ]`, `[~]` or `[c]`**.
   **Also flip the session header `**Pushed:**` field** from `no` to this PR's
   ref (`PR #<N> <url>`; comma-append if the session has opened more than one PR
   over its life). That header is the at-a-glance "this session reached a PR"
   flag a later scan or cleanup keys on before it deletes anything.

   > The **`mark-pushed` hook** (if installed — see `references/setup.md`) already
   > stamps the `**Pushed:**` header and a `## Pushes` entry automatically the
   > moment `gh pr create` succeeds, so this may be done before you get here.
   > It's idempotent — still flip the notes to `[x]` (the hook never touches
   > notes), and if the header/`## Pushes` are already stamped, leave them.
   >
   > The **`reconcile-notes` hook** (same install) reads the queue at PR-open
   > and hands you the exact list of notes still needing a status decision,
   > next to the `gh pr create` result. Treat that list as this step's
   > checklist — but it is a backstop, not the mechanism: steps 4 and 9 are
   > your job whether or not the hook is installed.
10. **Verify the doc from disk before you go on.** Re-read
    `sessions/<slug>.md` — not your own memory of what you just wrote — and
    check three things:
    - every note in this batch is `[x]` and carries `→ PR #<N> <url>`
    - no `[c]` remains that belonged to this batch
    - every remaining open note is open for a stated reason (queued,
      parked, blocked-on-what)
    Anything that fails, fix now. The tally and status render in step 18 are
    counted from **this** read (plus step 15's merge marks).
11. **Record the push** in the session doc under a `## Pushes` heading
    (one entry per `push` invocation, listing the rolled-up notes — note
    numbers as well as branches, so the entry maps to the queue without a
    lookup):
    ```
    ## Pushes
    - batch 1 — 2026-04-28 02:06 → rapid/<slug>-batch-1 → PR #123 (open) — notes 3, 4, 7
      - rapid/<slug>-lyrics-block-ops, rapid/<slug>-accent-hue-slider, rapid/<slug>-confirm-modal-glass, …
    ```
    `(open)` is a placeholder for the next few steps — step 15 turns it into
    `(merged <date>)`.

    *(If the user said `pr` instead of `push`, stop here — see the `pr`
    section below. Everything from step 12 on is the landing half.)*

12. **Verify the PR's real state before touching it** — never from memory:
    ```
    gh pr view <N> --json state,mergedAt,mergeStateStatus,statusCheckRollup
    ```
    - `MERGED` already → say so in one line, skip to step 15 (the doc may
      still be stale). Do not error.
    - `CLOSED` → report it and stop; nothing to merge.
    - `OPEN` → continue.
13. **Merge it**, matching the action to `mergeStateStatus`:
    - `CLEAN` / `HAS_HOOKS` / `UNSTABLE` with no *required* check failing →
      merge now: `gh pr merge <N> --squash --delete-branch`. Squash is the
      default: a rapid batch is one logical shipment, and a squashed batch keeps
      `main` readable. Use `--merge` / `--rebase` only if the user asked or the
      repo forbids squash.
    - `BLOCKED` / checks still running → do **not** poll or hammer. Turn on
      auto-merge instead: `gh pr merge <N> --squash --auto --delete-branch`, and
      say in one line that it lands by itself when the checks pass. Then skip to
      step 17 and report it as *queued to merge*, never as merged.
    - A **required check has failed** → do not merge and do not queue. Report
      which check failed, in plain words, and stop at step 17 with the
      not-landed headline. Fixing it is the next note, not a silent override.
    - `CONFLICTING` / `DIRTY` (`main` moved under the batch) → do **not**
      force-push the open PR. Follow the skill's stale-PR rule: rebase the batch
      onto fresh `origin/main` on a NEW batch branch, open the corrected PR,
      **close the stale one yourself** (`gh pr close <N> --comment "Superseded by
      #<new> — rebased onto main" --delete-branch`), then merge the new one. The
      open-PR list must stay correct without the user reading chat.
    - Blocked by **branch protection / a required review** → report the exact
      reason and stop at step 17. Never reach for an admin override unless the
      user explicitly says to.
14. **Confirm the merge actually landed.** Re-run `gh pr view <N> --json
    state,mergedAt`. `state: MERGED` with a `mergedAt` timestamp is the only
    thing that licenses the word "merged" in your reply — an exit code is not.
    If it didn't land, report what GitHub says and stop.
15. **Record the merge in the doc.**
    - Each note in the batch keeps its `→ PR #<N> <url>` line and gains
      ` (merged)` — so the doc answers *did this reach `main`*, not just *did
      this reach a PR*.
    - The `## Pushes` entry's `(open)` becomes `(merged <YYYY-MM-DD>)`.
    - The header `**Pushed:**` ref gains `(merged)`.
    - Auto-merge queued instead of merged → write `(auto-merge queued)`, not
      `(merged)`. Required check failed or protection blocked it → leave
      `(open)` and add the reason (`(open — CI failing: unit-tests)`). Never
      record an outcome you haven't verified.
16. **Bring `main` forward — both checkouts.** A merged batch that nobody pulled
    means the next note branches off stale code and re-ships what just landed:
    ```
    git -C <worktree> fetch --prune origin main        # so the next note branches off the merge
    git -C <repo-root> fetch --prune origin main
    git -C <repo-root> pull --ff-only                  # only if it's on main and clean
    ```
    Skip the `pull` silently if the primary checkout is on another branch or
    dirty — the `fetch` is the part that matters. Then delete the merged batch
    branch locally (`git branch -D rapid/<slug>-batch-<N>`); `--delete-branch`
    already removed the remote one.
17. **Reply with a one-block summary, and lead with where the work actually
    got to.** The first line is one of exactly three headlines, because this is
    the line the user acts on:
    - **merged** — `✅ merged to main — PR #123 <url>`
    - **queued** — `🕒 queued to merge (checks running) — PR #123 <url>`; it
      lands itself, nothing for the user to do
    - **not landed** — `⚠️ NOT merged — <one-line reason> — PR #123 <url>`,
      and say in the next line what would unblock it
    Then the combined branch name and a bullet list of which notes shipped.
    **Under the headline, state the tally on its own line — `<done> of <total>
    notes done`** (count `[x]` against all real notes, excluding `[-]`
    dropped). This is required on every push. Say `main` is up to date in the
    same block on a merge, so the user knows the work is live and not sitting
    in a branch. **Never let a reply be ambiguous about whether the work is
    live** — no "opened PR #123" as a final word, and never end a `push` by
    asking the user to say `merge`.
18. **Print the session status** right after the summary — every `push` ends
    with a snapshot so the user knows whether you're done or something was
    deferred. Re-read the doc and render the Step 6 review (shipped / done-but-
    unshipped / in progress / queued / parked / blocked — omit empty rows),
    capped with a one-line verdict:
    - everything shipped or dropped → `✅ queue clear — all shipped`
    - anything still open → `⚠️ <N> still open: <breakdown>`, e.g.
      `⚠️ 3 still open: 2 queued, 1 blocked (note 8 — waiting on token)`
    This is non-negotiable on every shipment — autoship, `push`, `pr`,
    `carpool` — the verdict line is the proof you re-read the doc and aren't
    leaving deferred work unflagged. Then clear the doc header to
    `**Autoship:** on (<window>)`: the batch is gone, so nothing is pending.

**Per-note branches stay local** — don't push them as standalone branches
unless the user explicitly asks (`push <branch-name>` or "push them
separately"). If a per-note branch was ALREADY pushed in an earlier
session/turn (has a stale `Pushes` entry in the doc, or a remote ref), skip
it from the combined cherry-pick — its commit will arrive via that
branch's existing PR — and surface it in the summary.

Rules:
- **Never claim a merge you didn't re-read from GitHub** (step 14). This is the
  skill's "never assert PR status without checking" rule at its sharpest: the
  user acts on what you say here.
- **`push` never force-pushes and never overrides a protection rule.** Every
  blocked path above ends in either auto-merge or an honest, loud stop.
- **One PR per `push`.** It merges the batch it opened (or the one still-open PR
  it found in step 5), never a sweep of every open PR in the repo.
- **`push` does not clean up the session.** Reaping stays on `tidy` / the
  Cleanup menu, so a landed session is still there to keep working in.

Edge cases:
- **Doc-only session** (no worktree, all work happened on whatever branch
  the user was on): push the current branch and open one PR for it, then land
  it the same way.
- **Push fails** (non-fast-forward, hook failure, auth): stop, report which
  branch and why, do not retry destructively. Wait for instructions.
- **Uncommitted changes unrelated to the current note**: do not stage them.
  Mention them in the summary so the user can decide.
- **Detached HEAD or unclear branch state**: do not guess — ask.
- **Existing PR for a note branch**: `gh pr create` will fail with a
  conflict — detect that, parse the existing PR URL from `gh pr view
  --json url`, and report it instead of erroring.

---

## Bare `pr` — open the PR, don't land it

When the user texts just `pr` (or `push only` / `pr only` / "open a PR but
don't merge"), they want the batch shipped to a PR and **left open** for a
human to merge — code review, a teammate's sign-off, a release they're timing
themselves.

Behavior: **run `push` steps 1–11 and stop.** Same batching, same
reconciliation, same `[x]` + PR URL on every note. Then:

- Mark the `## Pushes` entry `(open, pr-only)` — that suffix is what tells a
  later `carpool` (and a later agent) the PR is open *on purpose* and must not
  be landed on its own initiative.
- Reply with the PR link, the `<done> of <total> notes done` tally, and the
  session status render (step 18) — but lead with
  `📬 PR open, not merged (pr-only) — PR #123 <url>` so the state is
  unambiguous. Say that `push` or `merge` lands it when they're ready.

`pr` is the ONLY path that deliberately leaves a rapid PR unmerged. A plain
`push` that ends at an open PR is a failure or a block, and step 17 must say so
in those words.

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
   normal `push` (new batch branch + new PR, landed).
2. **Complete and commit the current `[~]` note** on its own branch
   (same as `push` steps 2–3). Mark it `[c]`.
3. **Reconcile the queue against git, then collect every unshipped `[c]`
   note** — same as `push` steps 4–5, in that order and with no shortcuts:
   a finished note left at `[ ]`/`[~]` is left out of the carpool exactly
   the way it's left out of a batch. If none, reply `Nothing new to
   carpool.` and stop.
4. **Cherry-pick onto the existing batch branch.** Check out the target
   PR's branch (`rapid/<slug>-batch-<N>`), cherry-pick each new note
   branch's commits in note order, and push (a normal push — never
   force). Conflicts → same stop-and-ask flow as `push` step 6.
5. **Flip the carpooled notes `[c]` → `[x]`** with the SAME PR URL as
   the target PR (`→ PR #<N> <url>` under each note), then **verify from
   disk** — `push` steps 9–10: re-read the doc, confirm every carpooled note
   is `[x]` with the URL and no batch `[c]` is left behind. Update the PR
   body's "Notes in this PR" / "Still open after this PR" sections to match
   (`gh pr edit --body`) — the PR that gained commits must state its new
   scope, or it goes back to being something a later agent has to diff.
6. **Append to the batch's `## Pushes` entry** rather than creating a
   new one:
   ```
   - batch 1 — … → PR #123 (open)
     - rapid/<slug>-lyrics-line-block-ops, …
     - + carpooled [<date>]: rapid/<slug>-header-copy, rapid/<slug>-footer-link
   ```
7. **Land it, unless the PR is `pr-only`.** Default: run `push` steps 12–16 on
   the target PR — the carpooled work reaches `main` in the same turn, same
   guards, same verification. **Exception:** if that `## Pushes` entry is
   marked `(open, pr-only)`, the PR is open deliberately — leave it open, say
   so, and don't land it.
8. **Reply in one block**: the step 17 headline (merged / queued / not landed /
   `pr-only` and still open), which notes were added, the PR URL, and the
   `<done> of <total> notes done` tally. **Then print the session status** —
   `push` step 18, verdict line included.

Rules:
- **Carpool never creates a PR.** No open PR in this session → fall back
  to `push` and say so.
- **Carpool is per-invocation consent.** It unseals the PR for this one
  batch of notes only; afterwards the PR is sealed again until the next
  explicit `carpool`.

---

## Bare `merge`

`merge` is an **alias for `push`** — same batch, same PR, same landing. It
exists because it's the word people reach for when they mean "put it on
`main`," and because `push` used to stop at PR-open. Both words now run the
full flow above.

Two `merge`-specific forms:

- **`merge <N>`** — land PR #N from this session specifically, instead of the
  batch a `push` would cut. Skip to step 12 with that PR number; steps 15–16
  (doc marks, `main` forward) still apply. Use it when a `pr`-only PR is now
  cleared to go in, or when auto-merge was queued and the user wants it checked
  and finished.
- **`/rapid merge`** — the slash form of the same thing.

Everything else — the guards, the verification, the honest stop, the reply
headline — is `push`'s, above. Don't maintain a second copy of the flow here.
