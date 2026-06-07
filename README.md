# rapid — a realtime note queue for AI coding agents

You're using your product live. You spot things — a misaligned button, a dead
link, copy that reads weird. You can't wait for the agent to finish its current
task, and you can't keep opening new chats. `/rapid` turns the agent into a
ticket queue: drop observations as they come, and it captures, prioritizes,
implements, and ships them in batched PRs — without ever losing its place.

```
you:    /rapid the avatar in the sidebar feels too small
agent:  Started rapid/amber-kart at ~/worktrees/Maistro/amber-kart.
        Picking up note 1: avatar size — looking now.

you:    also the title bar text wraps weird at 1280px
agent:  Noted (queued as note 2). Finishing avatar size first.

you:    review
agent:  rapid/amber-kart — review
        done, unshipped: #1 avatar sizing (say `push`)
        in progress:     #2 title bar wrap

you:    push
agent:  PR open → https://github.com/you/repo/pull/123
        (2 notes shipped on rapid/amber-kart-batch-1)
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
- **Sealed PRs — with one escape hatch.** Once a PR's URL is shared, that PR
  is closed-for-edits; new work accumulates until the next `push` cuts a
  fresh batch. The one exception is you saying `carpool`, which rides the
  latest work onto the most recent still-open PR.
- **Overlap aware.** Before starting a note the agent checks whether its
  files were already changed by an unmerged earlier note — it builds on
  unshipped work instead of contradicting it, and asks (carpool or park?)
  when a file is sitting in an open PR.
- **Smart triage.** A new note is either folded into the current task (spec
  refinement), queued, or pivoted to (when it's blocking you) — and the agent
  says which, in one line.
- **Self-cleaning.** Every session start garbage-collects finished sessions
  (stale worktrees, merged branches, shipped docs) and fast-forwards your
  local `main` when it's clean. You never have to remember to run `done`.

## Install

**Every agent at once** (Claude Code, Codex, Cursor & friends) via the
[skills CLI](https://skills.sh):

```bash
npx skills add pxdogbo/rapid
```

**Or a single tool** with a plain clone:

```bash
# Claude Code
git clone https://github.com/pxdogbo/rapid ~/.claude/skills/rapid

# Codex CLI
git clone https://github.com/pxdogbo/rapid ~/.codex/skills/rapid
```

Session state lives in plain files under `~/.rapid/`, never in
tool-specific storage — every installed agent reads and writes the same
queues. The first `/rapid` walks you through a one-time setup: it explains
where files go and lets you pick different locations (saved to
`~/.rapid/config.json`).

### Updating

The agent checks for a new version at most once a day (at session start,
fail-silent) and mentions it in one line — it never applies anything on
its own. `/rapid update` shows the changelog (and the full diff on
request) **before** asking to apply; clone installs then `git pull`,
skills-CLI installs run `npx skills update`.

### Why you can trust updates

- **Markdown-only.** The skill ships zero executable code — no binaries,
  no postinstall hooks, no scripts. An update is a human-readable text
  diff and nothing else.
- **Preview before apply.** `/rapid update` shows what changed (changelog
  + full diff on request) and waits for your yes. The daily version check
  only *mentions* new versions.
- **Tagged + auditable.** Every release is a git tag on this public repo —
  compare any two versions:
  [`v1.0.0...v1.1.0`](https://github.com/pxdogbo/rapid/compare/v1.0.0...v1.1.0).
- **Read it like code.** Skills run with your agent's permissions, so
  treat them like a dependency: skim the diff before you accept. The
  whole skill is ~7 files of markdown — it's a five-minute read.

## Commands

Start with the slash command, then drive everything with bare words mid-session.

| Command | What it does |
|---|---|
| `/rapid` / `/rapid <note>` | Start a session (reuses an empty one if available) — fresh doc + worktree on `rapid/<slug>` |
| *(any message)* | Drive-by note → appended to the queue before anything else happens |
| `review` / `recap` | Session recap: shipped (with PR links), done-but-unshipped, in progress, queued, parked, blocked |
| `push` | Finish current note, roll every unshipped note into ONE combined branch + ONE PR, stop at PR-open |
| `carpool` | Ride the latest work along on the most recent still-open PR instead of cutting a new one |
| `test` / `testdrive` | Agent verifies the last shipped note end-to-end itself (browser, simulator, curl) and reports ✅/❌/⚠️ with evidence |
| `park` / `park <N>` | Set a note aside without dropping it |
| `unpark <N>` | Flip a parked note back into the queue |
| `drop <N>` | Mark note N dropped — "never," not "later" (bookkeeping only; `reverse` discards work) |
| `link` / `link <N>` | Print recent PR URLs from this session |
| `reverse <N>` / `undo <N>` | Roll back note N's work — discard, delete branch, or close PR (with confirmation) |
| `wash` / `clean` | Empty the queue in place; keep slug, worktree, and push history for reuse |
| `scrap` | Delete this one session entirely (doc + worktree + branch) |
| `burn` | Nuke ALL rapid artifacts for the current repo (confirms first, lists what's at risk) |
| `/rapid done` / `end` / `off` | Archive the session (flags unshipped work first) |
| `/rapid resume <slug>` | Re-activate an archived session in this chat |
| `/rapid update` | Pull the latest skill version and show what changed |

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
├── config.json             # one-time setup: paths, last update check
├── sessions/
│   ├── amber-kart.md        # live session doc (queue + push history)
│   └── archive/            # ended sessions
~/worktrees/
└── <repo>/
    └── amber-kart/          # the session's isolated working dir
```

Both roots are configurable in `config.json`. Multiple chats (or machines)
can run concurrent sessions — each chat binds to its own slug.

## Repo layout

```
SKILL.md          # the core loop — what the agent loads on every session
references/       # heavy verbs, read on demand when their trigger fires
├── push.md       #   push, carpool
├── cleanup.md    #   wash, scrap, burn
├── notes.md      #   park, unpark, drop, link
├── reverse.md    #   reverse / undo
├── test.md       #   test / testdrive
└── setup.md      #   onboarding, config.json, /rapid update
CHANGELOG.md
```

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
