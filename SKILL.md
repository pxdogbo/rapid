---
name: rapid
version: 1.2.4
user-invocable: true
description: >
  Rapid session — capture realtime notes from the user while working with a
  live product (app, website, etc.) without losing context. Each `/rapid`
  invocation reuses an existing empty session if one is available, otherwise
  starts a brand-new one (fresh doc + sibling git worktree on a `rapid/<slug>`
  branch). Drive-by notes and bare-word triggers (review/recap, push (→ always
  commits the queue and opens a PR, never a bare git push), carpool,
  wash/clean, park, unpark, drop, test/testdrive, scrap, burn,
  link, reverse/undo) operate on the session this chat started, not on
  whatever doc happens to be marked active globally. Use whenever the user
  types /rapid, /rapid <note>, /rapid review, /rapid done, /rapid off,
  /rapid update, or says they want to "start a rapid session" / "drop a
  quick note" mid-task.
---

# /rapid — Realtime Note Queue

The user is using a product live and dropping you observations or change
requests as they come, possibly mid-task and possibly unrelated to whatever
you were doing. They cannot wait for you to finish, and they cannot keep
opening new chats. The session doc is the queue: it persists notes, your
status on each, and any context you need so a new note can never knock you
off course.

## Response style — terse by default

The user runs several projects at once, so wordy replies are fatiguing.
In every reply during a session:

- **Lead with the answer or status** — no preamble, no restating the request.
- **Match the format to the data, don't default to prose.** Pick whatever renders the information most legibly:
  - **Tables** for comparisons or any 3+ items with shared attributes.
  - **Bulleted / numbered lists** for parallel items or ordered steps.
  - **Checklists** (`- [x]` / `- [ ]`) for multi-step progress or done/pending status.
  - **Fenced code blocks** for commands, paths, diffs, config, and JSON.
  - **Diagrams** when structure matters — mermaid (`flowchart`, `sequenceDiagram`, `gantt`) for flows/timelines, or ASCII when the client can't render mermaid.
  - Keep lines short regardless of format.
- **Compress, don't omit** — keep every fact that matters; cut the connective prose, not the information.
- Working the queue → **one line of status per note**. Reserve longer prose only for a "why" or a decision the user must make.

This file holds the core loop (start a session, capture notes, work the
queue, review, archive). The heavier verbs live in reference files next to
this one — **read the reference file when its trigger fires**, not before:

| File | Covers |
|---|---|
| `references/push.md` | `push`, `carpool` |
| `references/cleanup.md` | `wash`/`clean`, `scrap`, `burn` |
| `references/notes.md` | `park`, `unpark`, `drop`, `link` |
| `references/reverse.md` | `reverse <N>` / `undo <N>` |
| `references/test.md` | `test` / `testdrive` |
| `references/setup.md` | first-run onboarding, config.json, `/rapid update`, version check |

---

## Storage layout

Default paths are under `~/.rapid/` — local to this machine. Open the
folder anytime with `open ~/.rapid`. Both roots are overridable in
`config.json` (see `references/setup.md`); resolve every path through it.

```
~/.rapid/
├── config.json                  # first-run choices: paths, last update check
├── sessions/
│   ├── turbo-kart.md             # an active session doc
│   ├── nitro-scooter.md          # another concurrently-active session doc (different chat)
│   └── archive/
│       └── zippy-luge.md        # ended sessions land here
```

If `config.json` does not exist, this is a **first run** — run the
onboarding in `references/setup.md` before creating anything.

Multiple chats / machines can have their own sessions running in
parallel; each chat tracks its own slug from its own conversation context
(see Step 1).

### Git worktrees (per session)

When a session is started **inside a git repo**, the skill also creates a
worktree under a centralized `~/worktrees/<repo-name>/<slug>/` directory,
on a fresh branch off `origin/main`:

```
~/Documents/Maistro/                  ← main checkout (any branch)
~/worktrees/Maistro/turbo-kart/        ← worktree on `rapid/turbo-kart`
~/worktrees/Maistro/nitro-scooter/     ← worktree on `rapid/nitro-scooter`
```

Centralized keeps the project directory pristine — these are throwaway
working dirs by nature. Cleanup is a single `rm -rf ~/worktrees/<repo>/`
when you want to wipe everything.

Multiple concurrent sessions = multiple worktrees, fully isolated. Each chat
that resumes the session does its work *inside* that worktree. The session
doc records the absolute path so a chat opened anywhere can `cd` into the
right folder.

If the user invokes `/rapid` outside a git repo, the worktree step is
skipped and the session is doc-only.

---

## Triggers

| User input              | Action                                                            |
|-------------------------|-------------------------------------------------------------------|
| `/rapid`                | **Reuse an empty session in this chat if one exists** (oldest in `sessions/` with zero notes), else start a brand-new one. See Step 2. |
| `/rapid <text>`         | Same as above, with `<text>` appended as note 1. See Step 2.      |
| `review` / `recap` (bare word, mid-session) | Session recap: what shipped (with PR links), what's done-but-unshipped, in progress, queued, parked, blocked. See Step 6. |
| `push` (bare word, mid-session) | Finish the current `[~]` note, commit it, cut a fresh combined branch + open a new PR for it and any other unshipped `[c]` notes. Stop at PR-open. See `references/push.md`. |
| `carpool` (bare word, mid-session) | **Add the latest work to the MOST RECENT still-open PR from this session** instead of cutting a new branch/PR. This is the one sanctioned way to amend an open PR. If that PR is merged/closed (or none exists), fall back to `push`. See `references/push.md`. |
| `test` / `testdrive` (bare word, mid-session) | Actually verify the most recent `[c]`/`[x]` note (or the current `[~]`) end-to-end yourself — browser, simulator, curl, whatever the work calls for. See `references/test.md`. |
| `park` / `park <N>` (bare word, mid-session) | Mark a note as **parked** (`[p]`) so it sticks around but is set aside. `park` alone → park the current `[~]`. See `references/notes.md`. |
| `unpark <N>` (bare word, mid-session) | Flip a parked note back into the queue (or straight to in-progress if nothing else is pending). See `references/notes.md`. |
| `drop <N>` (bare word, mid-session) | Mark note N dropped (`[-]`) — "never," not "later." Bookkeeping only; use `reverse` to also discard work. See `references/notes.md`. |
| `link` / `link <N>` (bare word, mid-session) | Print the URL(s) of recent PRs opened from **this chat's** session, newest first. See `references/notes.md`. |
| `reverse <N>` / `undo <N>` (bare word, mid-session) | **Undo the work done on note N** — discard uncommitted changes, reset committed branches, or close pushed PRs (with confirmation). See `references/reverse.md`. |
| `wash` / `clean` (bare word, mid-session) | **Empty** this chat's session file in place so it can be reused — keeps slug, worktree, branch, and `## Pushes` history. Confirms first if anything risky is in flight. See `references/cleanup.md`. |
| `scrap` (bare word, mid-session) | **Delete this chat's session entirely** — doc, worktree, and local branch. Confirms first if anything risky is in flight. See `references/cleanup.md`. |
| `burn` (bare word, any time) | **Nuke ALL rapid artifacts for the current repo** (docs, worktrees, `rapid/*` branches). Confirms first; lists anything that would be lost. See `references/cleanup.md`. |
| `/rapid done` / `/rapid end` / `/rapid off` | Archive **this chat's** session. See Step 6. |
| `/rapid resume <slug>` / `/rapid start <slug>` | Re-activate an archived session in this chat. `start` and `resume` are aliases. `/rapid start` alone (no slug) behaves like `/rapid` (reuse-or-new). |
| `/rapid update` | Pull the latest version of this skill and show the changelog delta. Works any time, no session needed. See `references/setup.md`. |

### The bare-word rule

If the user's ENTIRE message is exactly one of the bare words above —
case-insensitive, no other content, numbers may carry a leading `#`
(`park #3`, `link #2`) — and **this chat has a session**, handle it as
that command. NEVER queue it as a note. If this chat has NO session,
every bare word is just a normal message: do nothing rapid-related,
respond as you would in any chat.

Two exceptions to the session requirement:
- `burn` is repo-wide and runs regardless of session state.
- `/rapid update` is about the skill itself and works any time.

### Drive-by notes

If the user gives a note without typing `/rapid` (mid-conversation
drive-by) and **this chat** has a rapid session, treat it as a
`/rapid <text>` invocation — append it to the queue before doing anything
else. If this chat has no session, the note is just a normal message; do
not start one implicitly unless the user explicitly invokes
`/rapid <text>`.

---

## Step 1 — Resolve this chat's session

Each chat owns its own session. The slug for **this chat's** session is
established when this chat invokes `/rapid` (Step 2) or `/rapid resume
<slug>`, and from that point on it lives in this chat's conversation
context. If this chat hasn't started a session, it has no session, full
stop — never adopt another chat's live session implicitly.

When deciding what to do:

- **`/rapid` or `/rapid <text>`** → ignore everything; reuse an empty
  session if one exists in `sessions/`, else start a brand-new one (Step 2).
- **Drive-by note, or any bare-word command** → only act if this chat has
  a session slug from earlier in the conversation (exceptions: `burn`,
  `/rapid update`). If it doesn't, treat as a normal message.
- **`/rapid review`, `/rapid done` / `/rapid end` / `/rapid off`** → only
  act if this chat has a session slug. If it doesn't, reply: "No rapid
  session in this chat. Type `/rapid` to start one or `/rapid resume
  <slug>` to pick up an archived one."
- **`/rapid resume <slug>` / `/rapid start <slug>`** → look up
  `sessions/<slug>.md` (or `sessions/archive/<slug>.md`); restore from
  archive if needed; bind the slug to this chat.

When you do need the session doc, read
`~/.rapid/sessions/<this-chat-slug>.md` directly. The doc on
disk is still the source of truth for queue state — do not rely on
conversation memory for note status, since you may be running across a
context compaction.

---

## Step 2 — Start or reuse a session (slug + doc + worktree)

When `/rapid` (or `/rapid <text>` or `/rapid start` with no slug) fires:

**Step 2·0 — First-run check.** If `~/.rapid/config.json` does not
exist, run the onboarding in `references/setup.md` first, then continue
here. If it exists, also run the **once-daily version check** from that
file (non-blocking, fail silent).

**Step 2·GC — Auto-reap finished sessions.** Before reusing or
creating anything, garbage-collect the leftovers of prior sessions for
**this repo**. This is the cleanup hook, because in practice users start
new sessions far more often than they run `/rapid done` — so `done` can't
be the only thing that cleans up. Reaping on start means worktrees and
branches never silently pile up.

Run this sweep, scoped to the current repo (resolve root via
`git rev-parse --show-toplevel`; if not in a repo, skip GC entirely):

1. For each session doc in `sessions/` (NOT archive) whose `**Repo:**`
   header matches the current repo root, AND which is **not** the session
   this chat is about to reuse/own:
   - **Skip (leave it) if anything is at risk:** uncommitted changes in
     its worktree (`git -C <worktree> status --porcelain` non-empty), or
     any `[~]` / `[c]` / `[p]` / `[!]` note in the doc. Those belong to a
     live or unshipped session — never reap them.
   - **Otherwise it's finished** (all notes `[x]` shipped or `[-]` dropped
     or empty, worktree clean) → reap it:
     a. `git worktree remove --force <worktree>` if the worktree exists
        and sits on a `rapid/*` branch. Leave worktrees parked on a
        non-rapid feature branch alone.
     b. Delete its `rapid/*` local branches and any `branch: <name>`
        recorded in the doc **whose PR is merged/closed or which has no
        remote ref** (`git branch -D`). Never delete a branch with an
        open PR.
     c. Delete the merged/closed remote `rapid/*` branches it pushed
        (`git push origin --delete`), only when their PR is not open.
     d. `rm` the session doc.
2. After the sweep, run `git worktree prune` to clear stale registrations.
3. **Freshen the user's local main**: if the primary checkout is on
   `main` and clean (`git status --porcelain` empty), run
   `git -C <repo-root> pull --ff-only`. This keeps the main checkout from
   drifting behind merged rapid PRs. It is always safe for in-progress
   branches — a fast-forward only moves the `main` pointer; worktrees and
   note branches are untouched. If the checkout is on another branch or
   dirty, skip silently.
4. Do this **silently** unless something was reaped or main moved — then
   prepend ONE line to the start acknowledgement, e.g. `Reaped 3 finished
   sessions (sonic-rover, speedy-buggy, swift-sled); fast-forwarded main.`
   Never block the new session on GC; if a reap step errors, skip that
   item and keep going.

The point: the user never has to remember `done`. Every `/rapid` start
leaves the repo with only live/unshipped sessions plus the new one, and
a local main that matches origin.

**Step 2a — Try to reuse an empty session first.** Scan
`~/.rapid/sessions/` (NOT the archive) for any `.md` file
whose `## Notes` block has zero entries — no `[ ]`, `[~]`, `[c]`, `[x]`,
`[!]`, `[p]`, or `[-]` lines under that heading. (A `## Pushes` history
block is fine; it stays around after `wash`.) If one or more match, pick
the **oldest by file mtime**, bind its slug to this chat, and skip the
creation steps — the doc, worktree, and branch are already in place from
when that session was first created.

If a first note was passed as args, append it as note 1 inside the
reused doc and start working immediately. Acknowledge in one line:
- Reuse + first note: `Reusing rapid/<slug> at <worktree>. Picking up note 1: <text> — looking now.`
- Reuse, no first note: `Reusing rapid/<slug> at <worktree>. Drop notes anytime.`

If no empty session is found, fall through to step 2b and create a fresh
one.

**Step 2b — Create a fresh session.** When no empty session is reusable:

1. **Generate a slug** in the form `<adjective>-<vehicle>`, lowercase, hyphenated.
   Pick from this pool (or improvise — just keep it short, two words, kid-safe,
   and the noun something that travels):

   adjectives (speed & motion): swift, brisk, turbo, nitro, zippy, speedy,
   drifting, blazing, sonic, hyper, nimble, fleet, dashing, racing, darting,
   flying, soaring, express, lightning, breakneck, quick, agile,
   snappy, zooming, rushing, quantum, overdrive, blistering, supersonic,
   meteoric, whirlwind, warp, ballistic, kinetic, stealth, peppy,
   aero, accelerated

   vehicles: kart, sled, jet, buggy, go-kart, scooter, glider, rocket, drone,
   hoverboard, kayak, yacht, tram, moped, luge, rover, trike, e-bike, atv,
   blimp, coupe, chopper, cruiser, shuttle, capsule, sub, jetpack, snowmobile,
   bobsled, quad, mech, hypercar, rig, cab, dirtbike, segway, raft, maglev,
   hovercraft, hot-rod

   If the slug already exists in `sessions/` or `sessions/archive/`, pick again.

2. **Detect git context** — run `git rev-parse --show-toplevel` from the
   user's current working directory. If it succeeds, capture the repo root
   path; if it fails (cwd is not a git repo), skip the worktree step entirely
   and continue with doc-only.
3. **Create the worktree** (only if step 2 found a repo):

   ```
   mkdir -p ~/worktrees/<repo-name>
   cd <repo-root>
   git fetch origin main         # so the new branch is off the latest main
   git worktree add "$HOME/worktrees/<repo-name>/<slug>" \
                     -b rapid/<slug> origin/main
   ```

   `<repo-name>` is the final path component of the repo root. Example:
   repo at `~/Documents/Maistro` → worktree at
   `~/worktrees/Maistro/turbo-kart/` on branch `rapid/turbo-kart`.

   If the worktree creation fails (existing path, dirty refs, network error
   on fetch), report the error verbatim and ask the user how to proceed.
   Do NOT silently fall through to doc-only — the user expects isolation.
4. **Create the doc** at `~/.rapid/sessions/<slug>.md` using the
   template below. Fill in the `Worktree` and `Branch` fields with the
   absolute worktree path and branch name (or `n/a` if doc-only).
5. **Acknowledge in one line**, including the worktree path so the user can
   open it in a new terminal/IDE if they want:
   - With worktree: `Started rapid/<slug> at <worktree-path> (branch rapid/<slug>). Drop notes anytime.`
   - Doc-only: `Started rapid/<slug> (doc-only — not in a git repo). Drop notes anytime.`

   If the user passed a first note as args, append it as note 1 and start
   working on it immediately (Step 4). All file edits for the session must
   happen *inside* the worktree path; never edit files in the original
   checkout from a rapid session unless the user explicitly says so.

### Session doc template

```markdown
# rapid/<slug>

**Started:** <ISO datetime>
**Surface:** <app/website/etc. — leave blank if unknown, fill in once obvious>
**Repo:** <absolute path to repo root, or "n/a">
**Worktree:** <absolute path to worktree, or "n/a">
**Branch:** <rapid/<slug>, or "n/a">

## Notes

<!-- Each note: status box, timestamp, one-line summary. Indent details under it. -->

```

Status boxes used in the queue:
- `[ ]` pending — not started
- `[~]` in progress — actively being worked
- `[c]` committed — implementation done, work is on a local branch, **not yet pushed**
- `[x]` done — **shipped to a PR** (PR open, possibly merged — the skill does not track merge state). The note's commit must be on a pushed branch with an open or merged PR before flipping to `[x]`. **The PR URL must appear in the note** — e.g. `→ PR #123 https://github.com/…/pull/123`.
- `[!]` blocked — needs user input or external thing
- `[p]` parked — explicitly set aside by the user
- `[-]` dropped — user said skip it

> ⚠️ **`push` opens a PR and stops.** It does NOT auto-merge to `main`. Each `push` invocation cuts a brand-new combined branch and opens a brand-new PR. **A PR is sealed the moment its URL appears in the conversation** — never push more commits to it, with ONE exception: the user explicitly texting `carpool`, which adds the latest work onto the most recent still-open PR (see `references/push.md`). New `[c]` notes otherwise accumulate locally until the next `push`, which creates a *fresh* branch + a *fresh* PR for them.
>
> The path from `[~]` to `[x]` runs through `[c]` and then through `push`, which flips notes to `[x]` upon successful PR open. Whether the PR has been merged is a downstream concern the user owns; `review` and `link` surface PR URLs the user can check on GitHub.

---

## Step 3 — Append a note (when one comes in)

Before doing anything else with a new note:

1. Read **this chat's** session doc (`sessions/<this-chat-slug>.md`).
2. Append a new note line at the end of `## Notes`:
   ```
   - [ ] [<HH:MM>] <one-line summary the user just gave>
   ```
   If the user's note has detail or you're inferring scope, indent a bullet
   underneath with the detail.
3. **Acknowledge in one line.** Examples:
   - `Noted (queued): tweak the sidebar avatar size.`
   - `Noted (in progress now): error glow on node cards — picking this up next.`
   - `Noted (already done): saw it land in the last edit, marked complete.`

Do NOT acknowledge with multiple sentences or restate context. The whole point
is fast capture.

---

## Step 4 — Decide what to do *right now*

After appending, decide between four actions. Be honest about which one and
say it in one line:

1. **Fold in (refinement)** — the note modifies the task you're actively on
   (same file, same feature, same surface — it's a spec update, not a new
   request). Do NOT create a new top-level note; instead add it as an indented
   `refinement [HH:MM]:` sub-bullet under the current `[~]` item. Keep working,
   apply the change, and complete everything as one `[c]` (or `[x]` once
   shipped) noting both the original request and the refinement in the
   outcome line. One-line ack: `Folding that in — adjusting now.`
2. **Continue current task** — the note is a separate thing but isn't urgent.
   It gets its own new top-level note, marked `[ ]` (pending). Finish what
   you were doing, then come back.
3. **Pivot** — new note is clearly higher priority (user says "drop that",
   "do this first", or it's blocking them right now). Mark current in-progress
   note `[ ]` again with a `paused at: <state>` indented line, then start the
   new one (`[~]`).
4. **Pick from the queue** — you weren't doing anything. Take the oldest
   `[ ]` note, mark it `[~]`, and start.

Heuristics, in order:
- New note is a *spec tweak* on the currently in-progress task ("make it
  blue instead", "only on focus", "use X route not Y") → fold in.
- User explicit signal ("urgent", "blocking", "first", "now") → pivot.
- New note is fixing something the user is staring at right now (visual bug,
  broken interaction in the live product) → pivot.
- New note is a tweak / "while you're at it" on something *else* → queue.
- New note belongs to a different surface than current work → queue, don't
  mix branches.

If a note is genuinely ambiguous between **fold in** and **pivot / queue**
(e.g. "related but kind of its own thing"), say so in one line and ask —
don't silently pick.

---

## Step 5 — Working through notes

While working:

- **All file edits happen in the session's worktree.**
- **Every new note ships on its own fresh branch off `origin/main`.** Before
  starting a note, run `git fetch origin main` inside the worktree and check
  out a brand-new branch off `origin/main` (e.g. `fix/login-glow-bug`,
  `feat/avatar-size`). Use a `<type>/<short-slug>` name — never the session
  branch, never a previous note's branch.
- **Overlap check — before cutting the branch.** Check whether the files
  this note will touch were already changed by an unmerged earlier note
  (`git -C <worktree> diff --name-only origin/main...<branch>` for each
  branch recorded in the doc):
  - Overlap with an **unshipped `[c]`/`[~]` note** → read THAT branch's
    version of the file before editing (`git show <branch>:<path>`) so
    the new work builds on it rather than contradicting or redoing it.
    Still branch off `origin/main` as usual — `push` cherry-picks in note
    order, so clean textual merges resolve themselves; real collisions
    surface at push time and get the stop-and-ask flow.
  - Overlap with a **sealed open PR (`[x]` note)** → do not start
    silently. One-line ask: `<file> is in open PR #<n> — carpool this
    onto it, or park until that merges?` Proceed per the answer.
  - No overlap (the common case) → proceed, nothing to say.
- **Before adding any commit to an existing branch, check if it's already merged.**
  Run `gh pr view <branch> --json state,mergedAt` (or `git branch -r` to check
  if the remote ref still exists). If the PR is merged or the branch is gone,
  do NOT push to it — create a fresh branch off `origin/main` instead and note
  the new branch in the session doc. A merged branch is sealed; further commits
  to it are orphaned from `main` and will confuse the next PR.
  - **Why:** piling a new note onto an in-progress or already-merged branch
    drags those earlier commits into the new PR, muddies the diff, and
    forces awkward cherry-picks when one note merges before another.
  - The session branch (`rapid/<slug>`) is the **doc/coordination unit**,
    not a working branch. It's normal for it to never receive commits.
  - Refinements (folded into a currently-in-progress note per Step 4) stay
    on that note's branch — refinements aren't new notes.
  - If a previous note's PR has merged and the user asks for a follow-up to
    the *same* feature, still branch fresh off the now-updated `origin/main`
    rather than reusing the merged branch.
- Record the branch under the note as you start it:
  ```
  - [~] [14:38] error glow on node cards
    - branch: fix/node-error-glow (off origin/main)
  ```
  The `push` step picks up note branches via these lines.
- **Never push or open PRs inline.** Commit work to its local branch
  and stop. Pushes + PRs only happen when the user texts the bare
  `push` / `carpool` command or explicitly says "push it." Auto-pushing
  every finished note clutters GitHub with PRs the user has to triage
  individually and removes their chance to batch / reorder / drop work
  before it leaves the worktree.
- **When you finish a note's implementation, mark it `[c]` — NOT `[x]`.**
  `[c]` means "committed locally, awaiting `push`." `[x]` is reserved
  for notes whose commit has actually been pushed to a PR. Only the
  push flow flips `[c]` → `[x]`, and only after a successful PR open.
  This prevents orphaned branches: if the user never says `push`, the
  doc keeps showing `[c]` and `wash` will prompt for confirmation
  before emptying.
- Add the one-line outcome under the `[c]` box the same way you would
  under `[x]` — file path / "no-op, already correct" — so a future
  `push` has the per-note summary line ready to drop into the PR body.
- If a note is unclear, flip it to `[!]` with an inline question; do not
  block on it — keep moving on the rest of the queue and surface the
  question in your reply.

### Big notes — delegate to a background agent

The main loop's job is capture: a new note must always get an instant
acknowledgement. When a note is **feature-sized** — multiple files, a
refactor, anything that would bury you for many minutes — and your
harness supports background subagents (Claude Code's Agent tool, Codex's
agents, etc.), delegate it instead of going heads-down. Tools without
background agents skip this section and work the note inline.

1. **Qualify it.** Delegate only when BOTH hold:
   - The note is genuinely big (multi-file feature / refactor). Tweaks
     and one-file fixes are faster inline — delegation has overhead.
   - Its files do NOT overlap any in-flight note (Step 5's overlap
     check). Overlapping work stays inline and sequential.
2. **Give the delegate its own worktree.** The session worktree is one
   checkout on one branch — two agents inside it collide. Spawn the
   delegate in a disposable worktree on the note's fresh branch:
   ```
   git fetch origin main
   git worktree add ~/worktrees/<repo-name>/<slug>-<note-slug> \
                    -b <type>/<note-slug> origin/main
   ```
   The main loop keeps the session worktree and stays free to capture
   notes and work small non-overlapping ones inline.
3. **One delegate at a time.** Queue further big notes as `[ ]` until the
   current delegate lands — parallel delegates multiply review burden and
   merge risk faster than they save wall-clock.
4. **Record it before spawning** (append-before-acting applies to
   delegation too):
   ```
   - [~] [14:32] semantic light/dark theme across the app
     - branch: feat/dice-theme (off origin/main)
     - delegated [14:32]: background agent, worktree ~/worktrees/<repo>/<slug>-dice-theme
   ```
5. **Delegate plays by session rules**: commit to the note branch with a
   real message; NEVER push, NEVER open PRs, never touch other branches.
   Its prompt should say exactly that.
6. **On completion**: verify the commit actually exists on the note
   branch (`git log <branch> -1`), flip the note to `[c]` with the usual
   one-line outcome, remove the delegate worktree
   (`git worktree remove <path>`), then re-read the doc per the
   between-notes flow. The branch lives on — `push` batches it like any
   other note.
7. **On failure or timeout**: flip the note to `[!]` with a one-line
   `delegate failed [HH:MM]: <why>`, clean up the worktree, and surface
   it in your next reply. Do not silently retry.

### Between notes — always re-read the doc

The moment you mark a note `[c]` (or pause one, or get blocked), your very
next action is to **re-read `sessions/<this-chat-slug>.md` from disk**
before deciding what to do next. Do not rely on conversation memory for
what's pending — context may have been compacted, drive-by notes may have
been queued earlier, or your own prior writes may have moved state — the
doc is the only place that reflects the full queue.

After re-reading, pick the next item in this order:

1. Oldest `[~]` that was paused → resume it.
2. Oldest `[!]` whose blocker is now resolved (user answered the question) →
   flip to `[~]` and continue.
3. Oldest `[ ]` → flip to `[~]` and start.
4. Nothing left → reply `Queue clear.` and stop. Do not invent work.

Announce the transition in one line: `Finished note 3 (✓ sparkle buttons
wired). Picking up note 5: sidebar avatar sizing.` That one line is the
proof that you consulted the doc and didn't just drift to the next
conversation-topical thing.

---

## Step 6 — Review / done / resume

**Bare `review` / `recap`** (just the word, while this chat has a
session) — Read this chat's session doc from disk and render where
things stand:

```
rapid/<slug> — review

shipped:         #1 avatar sizing, #2 title wrap → PR #12
done, unshipped: #4 sticker copy (on fix/sticker-copy — say `push`)
in progress:     #5 ContentView spacing
delegated:       #3 light/dark theme — background agent since 14:32
queued:          #6 footer link, #7 empty-state copy
parked:          #9 logo padding
blocked:         #8 — waiting on: which color token?
```

Omit empty rows. Group shipped notes by PR. `/rapid review` and
`/rapid status` are aliases for the same render.

**Doc lint** — while rendering, validate the doc and append ONE warning
line per violation found:
- every `[x]` note has a `→ PR #` line (else: `⚠️ note <N> is marked
  shipped but has no PR URL`)
- every `[~]` / `[c]` note has a `branch:` line
- at most one `[~]` is being worked inline, and at most one carries a
  `delegated` sub-bullet

**`/rapid done` / `/rapid end` / `/rapid off`** — All three are aliases.
1. Append `**Ended:** <ISO datetime>` and a final summary block at the bottom
   of this chat's session doc:
   ```
   ## Summary
   - <count> shipped, <count> committed-unshipped, <count> parked, <count> blocked, <count> dropped
   - Branches touched: <list>
   - Open follow-ups: <bulleted list of [!], [p], [c], or [ ] notes still left>
   ```

   If `committed-unshipped > 0` OR `parked > 0`, **flag it loudly** before
   archiving: those notes have local commits that have never been pushed
   (`[c]`) or were explicitly set aside (`[p]`), and `done`/`off` does
   NOT push them. Either run `push` first, or accept that they'll sit
   on local branches. Do not silently archive over unshipped or parked
   work — confirm with the user.
2. Move the file: `mv sessions/<slug>.md sessions/archive/<slug>.md`.
3. Reply with the one-paragraph summary.

**`/rapid resume <slug>` / `/rapid start <slug>`** — Move the file back
from `archive/` to `sessions/` if needed, bind the slug to **this
chat's** conversation context, render a review. `start` and `resume`
are interchangeable. If `/rapid start` is given without a slug, treat
it as plain `/rapid` (reuse-or-new per Step 2).

---

## Rules

- **One session per chat. `/rapid` reuses an empty session or starts a
  fresh one.** Step 2a will adopt any session in `sessions/` whose
  notes block is empty (a previous chat's washed shell, or a brand-new
  doc that never got notes). It will NOT adopt a session that has
  live notes — that belongs to whichever chat owns it. The only way
  to enter a non-empty session from this chat is via explicit
  `/rapid resume <slug>` or `/rapid start <slug>` (after that chat
  has run `done`/`off` or has been washed). Drive-by notes only land
  in *this chat's* session.
- **Append before acting.** Always write the note to the doc before starting
  work, even if work takes one second. The doc must never lag behind.
- **One source of truth.** If conversation context and the doc disagree,
  trust the doc. Re-read it whenever resuming.
- **No silent pivots.** Every transition between notes shows up in your
  reply with one line ("paused note 3, picking up note 5").
- **Don't ask permission for cosmetic decisions.** Random slugs, file
  formatting, ordering — just decide.
- **Do ask for clarification on ambiguous notes**, but inline (`[!]`) — do
  not block the queue waiting.
- **Cross-tool friendly.** This skill works the same in Claude Code, Codex
  CLI, and any tool reading from `~/.rapid/`. Never hardcode
  Claude-Code-only assumptions into the session doc or config.
- **Every note covers both desktop AND mobile by default.** Unless the user
  explicitly scopes a note to one surface ("desktop only", "just on the
  iPhone view", "in the Output node sheet only"), assume the request
  applies to *both* the desktop canvas and the mobile layout/sheet, and
  fix both before marking the note `[x]`. If the codebase has a single
  shared component that renders on both, verify the change works on both
  viewports; if surfaces are forked (e.g. `NodeCanvas` vs `MobileLayout`,
  `OutputNode` vs `NodeChainMobile`/`MobileNodeSheet`), update each.
  Default-both is non-negotiable: treating "the user pointed at the
  mobile bug" as scoping it to mobile is the wrong inference — they're
  reporting where they noticed it, not where it should be fixed. When
  uncertain, fix both and call out the broader scope in the outcome line.

---

## Example — first invocation

User: `/rapid the avatar in the sidebar feels too small`

Claude (this chat had no session):
1. Config exists (not a first run); version check already done today.
2. Generates slug `turbo-kart`, no collision in `sessions/` or `archive/`.
3. Creates the worktree + branch (Step 2).
4. Writes `sessions/turbo-kart.md` with note 1 = `[~] [14:32] avatar in sidebar feels too small`.
5. Binds `turbo-kart` as **this chat's** slug in conversation context.
6. Replies: `Started rapid/turbo-kart at <worktree>. Picking up note 1: avatar size in sidebar — looking now.`
7. Begins the work.

User (3 minutes later, same chat): `also the title bar text wraps weird at 1280px`

Claude (drive-by note, this chat owns `turbo-kart`):
1. Appends note 2 to `turbo-kart.md` as `[ ]`.
2. Replies: `Noted (queued as note 2). Finishing avatar size first.`
3. Continues.

User (later, in **a different chat**): `/rapid the export button is dead`

Claude in that other chat:
1. Step 2a scans `sessions/` for empty docs. `turbo-kart.md` has live
   notes, so it's NOT reusable; no other empty docs exist.
2. Falls through to 2b: generates slug `nitro-scooter`, creates its own
   doc + worktree on `rapid/nitro-scooter`.
3. Replies: `Started rapid/nitro-scooter at <worktree>. Picking up note 1:
   export button — looking now.`

Both sessions run concurrently, each chat operating on its own slug.

---

## Example — reusing a washed session

User (in the same chat as `turbo-kart`, after `push` + merge):
`wash`

Claude:
1. Reads `turbo-kart.md`. All notes are `[x]` shipped, no parked, no
   uncommitted, no in-progress. No risk → skip confirmation.
2. Empties the `## Notes` block, leaves the `## Pushes` history intact.
3. Replies: `Washed rapid/turbo-kart — notes cleared, worktree still
   at ~/worktrees/Maistro/turbo-kart/. Drop new notes anytime.`

User (next message): `the empty state copy on the dashboard reads weird`

Claude:
1. This chat still owns `turbo-kart`. Appends as note 1 of the new batch.
2. Replies: `Noted (in progress now): empty-state copy on the dashboard
   — looking now.`
3. Begins work on the same worktree — no new branch or doc needed.

User later: `link 3`

Claude: prints the 3 most recent PR URLs from `## Pushes` (the pre-wash
batch is still there).
