# Changelog

## 1.1.0 — 2026-06-05

- **Restructured for progressive disclosure.** SKILL.md now holds only the
  core loop (~⅓ the size); the heavy verbs moved to `references/` files the
  agent reads when their trigger fires. Note capture no longer drags the
  full push/burn/reverse procedures into context.
- **`review` / `recap` replaces bare `status`.** Instead of a bare number,
  you get a recap: shipped (grouped by PR), done-but-unshipped, in
  progress, queued, parked, blocked. `/rapid status` is now an alias for
  the same render. The render also lints the doc (shipped notes missing PR
  URLs, missing branch lines, more than one in-progress).
- **`carpool` is now a first-class verb** with its own documented flow:
  adds the latest work onto the most recent still-open PR (the one
  sanctioned way to amend a sealed PR), appends to that batch's push
  history, falls back to `push` when the PR is merged. The bare `add`
  alias was removed — too easy to collide with "add it" meaning something
  else.
- **Overlap awareness.** Before starting a note, the agent checks whether
  its files were already changed by an unmerged earlier note: unshipped →
  it reads that branch's version first so it doesn't contradict or redo
  the work; sealed open PR → it asks (carpool or park) instead of
  silently proceeding.
- **Push conflict handling.** When batching cherry-picks collide, the
  agent names the two colliding notes and offers: resolve now, drop one
  from the batch, or ship as separate PRs. Clean same-file merges get a
  one-line heads-up in the push summary.
- **First-run onboarding + `config.json`.** The first `/rapid` explains
  what gets created and asks consent on file locations (`~/.rapid/`,
  `~/worktrees/`); choices land in `~/.rapid/config.json` and every path
  resolves through it (cross-tool friendly).
- **`/rapid update` + once-daily version ping.** Session start checks for
  a newer version (at most once a day, fail-silent) and mentions it in
  one line; `/rapid update` pulls the skill repo and prints the changelog
  delta.
- **Local main freshening.** Session-start GC now fast-forwards the
  primary checkout's `main` when it's clean — no more starting sessions
  while your local main sits behind merged PRs (new branches were always
  cut from `origin/main`, but now your checkout matches it too).
- **New verbs: `drop <N>`** (mark a note dropped — bookkeeping, not
  rollback) and **`unpark <N>`** (flip a parked note back into the queue),
  symmetric with `park <N>` / `reverse <N>`.
- **Removed the `active` pointer file.** It was a soft
  "most-recently-started" hint nothing depended on; each chat already
  tracks its own slug.
- **Vehicle slugs.** Session names are now `<adjective>-<vehicle>`
  (`amber-kart`, `swift-glider`, `neon-moped`) instead of animals — things
  that travel, for a queue that ships.
- **Bare-word safety.** `wash`/`clear` with no session no longer silently
  starts one — every bare word without a session is just a normal message
  (exceptions: `burn` is repo-wide, `/rapid update` is about the skill).

## 1.0.0 — 2026-05-31

- Initial release: session docs + worktree isolation, drive-by note
  capture, status boxes (`[ ]` `[~]` `[c]` `[x]` `[!]` `[p]` `[-]`),
  batched `push` with sealed PRs, `test`/`testdrive` self-verification,
  `wash`/`scrap`/`burn` cleanup ladder, `park`, `link`, `reverse`/`undo`,
  session-start garbage collection.
