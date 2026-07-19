---
name: rapid
version: 1.25.0
user-invocable: true
description: >
  Rapid session — capture realtime notes from the user while working with a
  live product (app, website, etc.) without losing context. Bare `/rapid` (or
  `/rapid start` with no slug) opens an instant menu — new session, resume,
  cleanup, review, handoff, update, help — and does nothing until you pick, so
  starting never blocks on housekeeping or the network. `/rapid <note>` skips
  the menu and captures straight into a new-or-reused session (fresh doc +
  sibling git worktree on a `rapid/<slug>` branch). Cleanup of finished
  sessions only ever runs when you ask for it (the menu's Cleanup option, or
  `tidy`/`burn`) — never automatically at start. Drive-by notes and bare-word
  triggers (review/recap, push (→ always
  commits the queue and opens a PR, never a bare git push), carpool,
  wash/clean, park, unpark, drop, test/testdrive, scrap, tidy, burn,
  link, reverse/undo, inbox) operate on the session this chat started, not on
  whatever doc happens to be marked active globally. wax grooms the doc in
  place (condense + group + de-stale) without emptying the queue. handoff
  seeds a scoped plan as a standalone session a fresh chat adopts; collab is
  a chatroom between two live agents; inbox leaves an async note in another
  session's doc (no loop, no poke — it never triggers the peer; to task or
  talk to a live agent use collab) for it to pick up later. Use
  whenever the user types /rapid, /rapid <note>, /rapid review, /rapid
  done, /rapid off, /rapid update, /rapid handoff, or says they want
  to "start a rapid session" / "drop a quick note" mid-task.
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

- **Plain language. One-sentence bullets. No code, no file names.** The owner is not a developer and reads on mobile. Never put code snippets, file paths, or API/symbol names in a reply. Keep all of that in the work and the session doc. They care about what the feature does, the UX, and that the code is clean and performant, not how it works. Add implementation detail only when they explicitly ask for it.
- **Lead with the answer or status** — no preamble, no restating the request.
- **Match the format to the data, don't default to prose.** Pick whatever renders the information most legibly:
  - **Tables** for comparisons or any 3+ items with shared attributes.
  - **Bulleted / numbered lists** for parallel items or ordered steps.
  - **Checklists** (`- [x]` / `- [ ]`) for multi-step progress or done/pending status.
  - **Fenced code blocks** for commands, paths, diffs, config, and JSON. Only when the owner has asked to see them or is clearly technical; default to none for a non-technical owner.
  - **Diagrams** when structure matters — mermaid (`flowchart`, `sequenceDiagram`, `gantt`) for flows/timelines, or ASCII when the client can't render mermaid.
  - Keep lines short regardless of format.
- **Compress, don't omit** — keep every fact that matters; cut the connective prose, not the information.
- Working the queue → **one line of status per note**. Reserve longer prose only for a "why" or a decision the user must make.

## Never assert PR / deploy status without checking

Before you tell the user anything about a PR — open, merged, mergeable,
shipped, deployed, or "won't take effect until X merges" — **run `gh pr view
<n> --json state,mergedAt,mergeStateStatus` first** (and check the deployment
if that's part of the claim). The user frequently merges and ships within
minutes of getting the link, so anything you "remember" about a PR's state is
stale. Report the verified state, never the assumed one.

## Verify the PR is still OPEN before any git write

Before pushing, merging, running `gh pr edit`, or adding any commit to an
existing branch, **run `gh pr view <branch-or-#> --json state,mergedAt` and
confirm the PR is still OPEN.** The user merges within minutes, so a PR you
opened earlier in this same session may already be merged. A merged or closed
PR is **sealed**: commits pushed to its branch afterward land in no PR and
never reach `main`. If it is merged/closed, cut a fresh branch off current
`main` and open a NEW PR for the new commits — never keep piling onto the
sealed branch. This holds even outside a formal rapid session: any time you do
anything with git for the user (push, merge, edit a PR), check first.

## Close superseded / stale PRs yourself — never hand PR housekeeping to the user

The user acts on PRs straight from GitHub **notifications** and merges
within minutes, usually **without reading your chat reply**. A chat line
like "close #397 and merge #398 instead" will simply be missed — they
merge whatever notification they see. So never leave PR cleanup as an
instruction for the user. Do it yourself:

- **A new PR supersedes an earlier one** (it replaces a revert, a
  placeholder, a rejected attempt, or duplicates the work) → **close the
  obsolete PR yourself**: `gh pr close <n> --comment "Superseded by
  #<new> — …" --delete-branch`, then mention it in one line.
- **A PR you already shared goes stale/conflicting** because `main` moved
  under it (another PR merged in between) → fix it unprompted. Per the
  frozen-PR rule (don't force-push a shared PR), **rebase the work onto
  current `main` on a fresh branch, open the corrected PR, and close the
  stale one yourself.** Detect it with `gh pr view <n> --json
  mergeStateStatus` (CONFLICTING / DIRTY = act now).
- Litmus test before writing "merge X instead of Y": could the user ever
  *see* that instruction in time? If the safe outcome depends on them
  reading chat, it isn't safe — make the **open PR list itself correct**
  (exactly one mergeable PR, the right one) so merging-from-notification
  always does the right thing.

This is housekeeping, not a scope change — it does not need permission.

This file holds the core loop (start a session, capture notes, work the
queue, review, archive). The heavier verbs live in reference files next to
this one — **read the reference file when its trigger fires**, not before:

| File | Covers |
|---|---|
| `references/push.md` | `push`, `carpool` |
| `references/wax.md` | `wax` |
| `references/handoff.md` | `handoff` (hand a session / note / plan to a fresh chat) |
| `references/collab.md` | `collab` (cross-agent chatroom); **Live mode** (real-time poke), **Spin up a collab set** (`/rapid collab <N>`), **Enabling live mode** (`/rapid collab setup`); `references/collab-live/` is the relay + `collab-start` helper |
| `references/inbox.md` | `inbox` (leave an async note in another session's doc — no loop, no poke) |
| `references/cleanup.md` | `wash`/`clean`, `scrap`, `tidy`, `burn` |
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
| `/rapid` (bare)         | **Open the instant menu** — new session, resume, cleanup, review, handoff, update, help — and stop. Nothing is created, scanned over the network, or cleaned up until you pick. See Step 2·menu. |
| `/rapid <text>`         | **Skip the menu — capture immediately.** Reuse an empty session in this chat if one exists (oldest in `sessions/` with zero notes), else start a brand-new one, append `<text>` as note 1, and start working it. No cleanup runs. See Step 2a/2b. |
| `review` / `recap` (bare word, mid-session) | Session recap: what shipped (with PR links), what's done-but-unshipped, in progress, queued, parked, blocked. See Step 6. |
| `push` (bare word, mid-session) | Finish the current `[~]` note, commit it, cut a fresh combined branch + open a new PR for it and any other unshipped `[c]` notes. Stop at PR-open. See `references/push.md`. **In a live collab, `push` is the lead's**: workers never open the PR; the lead ships the combined work, then sends `/compact` into each worker pane (they're carrying shipped-lane context they no longer need), and ends its reply with the PR link. See `references/collab.md` → "push in a live collab". |
| `carpool` (bare word, mid-session) | **Add the latest work to the MOST RECENT still-open PR from this session** instead of cutting a new branch/PR. This is the one sanctioned way to amend an open PR. If that PR is merged/closed (or none exists), fall back to `push`. See `references/push.md`. |
| `test` / `testdrive` (bare word, mid-session) | Actually verify the most recent `[c]`/`[x]` note (or the current `[~]`) end-to-end yourself — browser, simulator, curl, whatever the work calls for. **In a live collab the lead never runs this itself** — it sends testing instructions to a rider and relays the verdict back. See `references/test.md`. |
| `park` / `park <N>` (bare word, mid-session) | Mark a note as **parked** (`[p]`) so it sticks around but is set aside. `park` alone → park the current `[~]`. See `references/notes.md`. |
| `unpark <N>` (bare word, mid-session) | Flip a parked note back into the queue (or straight to in-progress if nothing else is pending). See `references/notes.md`. |
| `drop <N>` (bare word, mid-session) | Mark note N dropped (`[-]`) — "never," not "later." Bookkeeping only; use `reverse` to also discard work. See `references/notes.md`. |
| `link` / `link <N>` (bare word, mid-session) | Print the URL(s) of recent PRs opened from **this chat's** session, newest first — and, when the repo is a web project, the project's dev and production URLs (resolved from local config only, cached in the doc's `**Links:**` header). See `references/notes.md`. |
| `reverse <N>` / `undo <N>` (bare word, mid-session) | **Undo the work done on note N** — discard uncommitted changes, reset committed branches, or close pushed PRs (with confirmation). See `references/reverse.md`. |
| `wax` (bare word, mid-session) | **Groom** this chat's session doc in place — condense finished notes, group related ones, refresh in-progress state, strip stale sub-bullets. Keeps the whole live queue; doc-only, no git. See `references/wax.md`. |
| `collab` (bare word, mid-session) | **Check the collab room + drive the loop.** Re-read this chat's `## Collab` (and any room it joined), surface new peer messages since last check (loudly flag any awaiting reply), act on what the peer cleared, then (re-)arm the autonomous poll loop. No live channel: the user relays once per side to start each agent; after that the agents self-poll. On stop it posts an explicit status to the room so the peer knows which happened (and isn't left thinking the work just paused): `[DONE]` (work finished) or `[PAUSED]` (idle after 3 *consecutive* quiet checks ~5 min apart — any new peer note resets that count, NOT finished), echoed in your chat too. **Live mode** (config `collabLive` + tmux): agents CHAT directly — a send types your message straight into the peer's chat in real time and writes NOTHING to the doc (live is chat-only; `## Collab` stays empty but for the hand-written roster line naming the pair + driver); no relay, no "go read the room", no per-message room lines — but the LEAD keeps a ~5-min **sentinel** on outstanding workers: a cheap tmux liveness probe (is the worker's pane still running?), nothing read while it's busy; only a worker that went IDLE without reporting triggers a nudge to report through collab. Never lapses while a lane is outstanding. See `references/collab.md`. |
| `inbox` (or "check inbox" / "check your inbox" / "read your inbox", mid-session) | **Read this chat's `## Inbox`** — async notes other chats left for this session. Show unread (`[ ]`) notes, mark them read (`[x]`), and offer to pull actionable ones into `## Notes`. The user triggers this manually when they're ready; nothing surfaces a note on its own. No loop, no poke. See `references/inbox.md`. |
| `wash` / `clean` (bare word, mid-session) | **Empty** this chat's session file in place so it can be reused — keeps slug, worktree, branch, and `## Pushes` history. Confirms first if anything risky is in flight. See `references/cleanup.md`. |
| `scrap` (bare word, mid-session) | **Delete this chat's session entirely** — doc, worktree, and local branch. Confirms first if anything risky is in flight. See `references/cleanup.md`. |
| `tidy` / `reap` (bare word, any time) | **Reap finished sessions for the current repo now** — the same sweep the menu's Cleanup option runs: removes worktrees, deletes merged/closed branches, and `rm`s docs for *finished* (shipped/safe) sessions only, leaving live/unshipped/parked/blocked work and other repos untouched. Prints a summary; no confirmation needed (it removes only shipped, safe work). Lighter than `burn`. Cleanup is never automatic — this verb (or the menu) is how it runs. See `references/cleanup.md`. |
| `burn` (bare word, any time) | **Nuke ALL rapid artifacts for the current repo** (docs, worktrees, `rapid/*` branches). Confirms first; lists anything that would be lost. See `references/cleanup.md`. |
| `/rapid done` / `/rapid end` / `/rapid off` | Archive **this chat's** session. See Step 6. |
| `/rapid resume <slug>` / `/rapid start <slug>` | Re-activate an archived session in this chat, OR **adopt a seeded hand-off session** (`**Handoff:** pending`): read its plan, flip the header to `adopted`, and cut its worktree + `rapid/<slug>` branch off `origin/main` (it has none yet). `start` and `resume` are aliases. `/rapid start` alone (no slug) behaves like bare `/rapid` — it opens the menu (Step 2·menu). |
| `/rapid update` | Pull the latest version of this skill and show the changelog delta. Works any time, no session needed. See `references/setup.md`. |
| `/rapid handoff [this session \| <note N> \| <description>]` | **Hand work to a fresh chat.** Seed a NEW session doc (own slug, header `**Handoff:** pending`, no worktree yet) holding the full instructions to build — the whole current session, one note, or a described task — then **ALWAYS end your reply with the copy-paste line `/rapid start <slug>`**. A fresh chat runs that to adopt it: it cuts its own worktree + `rapid/<slug>` branch off `origin/main` and works in its OWN doc (never this one). NOT a loose `~/.rapid/*.md` file. See `references/handoff.md`. |
| `/rapid collab <slug> [message]` | **Open / continue a chatroom with the agent on session `<slug>`.** Re-read both docs' `## Collab`, post your message into the shared room (the peer's `## Collab`, or the existing room if one is already open with them), tell the user to relay once to that chat, and arm the autonomous poll loop so you pick up the reply on your own. A lightweight cross-agent chatroom that then self-drives. With **live mode** on (config `collabLive` + tmux) it's real-time instead — `collab_send` types your message straight into the peer's chat (it answers directly), no relay; the lead keeps a ~5-min liveness sentinel on outstanding workers (cheap pane probe, digs in only if a worker went idle without reporting). ("driver"/"rider" are synonyms for "lead"/"worker" throughout). Roles: the **lead delegates and QAs, peers do the work** — the lead never spawns its own background agents to implement (peers may, inside their lane, if the result stays lead-reviewable), the lead never tests — it sends testing instructions to a rider, and riders never start dev servers/testing on their own unless the user asked for a test — and workers never plan at the user (no plan mode, no "should I proceed?") — a worker's plan goes to the lead for review first. See `references/collab.md`. |
| `/rapid collab <N>` (N = 1–4) | **Spin up a collab of N agents** in the current repo and print the one command to open them. **This chat's session rides along as the driver** — only N−1 new rider sessions are minted and this chat's slug prints first (no throwaway scaffolder session); the driver pane takes the session over, so the user closes this chat after running the line. No session in this chat → all N minted fresh. The launcher pre-writes the roster (driver + riders) and primes every pane with `/rapid collab` at boot, so each agent knows its role before the first message. A *number* means "make this many" — not a message. >4 is rejected. See `references/collab.md` → "Spin up a collab set". |
| `/rapid collab setup` | **Enable live mode** (one time): register the `rapid-collab` relay MCP, set `collabLive: true`, verify tmux. The skill also offers this automatically the first time collab is used without it configured. See `references/setup.md` → "Enabling live collab". |
| `/rapid plan <slug> <task>` | **Request a rapid-plan: a plan authored by the PEER agent on session `<slug>`, delivered through collab.** `collab_send` the brief to `<slug>`; the peer writes the plan in its own chat and sends it back through the room (`[plan] …`); you review it, then surface it to the user. A **rapid-plan is NOT the built-in Plan subagent or plan mode** — never spawn one for it. When the user says "rapid-plan" (or "have <slug> plan it"), this flow is what they mean. If the token after `plan` isn't an existing session slug, it's a normal note, not this verb. See `references/collab.md` → "rapid-plan". |
| `/rapid inbox <slug> [message]` | **Leave an async note in session `<slug>`'s `## Inbox`.** Append the signed note to that doc and stop — no loop, no poke, no relay-to-start, no auto-surfacing. The user picks it up later by going to that chat and telling it to check (`inbox`). **An inbox note never triggers the recipient** — never pick inbox on your own to assign work, ask a question, or start a peer working; that's `/rapid collab <slug> <message>` (messages the agent directly) or `/rapid handoff`. The recipient's `## Inbox` is a sanctioned cross-doc write; never touch its `## Notes`. See `references/inbox.md`. |

### The bare-word rule

If the user's ENTIRE message is exactly one of the bare words above —
case-insensitive, no other content, numbers may carry a leading `#`
(`park #3`, `link #2`) — and **this chat has a session**, handle it as
that command. NEVER queue it as a note. If this chat has NO session,
every bare word is just a normal message: do nothing rapid-related,
respond as you would in any chat.

Exceptions to the session requirement:
- `burn` and `tidy` are repo-wide and run regardless of session state.
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

- **Bare `/rapid` or `/rapid start` (no slug, no note)** → open the menu
  (Step 2·menu) and stop. Do not create, scan over the network, or clean up
  anything until the user picks.
- **`/rapid <text>` (note attached)** → skip the menu; reuse an empty session
  if one exists in `sessions/`, else start a brand-new one, and capture the
  note (Step 2a/2b).
- **Drive-by note, or any bare-word command** → only act if this chat has
  a session slug from earlier in the conversation (exceptions: `burn`,
  `/rapid update`). If it doesn't, treat as a normal message.
- **`/rapid review`, `/rapid done` / `/rapid end` / `/rapid off`** → only
  act if this chat has a session slug. If it doesn't, reply: "No rapid
  session in this chat. Type `/rapid` to start one or `/rapid resume
  <slug>` to pick up an archived one."
- **`/rapid resume <slug>` / `/rapid start <slug>`** → look up
  `sessions/<slug>.md` (or `sessions/archive/<slug>.md`); restore from
  archive if needed; bind the slug to this chat. If the doc's header is
  `**Handoff:** pending`, this is a seeded hand-off: flip it to
  `adopted <ISO> by this chat` and create the worktree + `rapid/<slug>`
  branch off `origin/main` (Step 2b worktree step) before working it.

When you do need the session doc, read
`~/.rapid/sessions/<this-chat-slug>.md` directly. The doc on
disk is still the source of truth for queue state — do not rely on
conversation memory for note status, since you may be running across a
context compaction.

---

## Step 2·menu — the instant menu (bare `/rapid` / `/rapid start`)

When the user types **bare `/rapid`** or **`/rapid start` with no slug and no
note**, do NOT create, reuse, scan over the network, or clean up anything.
Render a menu and stop. The whole point is that starting feels immediate and
stays under the user's control — the menu appears the moment they type, and the
only work that ever happens is whatever option they then pick.

**Two cheap things may run before the menu — both local, both instant:**
- **First-run check.** If `~/.rapid/config.json` does not exist, run the
  onboarding in `references/setup.md` first. On a true first run there are no
  sessions to resume or clean, so skip the menu and go straight into a New
  session once onboarding finishes.
- **Local session scan (NO network).** Read `sessions/*.md` headers for docs
  whose `**Repo:**` matches the current repo — doc reads only, **no `gh`, no
  `git fetch`, nothing over the network** — so the menu can show live/finished
  counts. This is a glance, not a verification.

Render the menu as a numbered list (portable across every tool; a harness with
a native picker may use that instead). **Print the logo header verbatim** at the
top, substituting `<version>` with this SKILL.md's frontmatter `version:` value
so it always shows the installed build. Keep the URL line as-is. Then fill the
option counts from the local scan:

```
       /                    _      _
      /       _ __   __ _  _ __  (_)  __| |
     /       | '__| / _` || '_ \ | | / _` |
    /        | |   | (_| || |_) || || (_| |
   /         |_|    \__,_|| .__/ |_| \__,_|
  /                       |_|
  realtime note queue — v<version>
  rapid-skill.vercel.app

  pick one (or just type your first note to start a new session):

  1. New session       start fresh, or reuse an empty one, then capture
  2. Resume a session  <N live for this repo: slug, slug, …  |  none yet>
  3. Cleanup           <N finished to clear (tidy)  ·  burn wipes all  |  nothing to clean>
  4. Review / recap    see where a session stands
  5. Handoff           hand a scoped plan to a fresh chat
  6. Update skill      pull the latest + show what changed
  7. Help              list every command
```

Then **wait** — do nothing until the user responds. Map the response:

- **`1` / "new" / a typed note** → New session (Step 2a/2b). A typed note is
  captured as note 1 and worked immediately.
- **`2` / "resume"** → exactly one live session for this repo → resume it
  (Step 6 resume flow); several → list the slugs and ask which; none → say so
  and offer New.
- **`3` / "cleanup"** → run the reap sweep for this repo now (**The reap
  sweep**, below) and report what it did; mention `burn` for a full wipe.
- **`4` / "review"** → one live session → render its review (Step 6); several →
  ask which; none → say so.
- **`5` / "handoff"** → run the `/rapid handoff` flow (`references/handoff.md`).
- **`6` / "update"** → run `/rapid update` (`references/setup.md`).
- **`7` / "help"** → print the bare-word command list (the Triggers verbs),
  one line each.

Omit a count clause when there's nothing to show, but keep every option line so
the menu stays stable and predictable. Options 2/3/4 acting on "the live
session" follow the same rules as their bare-word verbs.

## Step 2a/2b — Start or reuse a session (slug + doc + worktree)

This runs when the user **picks New session** from the menu, or types
**`/rapid <note>`** (note attached → menu skipped). **Get the user into a
session and capture — that's the whole job here.** No cleanup, no version
check, no network beyond the single `git fetch origin main` needed to cut a
fresh branch off the latest `main`. First-run onboarding (if `config.json` is
missing and it wasn't already handled above) runs first; everything else is the
reuse-or-create below.

> Cleanup of finished sessions does **not** run on this path. It only runs when
> the user picks Cleanup from the menu or types `tidy` / `burn`.
>
> The **once-daily version check** DOES run here, though — right *after* the
> acknowledgement, non-blocking and fail-silent (never before; the bare menu
> stays network-free). If an update is due and available, append the one-line
> `rapid v<latest> available … — /rapid update` ping to/after the ack. Throttled
> to once a day via `lastUpdateCheck`, so only the first session of the day
> checks. This is the only network a session start touches — and only to tell
> you about updates, never for cleanup. See `references/setup.md`.

**Step 2a — Try to reuse an empty session first.** Scan
`~/.rapid/sessions/` (NOT the archive) for any `.md` file
whose `## Notes` block has zero entries — no `[ ]`, `[~]`, `[c]`, `[x]`,
`[!]`, `[p]`, or `[-]` lines under that heading, AND whose header is not
`**Handoff:** pending` (a seeded hand-off awaits explicit `/rapid start <slug>`
adoption — never auto-reuse it). (A `## Pushes` history
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

**Step 2·hint — surface other sessions (note path only; instant, local, NO
network).** This applies **only on the `/rapid <note>` fast path**, where the
menu was skipped. (When the user reached this step by picking New from the
menu, the menu already showed resumable + finished counts — do NOT repeat them.)
Immediately after the acknowledgement, do a CHEAP local scan — doc reads only,
**no `gh`, no `git fetch`, nothing over the network** — of `sessions/` for
other docs whose `**Repo:**` header matches this repo, and append at most ONE
short hint line. Include whichever parts apply:
- **Resumable** — other sessions for this repo that have live notes (any
  `[ ]` / `[~]` / `[c]` / `[!]` / `[p]` under `## Notes`), excluding this
  chat's own. List up to 3 slugs; the user picks one up with `/rapid resume
  <slug>`.
- **Finished to clear** — a count of this repo's *other* docs that are NOT
  live (notes all `[x]` / `[-]`, or empty). If ≥ 1, nudge `say tidy to clear`.

Example: `↳ 2 resumable: sonic-jet, nimble-sub · 3 finished — say tidy`. If
this repo has no other sessions, print nothing — never emit an empty hint.
Keep it network-free: this is a glance, not a verification. Precise
shipped/merged state is the reap sweep's job, so the finished count here is the
cheap doc-state heuristic, not a PR-verified number.

## The reap sweep (Cleanup menu option / `tidy`)

This is the safe garbage-collection of *finished* sessions. **It is never
automatic.** It runs only when the user asks for it — the menu's **Cleanup**
option (Step 2·menu) or the bare `tidy` / `reap` verb. Either way the mechanics
below are identical; `tidy` (see `references/cleanup.md`) is the on-demand
verb, the menu option is the same sweep reached from the menu.

Why it still exists: users start sessions far more than they run `/rapid done`,
so without an occasional reap, worktrees and branches pile up. Making it
explicit (menu / `tidy`) instead of automatic is the trade — the user decides
when, so start always stays instant. The menu surfaces the finished count as a
nudge, so it's easy to remember.

When it runs, **batch, never loop.** Fetch all PR states for the repo in ONE
call — `gh pr list --state all --limit 300 --json number,headRefName,state` —
and build a `headRefName → state` map, then look each recorded branch up in it.
Calling `gh pr list --head <branch>` once per branch in a blocking loop is the
sequential network I/O that used to make start slow — don't.

Run this sweep, scoped to the current repo (`git rev-parse --show-toplevel`; if
not in a repo, skip entirely):

0. **Refresh `origin/main` FIRST — the sweep is only as correct as your remote
   refs.** Run `git -C <repo-root> fetch --prune origin main` before evaluating
   anything. Every "shipped / ahead / has-remote-ref" test below compares
   against `origin/main` and the remote-tracking refs; a stale local copy makes
   already-merged work look *ahead* and makes deleted-on-merge branches look
   still-present. **A stale `origin/main` is the #1 cause of merged, live
   worktrees being flagged as unshipped** — always fetch, always `--prune`.
1. For each session doc in `sessions/` (NOT archive) whose `**Repo:**` header
   matches the current repo root, AND which is **not** the session this chat
   currently owns (if any — Cleanup/`tidy` can run with no live session):
   - **Determine "shipped" against the FRESH `origin/main` from step 0.** A
     branch is **shipped** if ANY of these hold:
     1. its tip is an ancestor of `origin/main`
        (`git merge-base --is-ancestor <branch> origin/main`) — the ordinary
        merge-commit case, and any branch whose commits are fully contained in
        main;
     2. a recorded branch (`branch: <name>` lines + `rapid/<slug>*`) is
        **MERGED or CLOSED** in the prefetched PR-state map — this catches
        squash/rebase merges, which read as *ahead* of main even though shipped;
     3. `git cherry origin/main <branch>` reports no `+` lines — every commit is
        already in main by patch-id (cherry-picks / clean rebases).

     A branch is **unshipped** only if NONE of 1–3 hold AND it still has commits
     beyond fresh `origin/main` (or was never pushed). **"Ahead of `origin/main`"
     is NOT proof of unshipped** — rule 2 exists precisely because squash merges
     look ahead. Ancestry is a valid ONE-WAY *confirm* of shipped (ancestor ⇒
     shipped); never use it to conclude the negative (not-an-ancestor does NOT
     mean unshipped — a squash merge isn't an ancestor). That one-way use is why
     the old "never use ancestry" rule is now "ancestry can only clear, never
     condemn."
   - **Skip (leave it) ONLY if something is genuinely at risk:** uncommitted
     changes in its worktree (`git -C <worktree> status --porcelain` non-empty),
     a `[p]` parked or `[!]` blocked note, an **unshipped** branch (per the test
     above), a `**Pushed:** no` header (work never became a PR, so it is
     local-only and must never be auto-deleted), an unread (`[ ]`) `## Inbox`
     note (a note someone left that hasn't been read — losing it would be bad),
     or a `**Handoff:** pending` header. A `[~]` / `[c]` note whose
     branch is MERGED/CLOSED is already shipped — **stale checkboxes do NOT
     block reaping.**
   - **Otherwise it's finished** → reap it:
     a. `git worktree remove --force <worktree>` if the worktree exists and
        sits on a `rapid/*` branch. Leave worktrees parked on a non-rapid
        feature branch alone.
     b. Delete its local `rapid/*` branches + recorded `branch: <name>`
        branches **whose PR is merged/closed or which has no remote ref**
        (`git branch -D`). Never delete a branch with an OPEN PR or an
        unshipped branch with unpushed commits.
     c. Delete the merged/closed remote branches it pushed (`git push origin
        --delete <exact-branch-name>`), only when their PR is not open.
        **Exclude any keep-list by EXACT, fully-qualified ref name** — a loose
        grep/pattern can silently delete a branch you meant to keep.
     d. `rm` the session doc.
2. After the sweep, run `git worktree prune` to clear stale registrations.
3. **Freshen the user's local main**: if the primary checkout is on `main` and
   clean (`git status --porcelain` empty), run `git -C <repo-root> pull
   --ff-only`. Always safe — a fast-forward only moves the `main` pointer;
   worktrees and note branches are untouched. On another branch or dirty, skip
   silently.
4. **Report.** The user asked for this sweep, so always report the result in one
   line: `Reaped 3 finished sessions (sonic-rover, speedy-buggy, swift-sled);
   fast-forwarded main.` If nothing was reaped and main didn't move, say so
   (`Nothing to clean — every session for <repo> is live or unshipped.`). If a
   reap step errors, skip that item and keep going — never let one bad branch
   abort the rest.
5. **Version check.** A reap is a natural housekeeping moment, so run the
   once-daily version check here too (see `references/setup.md`) and append the
   one-line "new version available" ping if one is due. It also runs post-ack at
   session start and on `/rapid update`; the `lastUpdateCheck` throttle means
   only the first of those each day actually checks.

The user never has to remember `done`: a repo gets garbage-collected whenever
they pick Cleanup or type `tidy`, keeping only live/unshipped sessions plus a
local main that matches origin. The difference from before is that cleanup is
now opt-in (menu / `tidy` / `burn`) instead of running silently at start, so
starting a session is always instant. `tidy` (see `references/cleanup.md`) is
this same sweep as a bare-word verb.

### Session doc template

```markdown
# rapid/<slug>

**Started:** <ISO datetime>
**Surface:** <app/website/etc. — leave blank if unknown, fill in once obvious>
**Repo:** <absolute path to repo root, or "n/a">
**Worktree:** <absolute path to worktree, or "n/a">
**Branch:** <rapid/<slug>, or "n/a">
**Pushed:** no
<!-- "no" until a push/carpool opens a PR, then the PR ref(s), e.g. "PR #123 https://…/pull/123" (comma-separate if a session opens more than one over its life). The at-a-glance "did this session reach a PR" flag. Cleanup/scan rule: a session still marked "no" has LOCAL-ONLY work that never became a PR, so never auto-delete it; a session with PR ref(s) is deletable only after each PR is confirmed merged. -->
**Handoff:** <omit normally; "pending" on a seeded hand-off session awaiting a fresh chat; "adopted <ISO> by this chat" once adopted via /rapid start <slug>. See references/handoff.md>

## Notes

<!-- Each note: status box, timestamp, one-line summary. Indent details under it. -->

## Collab

<!-- Cross-agent chatroom. Blank until a collab opens. Append-only, newest last; sign each line `rapid/<your-slug> HH:MM`. No live channel by default: re-read before posting; the user relays once per side, then each chat self-polls (autonomous loop, 3 idle checks ~5 min apart). With live mode on (config `collabLive` + tmux), agents CHAT directly instead — `collab_send` delivers the message into the peer's chat and writes NOTHING here (live is chat-only). In live mode this section holds only the hand-written roster line (the pair + who's driver/lead); per-message lines are a doc-mode (non-live) thing, or a fallback the relay writes if a live send can't reach the peer. See references/collab.md. -->

## Inbox

<!-- Async notes other chats left for this session. Blank until one arrives. Append-only; `[ ]` unread, `[x]` read. Each line: `- [ ] [HH:MM] rapid/<from> → rapid/<to>: <message>`. No loop, no poke, no auto-surfacing — the user reads it by telling this chat to check (`inbox` / "check your inbox") when ready. Unread notes block the reap until read. ⚠️ AGENT ABOUT TO WRITE HERE: a note in this section does NOT reach this agent — it sits unread until the user manually tells this chat to check. To make this agent act (assign work, ask a question, expect a reply), message it directly instead: `/rapid collab <slug> <message>`, or `/rapid handoff` for a whole task. See references/inbox.md. -->

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
- **🔴 Rapid only ever creates `rapid/*` branches — never `feat/*`/`fix/*`/etc.**
  Everything a session touches is rapid-prefixed: the session branch
  `rapid/<slug>`, each note's working branch `rapid/<slug>-<note-slug>`, and
  each push batch `rapid/<slug>-batch-<N>`. **Never** attach a session to, or
  cut, a non-`rapid/` branch **unless the user explicitly asks** (e.g. "ship
  this as `feat/x`"). The `rapid/` prefix is the *single* signal the reap sweep
  (Cleanup / `tidy`) and `burn` key on — a non-`rapid/` branch is invisible to cleanup
  and is exactly how branches pile up. (Naming only: pushes already ride the
  `rapid/<slug>-batch-<N>` branch, so PR/GitHub names are unaffected.)
- **Every new note ships on its own fresh branch off `origin/main`.** Before
  starting a note, run `git fetch origin main` inside the worktree and check
  out a brand-new branch off `origin/main`, named `rapid/<slug>-<note-slug>`
  (e.g. `rapid/turbo-kart-login-glow`) — never the session branch, never a
  previous note's branch, never a non-`rapid/` name.
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
    - branch: rapid/<slug>-node-error-glow (off origin/main)
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
                    -b rapid/<slug>-<note-slug> origin/main
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
     - branch: rapid/<slug>-dice-theme (off origin/main)
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
done, unshipped: #4 sticker copy (on rapid/<slug>-sticker-copy — say `push`)
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
chat's** conversation context, render a review. **Adopting a seeded
hand-off** (`**Handoff:** pending`): flip the header to `adopted <ISO> by
this chat`, create the worktree + `rapid/<slug>` branch off `origin/main`
(it was doc-only), then start on its `## Notes`. `start` and `resume`
are interchangeable. If `/rapid start` is given without a slug, treat
it as bare `/rapid` — open the menu (Step 2·menu).

---

## Rules

- **Starting never does housekeeping.** Bare `/rapid` / `/rapid start` only
  ever shows the menu (Step 2·menu); `/rapid <note>` only ever reuses-or-creates
  and captures. Neither reaps, fast-forwards `main`, or hits the network for
  cleanup — that happens only on the menu's Cleanup option, `tidy`, `burn`, or
  `/rapid update`. The user is in the work mindset; don't make them wait on or
  watch background chores before their first note lands.
- **One session per chat. New session reuses an empty one or starts fresh.**
  Step 2a will adopt any session in `sessions/` whose
  notes block is empty (a previous chat's washed shell, or a brand-new
  doc that never got notes). It will NOT adopt a session that has
  live notes — that belongs to whichever chat owns it. The only way
  to enter a non-empty session from this chat is via explicit
  `/rapid resume <slug>` or `/rapid start <slug>` (after that chat
  has run `done`/`off` or has been washed). Drive-by notes only land
  in *this chat's* session.
- **One chat writes one doc — never another chat's.** A session doc is owned
  by exactly one chat. NEVER edit a *different* chat's session doc to record
  your work: two chats editing one file silently lose each other's writes
  (the lost-update trap). To hand work to another chat, seed a **hand-off
  session** (`/rapid handoff`; see `references/handoff.md`) — its own doc + its
  own branch — and reference it by slug only. Likewise never write a loose
  `~/.rapid/*.md` plan file for another chat to "point at": it's owned by
  nobody, so the adopting chat ends up writing status back into YOUR doc. The
  ONLY sanctioned cross-doc writes are posting to a peer's `## Collab` room
  (see `references/collab.md`) and leaving a note in a peer's `## Inbox` (see
  `references/inbox.md`). Both are append-only; never touch a peer's `## Notes`
  or anything else in their doc.
- **A named peer is a LIVE AGENT — route through collab, never the Agent
  tool.** When the user names another session (a slug, "your peer", "the other
  agent", or its worktree path) and asks you to send, assign, or request
  something from it, that goes through this skill: `collab_send` / the room
  (`references/collab.md`), `handoff` for a whole task, `inbox` only when they
  explicitly want a passive note. NEVER satisfy it by spawning your own
  background agent (Plan, general-purpose, or any subagent) — "ask <slug> for
  a plan" means MESSAGE <slug> and let IT write the plan, not "launch a Plan
  subagent and wait". A subagent runs on your own (expensive) model inside
  your own chat, invisible to the peer — the opposite of what was asked.
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
- **On UI/design notes, carry the direction — don't wait for line-items.**
  The user is tired of specifying every pixel. When a note is visual:
  1. **Look at the actual UI, not just the code.** If the user shares a
     screenshot, study it. If they don't and the change is non-trivial,
     drive the app (agent-browser / a screenshot) and *look* before and
     after — never reason about layout blind.
  2. **Confirm the change matches what they want by viewing the result.**
     "If I ask you to make a change you should look at it" — verify the
     rendered outcome looks right (alignment, spacing, empty space,
     consistency) before calling the note done, and show it.
  3. **Sweep siblings.** When you fix one instance of a pattern (a chip,
     a label, spacing, a status indicator), find every other place in the
     app with the same pattern and bring them in line in the same pass —
     don't make the user point at each one.
  4. **Keep the established design language** (sizing, placement, color
     semantics, component style) consistent with what already exists; reuse
     a shared component rather than re-styling ad hoc.
  5. **Make 1–2 concrete design suggestions** with each change. The user
     would rather wave off a suggestion than enumerate every detail.
- **New feature → scan the app for where it plugs in; don't build it in
  isolation.** Before/while implementing any new feature, grep the app for
  the existing systems the same *kind* of thing already lives in, and wire
  the new thing into all of them — the feature isn't done until it's a
  first-class citizen everywhere its peers are. Examples of systems to
  check: filter/sort menus (a new tag/status belongs in the tag filter,
  not just on the object), tab bars and nav, settings/preferences panels,
  search, keyboard shortcuts, empty/loading states, mobile vs desktop
  surfaces, the Docs tab, and any shared enum/type + its switch/label maps.
  Concretely: adding a `fail` QA tag means adding it to the gallery's QA
  *filter* and badges too, not just the data. Enumerate the integration
  points you found and hit in the outcome line so the user can see the
  sweep was real (and catch one you missed).
- **Only test or start dev servers when asked.** Never start a dev server, run the app, or invoke browser automation on your own initiative — not after making changes, not to "verify." Only do it when the user explicitly asks (e.g. `test`, `testdrive`, or a direct instruction to run/verify). In a live collab the split is fixed: the **driver/lead never tests at all** — it sends testing instructions to a rider — and a **rider tests only on a user-requested ask** (relayed by the driver or typed into its own pane). See `references/collab.md` → "Testing in a live collab".
- **Self-unblock — fix the blocker, don't just report it.** If something
  stops you from doing the work right (missing `node_modules`, no dev
  server, missing tooling, a broken local config, an auth/account snag),
  take it upon yourself to fix it and keep going — don't bounce it back to
  the user and wait. Install the deps, symlink the env, start the server,
  pin the right token, write the helper. Only escalate when the fix needs a
  secret/decision genuinely outside your reach, and even then propose the
  exact unblock you'd run. Then, if the blocker is reusable knowledge, fold
  the fix into this skill (or a reference) so it never blocks you twice.
- **Be able to screenshot the running app (so rule "look at the UI" is real).**
  When you need to *see* a change and there's no screenshot from the user:
  1. Get the app running yourself. In a git worktree there's usually no
     `node_modules` and no env — symlink them from the main checkout:
     `ln -s <main>/node_modules <worktree>/node_modules` and
     **then add `/node_modules` to `.git/info/exclude`** — many repos ignore
     `node_modules/` (trailing slash = directories only), so the *symlink*
     isn't ignored and a stray `git add -A` will commit it. Never `git add
     -A` in such a worktree; stage explicit paths. And
     `ln -s <main>/.env.local <worktree>/.env.local` (or `.env`), then start
     the dev server in the background (`npm run dev` / the project's run
     skill) on a free port.
  2. Drive it with the `agent-browser` skill (or the project's browser
     tooling): navigate to the local URL, get past any auth (reuse an
     existing session/cookie or a known dev login), open the exact
     screen/tab, set the viewport (mobile AND desktop when the note is
     default-both), and capture.
  3. Look at the capture, confirm it matches what the user asked, and
     attach it. If you genuinely can't reach the screen (hard auth wall, no
     seed data), say so in one line and fall back to the deployed/preview
     URL — don't silently skip looking.
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

## Example — bare `/rapid` (the menu)

User: `/rapid`

Claude (this chat had no session):
1. Config exists (not a first run). Does a CHEAP local scan of `sessions/` for
   this repo — no network.
2. Renders the menu (logo header with the live version) and stops:
   ```
          /                    _      _
         /       _ __   __ _  _ __  (_)  __| |
        /       | '__| / _` || '_ \ | | / _` |
       /        | |   | (_| || |_) || || (_| |
      /         |_|    \__,_|| .__/ |_| \__,_|
     /                       |_|
     realtime note queue — v1.11.2
     rapid-skill.vercel.app

     pick one (or just type your first note to start a new session):

     1. New session       start fresh, or reuse an empty one, then capture
     2. Resume a session  2 live for this repo: sonic-jet, nimble-sub
     3. Cleanup           3 finished to clear (tidy) · burn wipes all
     4. Review / recap    see where a session stands
     5. Handoff           hand a scoped plan to a fresh chat
     6. Update skill      pull the latest + show what changed
     7. Help              list every command
   ```
3. Waits. Nothing is created, fetched, or cleaned until the user picks.

User: `1`

Claude: starts a New session (Step 2a/2b) and replies `Started rapid/turbo-kart
at <worktree>. Drop notes anytime.`

## Example — `/rapid <note>` (skip the menu, capture now)

User: `/rapid the avatar in the sidebar feels too small`

Claude (this chat had no session — a note is attached, so skip the menu):
1. Config exists (not a first run).
2. Generates slug `turbo-kart`, no collision in `sessions/` or `archive/`.
3. Creates the worktree + branch (Step 2b).
4. Writes `sessions/turbo-kart.md` with note 1 = `[~] [14:32] avatar in sidebar feels too small`.
5. Binds `turbo-kart` as **this chat's** slug in conversation context.
6. Replies: `Started rapid/turbo-kart at <worktree>. Picking up note 1: avatar size in sidebar — looking now.` (No cleanup runs; a one-line hint may follow if the repo has other sessions.)
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
