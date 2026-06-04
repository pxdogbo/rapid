# rapid — a realtime note queue for AI coding agents

You're using your product live. You spot things — a misaligned button, a dead
link, copy that reads weird. You can't wait for the agent to finish its current
task, and you can't keep opening new chats. `/rapid` turns the agent into a
ticket queue: drop observations as they come, and it captures, prioritizes,
implements, and ships them in batched PRs — without ever losing its place.

```
you:    /rapid the avatar in the sidebar feels too small
agent:  Started rapid/amber-fox at ~/worktrees/Maistro/amber-fox.
        Picking up note 1: avatar size — looking now.

you:    also the title bar text wraps weird at 1280px
agent:  Noted (queued as note 2). Finishing avatar size first.

you:    status
agent:  2

you:    push
agent:  PR open → https://github.com/you/repo/pull/123
        (2 notes shipped on rapid/amber-fox-batch-1)
```

## What it does

- **Persistent queue.** Every note lands in a session doc on disk
  (`~/.rapid/sessions/<slug>.md`) *before* work starts. Context compaction,
  chat restarts, drive-by interruptions — the doc is the source of truth,
  so nothing is ever dropped.
- **Worktree isolation.** Each session gets its own git worktree under
  `~/worktrees/<repo>/<slug>/` on a fresh branch off `origin/main`. Your main
  checkout stays pristine; concurrent sessions in different chats never
  collide.
- **One branch per note, one PR per push.** Every note is implemented on its
  own branch off `origin/main` (bisectable), but `push` rolls all unshipped
  work into a single combined branch + a single PR. Your PR list doesn't get
  flooded with eight one-line PRs.
- **Sealed PRs.** Once a PR's URL is shared, that PR is closed-for-edits. New
  work accumulates locally until the next `push` cuts a fresh batch. No
  surprise commits landing on a PR you already reviewed.
- **Smart triage.** A new note is either folded into the current task (spec
  refinement), queued, or pivoted to (when it's blocking you) — and the agent
  says which, in one line.
- **Self-cleaning.** Every session start garbage-collects finished sessions:
  stale worktrees, merged branches, and shipped docs get reaped automatically.
  You never have to remember to run `done`.

## Install

It's a single file. Drop it where your agent reads skills from:

```bash
# Claude Code
git clone https://github.com/pxdogbo/rapid ~/.claude/skills/rapid
```

Works in any agent that reads markdown skills (Claude Code, Codex CLI, etc.) —
session state lives in plain files under `~/.rapid/`, never in tool-specific
storage.

## Commands

Start with the slash command, then drive everything with bare words mid-session.

| Command | What it does |
|---|---|
| `/rapid` / `/rapid <note>` | Start a session (reuses an empty one if available) — fresh doc + worktree on `rapid/<slug>` |
| *(any message)* | Drive-by note → appended to the queue before anything else happens |
| `status` | Replies with **just a number**: tickets remaining |
| `push` | Finish current note, roll every unshipped note into ONE combined branch + ONE PR, stop at PR-open |
| `add` / `carpool` | Like `push`, but ride along on the most recent still-open PR instead of cutting a new one |
| `test` / `testdrive` | Agent verifies the last shipped note end-to-end itself (browser, simulator, curl) and reports ✅/❌/⚠️ with evidence |
| `park` / `park <N>` | Set a note aside without dropping it |
| `link` / `link <N>` | Print recent PR URLs from this session |
| `reverse <N>` / `undo <N>` | Roll back note N's work — discard, delete branch, or close PR (with confirmation) |
| `wash` / `clean` / `wipe` / `clear` | Empty the queue in place; keep slug, worktree, and push history for reuse |
| `scrap` | Delete this one session entirely (doc + worktree + branch) |
| `burn` | Nuke ALL rapid artifacts for the current repo (confirms first, lists what's at risk) |
| `/rapid status` | Full session summary |
| `/rapid done` / `end` / `off` | Archive the session (flags unshipped work first) |
| `/rapid resume <slug>` | Re-activate an archived session in this chat |

## The queue

Each note carries a status box in the session doc:

| Box | Meaning |
|---|---|
| `[ ]` | pending |
| `[~]` | in progress |
| `[c]` | committed locally — awaiting `push` |
| `[x]` | shipped — on a PR (URL recorded under the note) |
| `[p]` | parked |
| `[!]` | blocked — needs your input |
| `[-]` | dropped |

The path to done always runs `[~]` → `[c]` → `push` → `[x]`. Nothing is marked
shipped until a PR actually exists, and `push` never auto-merges — you merge
via the GitHub UI when you're ready.

## Storage layout

```
~/.rapid/
├── active                  # slug of the most recently started session
├── sessions/
│   ├── amber-fox.md        # live session doc (queue + push history)
│   └── archive/            # ended sessions
~/worktrees/
└── <repo>/
    └── amber-fox/          # the session's isolated working dir
```

Multiple chats (or machines) can run concurrent sessions — each chat binds to
its own slug; the `active` file is just a discovery pointer, never an owner.

## Design notes

- **Append before acting.** The doc must never lag behind the conversation.
- **No vibes-based passes.** `test` either runs the real user-facing flow with
  real tools or reports *inconclusive* — "should work" is not a verdict.
- **Confirmation before destruction.** `wash`, `scrap`, `reverse`, and `burn`
  all inventory what's at risk (parked notes, unpushed commits, open PRs) and
  wait for an explicit `force` before touching anything irreversible.
- **Desktop + mobile by default.** Every UI note is assumed to apply to both
  surfaces unless explicitly scoped — where you *noticed* a bug isn't where it
  should be fixed.

## License

MIT
