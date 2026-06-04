---
name: rapid
description: >
  Rapid session — capture realtime notes from the user while working with a
  live product (app, website, etc.) without losing context. Each `/rapid`
  invocation reuses an existing empty session if one is available, otherwise
  starts a brand-new one (fresh doc + sibling git worktree on a `rapid/<slug>`
  branch). Drive-by notes and bare-word triggers (status, push (→ always
  commits the queue and opens a PR, never a bare git push),
  wash/clean/wipe/clear, park, test/testdrive, scrap, burn, link) operate on the
  session this chat started, not on whatever doc happens to be marked active
  globally. Use whenever the user types /rapid, /rapid <note>, /rapid status,
  /rapid done, /rapid off, or says they want to "start a rapid session" /
  "drop a quick note" mid-task.
---

# /rapid — Realtime Note Queue

The user is using a product live and dropping you observations or change
requests as they come, possibly mid-task and possibly unrelated to whatever
you were doing. They cannot wait for you to finish, and they cannot keep
opening new chats. The session doc is the queue: it persists notes, your
status on each, and any context you need so a new note can never knock you
off course.

---

## Storage layout

All paths are under `~/.rapid/` — local to this machine (no longer synced
across machines). Open the folder anytime with `open ~/.rapid`.

```
~/.rapid/
├── active                       # plain text file: slug of MOST RECENTLY started session
├── sessions/
│   ├── amber-fox.md             # an active session doc
│   ├── velvet-otter.md          # another concurrently-active session doc (different chat)
│   └── archive/
│       └── crisp-wren.md        # ended sessions land here
```

The `active` file holds the slug of the **most recently started** session
(e.g. `amber-fox`). It is a soft pointer for `/rapid resume <slug>` /
`/rapid start <slug>` discovery and for the empty-session reuse scan in
Step 2a — it does NOT identify which session the current chat is working
on. Multiple chats / machines can have their own sessions running in
parallel; each chat tracks its own slug from its own conversation context
(see Step 1). If `active` is missing or empty, no one has started a
session recently — that's fine.

### Git worktrees (per session)

When a session is started **inside a git repo**, the skill also creates a
worktree under a centralized `~/worktrees/<repo-name>/<slug>/` directory,
on a fresh branch off `origin/main`:

```
~/Documents/Maistro/                  ← main checkout (any branch)
~/worktrees/Maistro/amber-fox/        ← worktree on `rapid/amber-fox`
~/worktrees/Maistro/velvet-otter/     ← worktree on `rapid/velvet-otter`
```

Centralized keeps the project directory pristine — these are throwaway
working dirs by nature. Cleanup is a single `rm -rf ~/worktrees/<repo>/`
when you want to wipe everything.

Multiple concurrent sessions = multiple worktrees, fully isolated. Each chat
that resumes the session does its work *inside* that worktree. The session
doc records the absolute path so a chat opened anywhere can `cd` into the
right folder.

If the user invokes `/rapid` outside a git repo, the worktree step is
skipped and the session is doc-only (today's behavior).

---

## Triggers

| User input              | Action                                                            |
|-------------------------|-------------------------------------------------------------------|
| `/rapid`                | **Reuse an empty session in this chat if one exists** (oldest in `sessions/` with zero notes), else start a brand-new one. See Step 2. |
| `/rapid <text>`         | Same as above, with `<text>` appended as note 1. See Step 2.      |
| `/rapid status`         | Show pending notes from **this chat's** session.                  |
| `status` (bare word, mid-session) | If **this chat** has a rapid session, reply with **just a number**: how many tickets are left (pending `[ ]` + in-progress `[~]` + committed-but-unshipped `[c]` + parked `[p]` + blocked `[!]`). No other text. |
| `push` (bare word, mid-session) | Finish the current `[~]` note, commit it, cut a fresh combined branch + open a new PR for it and any other unshipped `[c]` notes. Stop at PR-open. See Step 7. |
| `add` / `carpool` (bare word, mid-session) | **Add the latest work to the MOST RECENT still-open PR from this session** instead of cutting a new branch/PR — finish the current `[~]` note, commit it, and push it (plus any unshipped `[c]` notes) onto that PR's existing branch so the open PR updates in place. Use when the previous PR hasn't merged yet. Only valid while that PR is unmerged; if it's already merged (or none exists), fall back to `push` (new branch + new PR). `carpool` = "ride along on the last PR." See Step 7. |
| `wash` / `clean` / `wipe` / `clear` (bare word, mid-session) | **Empty** this chat's session file in place so it can be reused — keeps slug, worktree, branch, and `## Pushes` history. Confirms first if anything risky is in flight (uncommitted, `[~]`, `[c]`, `[p]`, or `[!]`). See Step 8. |
| `park` / `park <N>` (bare word, mid-session) | Mark a note as **parked** (`[p]`) so it sticks around but is set aside. `park` alone → park the current `[~]`. `park N` → park note N. See Step 9. |
| `test` / `testdrive` (bare word, mid-session) | Actually verify the most recent `[c]`/`[x]` note (or the current `[~]`) in **this chat's** session end-to-end yourself — open a browser via agent-browser, run the iOS simulator, hit the API, whatever the work calls for. See Step 10. |
| `burn` (bare word, any time) | **Nuke ALL rapid session files** (active + archived), worktrees, and local `rapid/*` branches for the current repo. Confirms first; lists anything that would be lost (parked notes, committed-unshipped, uncommitted, open PRs on remote branches). See Step 11. |
| `link` (bare word) / `link <N>` (mid-session) | Print the URL(s) of recent PRs opened from **this chat's** session. `link` alone → most recent PR. `link N` → N most recent PRs, newest first. Source is the `## Pushes` block in the session doc (every `push` records its PR there). See Step 12. |
| `reverse <N>` / `undo <N>` (bare word, mid-session) | **Undo the work done on note N** — discard uncommitted changes, reset committed branches, or close pushed PRs (with confirmation). Marks the note back to `[ ]`. See Step 13. |
| `scrap` (bare word, mid-session) | **Delete this chat's session entirely** — doc, worktree, and local branch. Confirms first if anything risky is in flight. Use when the whole session was a wash; use `wash` instead if you want to reuse the slug. See Step 14. |
| `/rapid done` / `/rapid end` / `/rapid off` | Archive **this chat's** session.                       |
| `/rapid resume <slug>` / `/rapid start <slug>` | Re-activate an archived session in this chat. `start` and `resume` are aliases. `/rapid start` alone (no slug) behaves like `/rapid` (reuse-or-new). |

"This chat's session" = the slug **this chat** generated when it last
invoked `/rapid` (or resumed) — held in this chat's conversation context,
not in the global `active` file. If this chat hasn't started a session,
it has no session, full stop. Bare-word triggers and drive-by notes
below do nothing in that case (treat as normal messages).

If the user gives a note without typing `/rapid` (mid-conversation drive-by) and
**this chat** has a rapid session, treat it as a `/rapid <text>` invocation —
append it to the queue before doing anything else. If this chat has no
session, the note is just a normal message; do not start one implicitly
unless the user explicitly invokes `/rapid <text>`.

**Exception:** if the user's entire message is just the word `status`
(case-insensitive, no other content) and **this chat has a session**, do
NOT queue it as a note — handle it as the bare-`status` query (see
Step 6) and reply with just the pending count.

**Exception:** if the user's entire message is just the word `push` (case-
insensitive, no other content) and **this chat has a session**, do NOT
queue it as a note — handle it as the bare-`push` command (see Step 7).

**Exception:** if the user's entire message is just `add` or `carpool`
(case-insensitive, no other content) and **this chat has a session**, do
NOT queue it as a note — handle it as the bare-`add`/`carpool` command:
add the latest work to the most recent still-open PR from this session
(push onto that PR's existing branch) rather than opening a new one. If
that PR is already merged or there's no open PR, fall back to `push`.

**Exception:** if the user's entire message is just `wash`, `clean`,
`wipe`, or `clear` (case-insensitive, no other content):
- If **this chat has a session** → do NOT queue it as a note — handle it as the bare-wash command (see Step 8). All four words are aliases for the same action: empty the session file in place so the slug + worktree can be reused.
- If **this chat has NO session** → treat it as a reset signal: wipe any residual state, then **silently start a brand-new session** (Step 2, no first note). The very next message from the user becomes note 1 and work begins immediately. Do NOT reply with "no session found" — the user is signalling a clean slate, not asking for a status check.

**Exception:** if the user's entire message is `park` or matches `park <N>`
(case-insensitive, optionally with a leading `#` like `park #3`) and
**this chat has a session**, do NOT queue it as a note — handle it as
the bare-`park` command (see Step 9). `park` alone parks the current
`[~]` note; `park N` parks note N.

**Exception:** if the user's entire message is just `test` or `testdrive`
(case-insensitive, no other content) and **this chat has a session**, do
NOT queue it as a note — handle it as the bare-test command (see
Step 10). `test` and `testdrive` are aliases.

**Exception:** if the user's entire message is just the word `burn` (case-
insensitive, no other content), handle it as the bare-`burn` command (see
Step 11) regardless of whether this chat has a session. `burn` is a
project-wide nuke and does not require an active session.

**Exception:** if the user's entire message matches `link` or `link <N>`
(case-insensitive, where `<N>` is a positive integer, optionally with a
leading `#` like `link #2`) and **this chat has a session**, do NOT queue
it as a note — handle it as the bare-`link` command (see Step 12). If
this chat has no session, treat as a normal message.

**Exception:** if the user's entire message matches `reverse <N>` or
`undo <N>` (case-insensitive, `<N>` a positive integer with optional
leading `#`) and **this chat has a session**, do NOT queue it as a note
— handle it as the bare-reverse command (see Step 13). `reverse` and
`undo` are aliases.

**Exception:** if the user's entire message is just the word `scrap`
(case-insensitive, no other content) and **this chat has a session**,
do NOT queue it as a note — handle it as the bare-`scrap` command (see
Step 14). `scrap` deletes only this chat's session, not other sessions.

---

## Step 1 — Resolve this chat's session

Each chat owns its own session. The slug for **this chat's** session is
established when this chat invokes `/rapid` (Step 2) or `/rapid resume
<slug>`, and from that point on it lives in this chat's conversation
context. Do NOT trust `~/.rapid/active` to identify this
chat's session — that file reflects whichever chat (possibly on another
machine) most recently started one, which is often *not* this chat.

When deciding what to do:

- **`/rapid` or `/rapid <text>`** → ignore everything; reuse an empty
  session if one exists in `sessions/`, else start a brand-new one (Step 2).
- **Drive-by note, or bare `status` / `push` / `wash` / `clean` / `wipe` / `clear` / `park [N]` / `test` / `testdrive` / `link [N]` / `reverse <N>` / `undo <N>` / `scrap`**
  → only act if this chat has a session slug from earlier in the
  conversation. If it doesn't, do nothing rapid-related (treat as a
  normal message; for drive-bys, respond as you would in any chat). The
  one exception is bare `burn` which is repo-wide and runs regardless
  of session state.
- **`/rapid status`, `/rapid done` / `/rapid end` / `/rapid off`** → only
  act if this chat has a session slug. If it doesn't, reply: "No rapid
  session in this chat. Type `/rapid` to start one or `/rapid resume
  <slug>` to pick up an archived one." Do NOT silently operate on
  whatever `active` points to.
- **`/rapid resume <slug>` / `/rapid start <slug>`** → look up
  `sessions/<slug>.md` (or `sessions/archive/<slug>.md`); restore from
  archive if needed; bind the slug to this chat (Step 2 step 5).
  `start` and `resume` are interchangeable.

When you do need the session doc, read
`~/.rapid/sessions/<this-chat-slug>.md` directly. The doc on
disk is still the source of truth for queue state — do not rely on
conversation memory for note status, since you may be running across a
context compaction.

---

## Step 2 — Start or reuse a session (slug + doc + worktree)

When `/rapid` (or `/rapid <text>` or `/rapid start` with no slug) fires:

**Step 2·GC — Auto-reap finished sessions FIRST.** Before reusing or
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
3. Do this **silently** unless something was reaped — then prepend ONE
   line to the start acknowledgement, e.g. `Reaped 3 finished sessions
   (neon-heron, plush-koi, swift-badger).` Never block the new session on
   GC; if a reap step errors, skip that item and keep going.

The point: the user never has to remember `done`. Every `/rapid` start
leaves the repo with only live/unshipped sessions plus the new one.

**Step 2a — Try to reuse an empty session first.** Scan
`~/.rapid/sessions/` (NOT the archive) for any `.md` file
whose `## Notes` block has zero entries — no `[ ]`, `[~]`, `[c]`, `[x]`,
`[!]`, `[p]`, or `[-]` lines under that heading. (A `## Pushes` history
block is fine; it stays around after `wash`.) If one or more match, pick
the **oldest by file mtime**, bind its slug to this chat, and skip ahead
to step 6 — the doc, worktree, branch, and `active` pointer are already
in place from when that session was first created.

If a first note was passed as args, append it as note 1 inside the
reused doc and start working immediately. Acknowledge in one line:
- Reuse + first note: `Reusing rapid/<slug> at <worktree>. Picking up note 1: <text> — looking now.`
- Reuse, no first note: `Reusing rapid/<slug> at <worktree>. Drop notes anytime.`

If no empty session is found, fall through to step 2b and create a fresh
one. (Use the existing flow below.)

**Step 2b — Create a fresh session.** When no empty session is reusable:

1. **Generate a slug** in the form `<adjective>-<animal>`, lowercase, hyphenated.
   Pick from this pool (or improvise — just keep it short, two words, kid-safe):

   adjectives: amber, velvet, brisk, quiet, sturdy, neon, copper, glassy, lucid,
   silent, jagged, mellow, swift, bright, hushed, plush, ember, crisp, dusky, vivid

   animals: fox, otter, heron, lynx, badger, raven, gecko, marlin, falcon, koi,
   ibis, viper, panda, hare, owl, mantis, oryx, sable, tern, wren

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
   `~/worktrees/Maistro/amber-fox/` on branch `rapid/amber-fox`.

   If the worktree creation fails (existing path, dirty refs, network error
   on fetch), report the error verbatim and ask the user how to proceed.
   Do NOT silently fall through to doc-only — the user expects isolation.
4. **Create the doc** at `~/.rapid/sessions/<slug>.md` using the
   template below. Fill in the `Worktree` and `Branch` fields with the
   absolute worktree path and branch name (or `n/a` if doc-only).
5. **Write the slug** to `~/.rapid/active` (overwrite). This is
   a soft "most-recently-started" pointer for discovery (`resume`/`start`
   by slug) — it does NOT override another chat's session. Each chat
   tracks its own slug in conversation context (see Step 1); writing
   here is just a courtesy ping.
6. **Acknowledge in one line**, including the worktree path so the user can
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
- `[-]` dropped — user said skip it

> ⚠️ **`push` opens a PR and stops.** It does NOT auto-merge to `main`. Each `push` invocation cuts a brand-new combined branch and opens a brand-new PR. **Never amend or push more commits to a PR that's already been opened by an earlier `push`** — once a PR is opened, it's sealed from the skill's perspective. New `[c]` notes accumulate locally until the next `push`, which creates a *fresh* branch + a *fresh* PR for them.
>
> ⚠️ **A PR is sealed the moment its URL appears in the conversation — not just after Step 7.** If you created a PR outside the formal `push` flow (e.g. via a bare `git push` + `gh pr create` during ad-hoc work), and the PR URL was shared with the user, treat that PR as sealed immediately. Any subsequent work — even work done in the same "session" — must go on a brand-new branch off the latest `origin/main`. Never push additional commits to a branch whose PR URL has already been shared in the conversation.
>
> The path from `[~]` to `[x]` runs through `[c]` and then through Step 7's `push`, which flips notes to `[x]` upon successful PR open. Whether the PR has been merged is a downstream concern the user owns; `/rapid status` and `link` surface PR URLs the user can check on GitHub.

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
  `push` command (Step 7) or explicitly says "push it." Auto-pushing
  every finished note clutters GitHub with PRs the user has to triage
  individually and removes their chance to batch / reorder / drop work
  before it leaves the worktree.
- **When you finish a note's implementation, mark it `[c]` — NOT `[x]`.**
  `[c]` means "committed locally, awaiting `push`." `[x]` is reserved
  for notes whose commit has actually been pushed to a PR (Step 7).
  Only Step 7 flips `[c]` → `[x]`, and only after a successful PR open.
  This prevents orphaned branches: if the user never says `push`, the
  doc keeps showing `[c]` and `wash`/`clean`/`wipe`/`clear` (Step 8)
  will prompt for confirmation before emptying.
- Add the one-line outcome under the `[c]` box the same way you would
  under `[x]` — file path / "no-op, already correct" — so a future
  `push` has the per-note summary line ready to drop into the PR body.
- If a note needs a subagent, write that under the note before spawning:
  ```
    - delegated to general-purpose agent: <one-line task>
  ```
- If a note is unclear, flip it to `[!]` with an inline question; do not
  block on it — keep moving on the rest of the queue and surface the
  question in your reply.

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

## Step 6 — Status / done

**`/rapid status`** — Render **this chat's** session doc as a short summary:
```
rapid/<slug> — started <relative time>
in progress: <note>
queued (N): <first 3, then "+N more">
committed-unshipped (N) · shipped (N) · parked (N) · blocked (N)
```
The `committed-unshipped` count is the `[c]` notes — work that's done
locally but hasn't been pushed to a PR yet. If non-zero, mention it:
that's exactly the queue `push` would pick up. `parked` is the `[p]`
notes — explicitly set aside by the user; they stick around through
`wash` confirmations.

**Bare `status`** (just the word, no slash, while this chat has a
session) — Read this chat's session doc, count notes that are not `[x]`
or `[-]` (i.e. `[ ]` + `[~]` + `[c]` + `[!]` + `[p]`), and reply with
**only that number**. No prefix, no suffix, no explanation. Examples
of valid replies: `3`, `0`, `12`. If this chat has no session, do
nothing — treat the word as a normal message.

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
3. **Only if** `~/.rapid/active` currently holds this chat's
   slug, empty it (do not delete it). If it points at a different slug
   (another chat owns it), leave it alone — that chat is still using it.
4. Reply with the one-paragraph summary.

**`/rapid resume <slug>` / `/rapid start <slug>`** — Move the file back
from `archive/` to `sessions/` if needed, bind the slug to **this
chat's** conversation context, optionally update `active` (only if
currently empty or pointing at a slug whose doc no longer exists),
render status. `start` and `resume` are interchangeable. If `/rapid
start` is given without a slug, treat it as plain `/rapid` (reuse-or-new
per Step 2).

---

## Step 7 — Bare `push`

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

> ⚠️ **PRs are sealed once opened.** Once a `push` opens PR #N, never push
> additional commits to that PR — not from a follow-up `push`, not from a
> drive-by edit, never. New `[c]` notes accumulate locally until the next
> `push`, which cuts a *fresh* combined branch and opens a *fresh* PR. The
> batch number (`rapid/<slug>-batch-1`, `-batch-2`, …) increments every
> push so the boundary is loud. If the user wants more changes folded
> into an open PR, they say so explicitly — otherwise treat each PR as
> closed-for-edits the moment it's opened.

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
   sections + 1, e.g. `rapid/amber-fox-batch-1`). The branch name MUST
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
   If a cherry-pick conflicts, stop and ask the user — do not resolve
   blindly. Most rapid notes touch disjoint files so this is rare.
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
     - feat/lyrics-line-block-ops, feat/theme-accent-hue-slider, fix/confirm-modal-glass, …
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

## Step 8 — Bare `wash` / `clean` / `wipe` / `clear`

All four words are aliases for the same action. When the user texts just
one of them (no slash, no other content) while **this chat has a
session**, they want to **empty the session file in place** so the slug,
worktree, branch, and `## Pushes` history all survive for reuse on the
next batch of notes. The normal flow is "we shipped + merged the last
PR, now drop the notes queue so we can keep going on the same
session." If this chat has no session, see the exception block above —
the word becomes a "clean slate" signal that silently starts a fresh
session via Step 2.

> ⚠️ **Empty in place, do not delete.** `wash` does NOT remove the
> session doc, worktree, branch, or `active` pointer. It clears the
> `## Notes` block and leaves everything else intact. Use `burn`
> (Step 11) if you actually want to nuke files.

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

   - If the user replies `wash force` (or `clean force` / `wipe force` /
     `clear force` / a clear "yes wipe it" variant): proceed to step 3.
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
4. **Leave the slug, worktree, branch, and `active` pointer alone.** No
   git operations, no file deletions. The same worktree is ready for
   the next note.
5. **Reply in one line**: `Washed rapid/<slug> — notes cleared, worktree
   still at <path>. Drop new notes anytime.` Then stop — no recap, no
   summary, no work.
6. **Do nothing else.** Do not start a new session, do not push, do not
   pre-empt the next note. The user will drive.

What happens next:

- **Next message is a drive-by note**: this chat still has the same
  session bound, so append it as note 1 of the new batch and proceed
  through Step 4 normally. The doc is empty but the slug is still
  ours.
- **Next message is `/rapid <text>`**: Step 2 fires. Since `sessions/`
  now contains an empty doc (this chat's just-washed one), Step 2a
  will see it as reusable and rebind it. Net effect: same session,
  new first note. Do not create another doc.
- **No follow-up arrives**: the washed doc sits in `sessions/` as a
  reusable shell. Future `/rapid` invocations (this chat or another)
  may adopt it via Step 2a's empty-session reuse.

Edge cases:
- **No session in this chat when `wash` arrives**: see the exception
  block above — treat it as a "clean slate" signal and start a fresh
  session via Step 2, no first note.
- **Worktree path no longer exists** (user deleted it manually): empty
  the notes block anyway and update `**Worktree:**` to `n/a` so the
  doc reflects reality. Mention it in the reply.
- **`## Notes` heading missing entirely** (malformed doc): re-emit the
  template skeleton (notes + pushes blocks) and proceed.
- **Confirmation refused**: do nothing destructive. The session
  continues unchanged.

---

## Step 9 — Bare `park` / `park <N>`

When the user texts `park` or `park <N>` while **this chat has a
session**, they want to **set a note aside** — not done, not dropped,
just parked for later. The note keeps its branch, any commits, and any
sub-bullets; only its status box changes to `[p]`. If this chat has no
session, treat as a normal message.

Use cases the user gives:
- Mid-batch the note hits a question only the user can answer → park it,
  keep moving on the rest of the queue.
- A note turns out to need design input / external info / a teammate's
  PR to land first → park it, surface in the next status.
- The user explicitly says "skip this for now" → park (don't drop unless
  they say drop).

Behavior:

1. **Resolve N**:
   - `park` (no argument) → target the current `[~]` note. If there is
     no `[~]`, reply `Nothing in progress to park — say "park <N>" with
     a note number.` and stop.
   - `park <N>` or `park #<N>` → target the Nth note in the doc's
     `## Notes` block, counting from 1, including all status types.
   - If N is out of range, reply with the count and stop.
2. **Flip the note's status box to `[p]`** in the session doc. Append
   an indented sub-bullet capturing why it's parked, if obvious from
   context (e.g. `parked [HH:MM]: needs confirmation on color token`).
   If the reason isn't obvious, just stamp the timestamp.
3. **If the parked note was `[~]`**, also write a `paused at: <state>`
   sub-bullet describing where the in-flight work left off (file path,
   what's still incomplete, what the next step would be). This lets a
   future resume pick up cleanly.
4. **Acknowledge in one line**: `Parked note <N>: <one-line summary>.
   <next action>` where next action is one of:
   - If there are more `[ ]` or paused `[~]` notes: `Picking up note <M>: <summary>.` Then continue Step 5's between-notes flow.
   - If nothing is left to do: `Queue clear (1 parked).` Stop.
5. **Parked notes count in pending totals** (bare `status`, `/rapid
   status`). They are NOT pushed by `push`. They trigger confirmation
   in `wash` and `done`/`off`.

Rules:
- **Parking is reversible.** The user can flip `[p]` back to `[ ]` /
  `[~]` any time by sending a drive-by note like "unpark 3" or
  "resume 3" — handle that as a normal request, not a formal command,
  and start the note.
- **Park does not drop.** Use `[-]` (dropped) only when the user
  explicitly says skip/drop/forget it. Parking implies "later," dropping
  implies "never."
- **Park is local.** It writes to the doc; it does NOT touch git.
  Branches stay where they are.

---

## Step 10 — Bare `test` / `testdrive`

`test` and `testdrive` are aliases. When the user texts just one of them
while **this chat has a session**, **you verify the work end-to-end
yourself** before the user does. If this chat has no session, ignore —
it's a normal message. This exists because the failure mode of this
skill is: user asks → push → wait 10 min for deploy → user comes back,
nothing changed. `test`/`testdrive` is the antidote.

Behavior:

1. **Identify the target.** Default to the most recent `[x]` note whose PR
   is either merged-and-deployed *or* pushed (preview deploy expected). If
   there's a current `[~]` and the user just pushed it, target that
   instead. If unclear, ask in one line.
2. **Pick the right testing surface** based on the note's content:
   - Web UI / login / styling / navigation → `agent-browser` against the
     deployed URL (preview for an open PR, prod for a merged one).
   - iOS / Safari-specific behavior → iOS simulator (`xcrun simctl`) +
     `agent-browser` if the simulator surface is exposed, otherwise
     describe what you'd check manually and *do not* claim success.
   - API / backend → `curl` / a fetch script with real production-shaped
     payloads.
   - Server-rendered output / CSS resolution / build artifacts → curl the
     deployed page and grep the actual HTML/CSS.
3. **Wait for the deploy if needed.** If the PR's preview is still
   building, poll Vercel / the deploy host until it's ready (don't sleep
   blindly — check status). Do not test against an outdated build.
4. **Run the actual user-facing flow,** not a proxy for it. "The class
   name appears in the HTML" is *not* a substitute for "the button
   actually looks styled in a real browser." If you can't run the real
   flow, **say so explicitly** — never claim success on inference.
5. **Report a verdict**, in this shape:

   ```
   test: <note one-liner>
   surface: <browser preview / prod / iOS sim / curl / etc.>
   url / target: <where you actually tested>

   ✅ pass — <one-line: what you saw that confirms it works>
   or
   ❌ fail — <one-line: what you saw that contradicts the fix>
     evidence: <screenshot path / console log / curl output snippet>
     likely cause: <one-line hypothesis, no fix yet>
   or
   ⚠️ inconclusive — <one-line: what you couldn't verify and why>
   ```

6. **If pass:** stop. The user can decide what's next. Do not start the
   next note unprompted.
7. **If fail:** the failed note flips back to `[~]`, append a sub-bullet
   `test failed [HH:MM]: <what broke>`. Then *ask* before retrying — the
   user may want to pivot, gather more info, or stop. Do not auto-loop on
   a fix-and-test cycle.

Rules:
- **No vibes-based passes.** "Looks right to me" / "should work" is not a
  pass. Either you saw the working flow with your own tools or you didn't.
- **Always report the URL/target you tested against.** A pass on
  `localhost:3000` when prod is broken is a fail.
- **Screenshots beat prose.** When the test surface is a browser, capture
  a screenshot via `agent-browser` and reference it in the report so the
  user can spot-check.
- **Inconclusive is honest.** If the testing tool isn't available (e.g.
  no agent-browser, no simulator) say so and stop. Do not pretend.

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
  Claude-Code-only assumptions into the session doc.
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
1. Generates slug `amber-fox`, no collision in `sessions/` or `archive/`.
2. Creates the worktree + branch (Step 2).
3. Writes `sessions/amber-fox.md` with note 1 = `[~] [14:32] avatar in sidebar feels too small`.
4. Writes `amber-fox` to `active` (soft pointer).
5. Binds `amber-fox` as **this chat's** slug in conversation context.
6. Replies: `Started rapid/amber-fox at <worktree>. Picking up note 1: avatar size in sidebar — looking now.`
7. Begins the work.

User (3 minutes later, same chat): `also the title bar text wraps weird at 1280px`

Claude (drive-by note, this chat owns `amber-fox`):
1. Appends note 2 to `amber-fox.md` as `[ ]`.
2. Replies: `Noted (queued as note 2). Finishing avatar size first.`
3. Continues.

User (later, in **a different chat**): `/rapid the export button is dead`

Claude in that other chat:
1. Step 2a scans `sessions/` for empty docs. `amber-fox.md` has live
   notes, so it's NOT reusable; no other empty docs exist.
2. Falls through to 2b: generates slug `velvet-otter`, creates its own
   doc + worktree on `rapid/velvet-otter`.
3. Overwrites `active` with `velvet-otter` (the soft pointer just tracks
   "most recently started"; the original `amber-fox` chat doesn't care).
4. Replies: `Started rapid/velvet-otter at <worktree>. Picking up note 1:
   export button — looking now.`

Both sessions run concurrently, each chat operating on its own slug.

---

## Example — reusing a washed session

User (in the same chat as `amber-fox`, after `push` + merge):
`wash`

Claude:
1. Reads `amber-fox.md`. All notes are `[x]` shipped, no parked, no
   uncommitted, no in-progress. No risk → skip confirmation.
2. Empties the `## Notes` block, leaves the `## Pushes` history intact.
3. Replies: `Washed rapid/amber-fox — notes cleared, worktree still
   at ~/worktrees/Maistro/amber-fox/. Drop new notes anytime.`

User (next message): `the empty state copy on the dashboard reads weird`

Claude:
1. This chat still owns `amber-fox`. Appends as note 1 of the new batch.
2. Replies: `Noted (in progress now): empty-state copy on the dashboard
   — looking now.`
3. Begins work on the same worktree — no new branch, doc, or `active`
   needed.

User later: `link 3`

Claude: prints the 3 most recent PR URLs from `## Pushes` (the pre-wash
batch is still there).

---

## Step 11 — Bare `burn`

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
   - **Unpushed local commits** on in-scope branches.
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
   f. **`active` pointer**: if it holds a slug whose doc was just
      deleted, truncate to zero bytes.
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

Rules:
- **Confirmation is mandatory.** Never auto-burn, even on an empty repo.
  The word is too final.
- **Merged PRs are safe to lose.** GitHub keeps the PR record.
- **Open PRs need explicit opt-in.** Deleting their branch closes them,
  which is irreversible from the skill's side.
- **`burn` does not push.** If the user wants in-flight work shipped
  first, they should `push` (Step 7) before burning.

---

## Step 12 — Bare `link` / `link <N>`

When the user texts `link` or `link <N>` (case-insensitive, optionally
with a leading `#` on the number like `link #3`) and **this chat has a
session**, print the URL(s) of recent PRs opened from this session. No
preamble, no commentary — the user wants the links.

Behavior:

1. **Read this chat's session doc** (`sessions/<slug>.md`) and extract
   the `## Pushes` block. Each push entry follows the format set by
   Step 7:
   ```
   - batch N — <date> → rapid/<slug>-batch-N → PR #<n> (open)
     - branch1, branch2, ...
   ```
   Out-of-band PRs (e.g. follow-up hotfixes opened on a non-batch
   branch and recorded by the user or by you) may also live in the
   doc — recognize any line in the doc containing a `PR #<n>` token
   and the corresponding GitHub URL, in chronological order they were
   added.

2. **Resolve N**:
   - `link` (no argument) → N = 1
   - `link <N>` or `link #<N>` → N = that integer
   - If N exceeds the number of PRs in the doc, return all of them
     and add a one-line note: "Only M PRs in this session." (only when
     the user asked for more than were available)

3. **Output the URLs**, newest first, as compact markdown:
   ```
   - **PR #<n>** — <one-line summary from the push entry or commit title>: https://github.com/<owner>/<repo>/pull/<n>
   ```
   Resolve `<owner>/<repo>` from the repo's `origin` remote
   (`git remote get-url origin`). If the doc only stored the PR
   number without a full URL, build it from the resolved repo root.

4. **No work, no diffs.** This is read-only. Don't open the PRs to
   inspect them; don't run `gh pr view`. The user wants the links —
   that's it.

Edge cases:
- **No session in this chat** → treat as a normal message.
- **Session doc has no `## Pushes` block** → reply: "No PRs from this
  session yet." Stop.
- **`link 0` or negative** → reply: "N must be ≥ 1." Stop.
- **Doc is malformed / unreadable** → say so in one line, don't guess.

Never queue `link` (or `link <N>`) as a note. It's always a query.

---

## Step 13 — Bare `reverse <N>` / `undo <N>`

`reverse` and `undo` are aliases. When the user texts one of them with a
note number (e.g. `reverse 8`, `undo #3`) while **this chat has a
session**, they want the work done on note N **rolled back**. The user
signals this when you did something wrong, ran in a direction they
didn't want, or the note's outcome turned out to be incorrect. If this
chat has no session, treat as a normal message.

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
  underlying spec was right, that's a refinement (Step 4, fold-in) —
  not a reverse. Save reverse for "this direction was wrong, start
  over."

---

## Step 14 — Bare `scrap`

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
   - **Unpushed commits** on session-owned branches (compare
     against `origin/main` and the branch's upstream if any).
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
6. **Clear this chat's slug binding** in conversation context. **Only
   if** `active` holds this slug, truncate it to zero bytes; otherwise
   leave it alone.
7. **Reply in one line**, mentioning anything left behind:
   - Clean case: `Scrapped rapid/<slug> (worktree + branch + doc). Standing by.`
   - With surviving open-PR branches: `Scrapped rapid/<slug> (worktree + doc deleted). Left these branches with open PRs alone: <list>. Standing by.`
8. **Stop.** No new session, no recap, no work. The user explicitly
   chose `scrap`.

What happens next:

- **Next message is `/rapid <text>`**: Step 2 fires — Step 2a will
  scan `sessions/` for empty docs (this scrapped one is gone, so
  it's not in scope). A fresh session is created.
- **Next message is a drive-by note**: this chat has no session
  anymore — do NOT silently start one. Treat the message as a
  normal request.

Edge cases:
- **No session in this chat when `scrap` arrives**: treat as a
  normal message — do nothing.
- **Worktree already deleted manually**: skip step 3.
- **Branch deletion fails** (currently checked out in main checkout):
  `cd <repo-root>`, `git checkout main`, retry. Don't guess further.
