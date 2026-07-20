# Changelog

## 1.27.0 — 2026-07-19

- **Plan authoring never flows down to a cheaper model.** Live incident: in a
  driver/rider collab, `/rapid plan` made the driver forward the planning to
  its rider — the cheap model designed while the expensive model waited to
  rubber-stamp, inverting the economics the split exists for (the driver is
  the strongest model precisely so it does the thinking; riders carry out its
  plans). Tightened across `SKILL.md` and `references/collab.md`: planning is
  the lead's OWN work — like reading diffs, unlike implementing and testing
  (the lead-delegates rule now says so explicitly); `/rapid plan <task>` (no
  slug) means YOU author the plan in your own chat; `/rapid plan <slug>
  <task>` stays for asking a peer, but the sanctioned directions are **up or
  across** (equal/stronger model, or the peer that owns the context) — a
  `<slug>` naming a rider in your own collab gets the plan authored by the
  driver instead, with a one-line note (an explicit user override still
  wins). Rider lane plans (short "how I'll do my lane", sent up for review
  before building) are unchanged.

## 1.26.0 — 2026-07-19

- **Replies are now ADHD-shaped, not just terse.** The response style gains a
  ruleset built for rapid's non-technical mobile reader — small working
  memory, high start friction, no patience for buried state: anything the
  user must do is the FIRST line;
  anything left open ends with exactly ONE under-two-minutes next action in
  product terms; multi-step work is numbered with one bounded action per step
  and lists cap at 5 (past that: now vs later); every turn restates queue
  position ("note 3 done, 2 queued") instead of assuming the user remembers;
  duration gets concrete units ("about 10 minutes", never "a bit of work");
  completed notes say what now works and where to try it; errors state cause
  then fix with no drama; tangents wait until the note is done and arrive as
  one separate question; closers ("let me know if…") are banned. Four
  sanctioned overrides: explain-fully on ask, confirm-destructive, the
  debug-spiral brake (three "still broken" turns → stop iterating, name the
  suspect assumption, ask one diagnostic question), and one clarifying
  question on genuine ambiguity.

## 1.25.0 — 2026-07-19

- **New lifecycle verb: `rapid-collab resume` — reopen a collab tmux even after
  it's gone.** `open` only reattaches to a *running* session; once you'd run
  `kill` (or rebooted), getting the room back meant remembering and retyping the
  slugs. `collab-start` now saves each collab's composition (slugs + `-n` name)
  to `~/.rapid/collab-last.json` on every fresh start and `--add`, and keeps the
  record across `kill`. `resume` reattaches if the session is still running,
  otherwise recreates it — same slugs, same panes, `claude` relaunched in each.
  Target resolution matches `open`/`kill` (`-n` → cwd repo → sole record); when
  it can't tell, it lists the saved collabs and asks for `-n <name>`. `open`'s
  nothing-running message and `kill`'s sign-off now point at `resume`.

## 1.24.0 — 2026-07-18

- **Fresh collabs now know who's who at boot — no more "driver spawns a
  subagent as its rider."** Live incident (intermittent): in a just-opened
  collab, "delegate this to the rider" made the driver launch a background
  subagent — the panes booted as bare `claude` with zero collab context, and
  `guard-agent-peer` only matched actual slug names, so the generic word
  "rider" sailed through. Three-part fix:
  1. **`collab-start` pre-writes the roster and primes every pane.** Before
     launching, it writes the `**Room** · … driver: rapid/<first>` roster line
     into the driver's doc (first slug = pane 0 = driver) and an "opened
     with … (you are a rider)" pointer into each rider's. With live mode on,
     a background watcher then types `/rapid collab` into each pane as its
     relay registers (send-keys verified, stale-registry-proof) — every agent
     binds its cwd session, reads the roster, announces its role, and stands
     by. New fresh-boot-prime rule in `references/collab.md`: roster-only room
     → announce role, don't message peers, don't arm loops, don't invent work.
  2. **`guard-agent-peer` now blocks generic role words during a RUNNING live
     collab.** When this session and at least one peer are registered in
     `~/.rapid/collab-panes.json` with panes still alive in tmux, an
     Agent-tool prompt saying rider/worker/peer/other-agent blocks, naming the
     real peer slugs in the fix. Technical uses (web/service worker, worker
     thread/pool, peer dependency/review, peer-to-peer) are scrubbed first;
     outside a live collab the words stay inert, so normal subagent use never
     trips it.
  3. **`/rapid collab <N>` no longer strands a throwaway session.** A
     session-bound chat that asks for a collab of N now rides its OWN session
     along as the driver: only N−1 riders are minted, this chat's slug prints
     first in the `rapid-collab` line, and the driver pane takes the session
     over (the user closes the scaffolding chat). Previously every spin-up
     minted N fresh sessions and left the invoking chat's session as an
     unused leftover to `tidy` later. No session in the chat → all N fresh,
     first minted slug is the driver, as before.
  Scaffolded sets host the room in the DRIVER's doc (documented exception to
  "the room is the peer's doc"); `references/collab-live/README.md` updated to
  match, including the driver-first argument order of `rapid-collab`.

## 1.23.1 — 2026-07-18

- **Live collab: the driver never tests — testing is rider lane work, and only
  on the user's ask.** New role rule, three parts: (1) the **driver/lead never
  runs tests itself** — no dev servers, no browser automation, no simulators,
  not even to QC a lane; when a test is called for it composes **testing
  instructions** (what to run, which flow, what a pass looks like, verdict in
  the `references/test.md` shape) and `collab_send`s them to the rider owning
  the lane, then QCs the returned verdict + evidence. (2) The user's bare
  `test`/`testdrive` still lands on the lead, but the lead **delegates** it and
  relays the rider's verdict back — it no longer runs `references/test.md`
  itself. (3) **Riders never spin up dev servers, run the app, or launch
  browser automation on their own initiative** — not to "verify" a finished
  lane — only when the user explicitly asked (relayed as `[test]` instructions
  by the driver, or typed directly into the rider's pane). Chain: user asks →
  driver instructs → rider executes → verdict flows back up; no link
  self-starts. Docs updated in `references/collab.md` (new "Testing in a live
  collab" section; the lead-delegates rule no longer lists testing as the
  lead's own job), `references/test.md` (collab callout), and `SKILL.md`
  (trigger rows + the "only test when asked" rule).

## 1.23.0 — 2026-07-18

- **`link` now also prints the project's dev and production URLs when the
  session's repo is a web project.** After the PR list, `link` appends a
  `Dev:` line (dev-server URL — port resolved from the `dev`/`start` script's
  explicit flag, then the framework config, then the framework default) and a
  `Prod:` line (first local source that names a domain: the doc's `**Links:**`
  header, `package.json` `homepage`, `vercel.json`/`netlify.toml`/
  `wrangler.toml`/`CNAME`, or a canonical URL at the top of the README — never
  guessed). Resolution happens from local files only: no dev servers started,
  no deploy CLIs, no network. The resolved pair is cached in the session doc
  header as `**Links:** dev <url> · prod <url>` — the one write `link` may
  make — so later calls and resumed sessions print it straight from the doc.
  Non-web repos are unchanged: PR list only, no extra output.

## 1.22.3 — 2026-07-17

- **Live collab is chat-only — a successful live send writes NOTHING to the
  doc.** The relay was appending the full signed message to the peer's
  `## Collab` on *every* `collab_send`, before it even checked whether the peer
  was live — so a fully-live session filled the doc identically to a non-live
  one (one session accumulated 600+ lines of relayed research). That contradicts
  the design intent: live agents converse in their chats; `## Collab` is the
  transport for **doc-mode (non-live)** only. Fixed in `relay.mjs`: the doc
  append now fires ONLY on the fallback paths (peer not registered, peer on
  another host, or the tmux inject throws) so an undeliverable message still
  isn't lost. A successful live send appends nothing. In live mode the section
  holds only the hand-written **roster line**, which now names the **driver**
  (`**Room** · rapid/a ⇄ rapid/b · driver: rapid/a`). Docs corrected to match
  across `SKILL.md`, `references/collab.md`, and `references/collab-live/`
  (README + relay comments + the `collab_send` tool description), which all
  previously claimed live auto-writes a durable transcript.

## 1.22.2 — 2026-07-17

- **`push` now reconciles the whole queue, and reports a done/total tally.**
  Two gaps caught live: (1) `push` flipped only the notes in the current
  batch to `[x]`, so notes whose work had actually shipped on an earlier turn
  but were never checked off stayed stuck at `[~]` forever (one session
  accumulated 23 such stale checkboxes while the tree was clean and every PR
  merged). `push`/`carpool` now walk the ENTIRE `## Notes` block and flip any
  note whose work genuinely landed — `push` is the checkpoint where the doc
  catches up to reality; no completed note may stay unchecked after a push
  (in-flight work still stays `[~]`). (2) The PR-share summary never stated
  how much of the queue was done. `push`/`carpool` now print a required
  `<done> of <total> notes done` line directly under the PR link. The
  `mark-pushed` hook is unchanged — it stamps the header/branch record but by
  design can't know which note a batch PR covered, so the per-note tick stays
  the agent's job; this makes that job explicit and retroactive.

## 1.22.1 — 2026-07-13

- **Hook fix: resolve a `cd <dir> && …` prefix before checking cwd.** The
  harness reports a Bash tool call's cwd as the shell state BEFORE the
  command ran, so `cd rapid-landing && git push` looked, to a hook, like it
  ran from wherever the shell happened to be sitting. Caught live:
  `guard-sealed-pr` (broadened in v1.22.0 to fire from any checkout)
  resolved the wrong repo entirely, found an unrelated branch there sealed,
  and blocked a legitimate push in a different repo. New `resolveCwd(cmd,
  baseCwd)` in `references/hooks/_shared.mjs` walks `&&`/`;`-separated `cd`
  segments to compute the effective cwd; `guard-sealed-pr`, `guard-git-add`,
  and `compact-peers` now use it. `mark-pushed.mjs` (self-contained, no
  `_shared` import) got an inline copy of the same fix — it had the identical
  gap (silently failing to stamp a PR opened via a chained `cd`).

## 1.22.0 — 2026-07-12

- **Live collab: the lead keeps a liveness sentinel on its workers.** Live
  incident: a worker finished a lane (opened a PR) and reported it as a reply
  in its OWN chat — the lead never saw it, and push-only delivery can't catch
  a message that was never sent. New rule: while any lane is
  assigned-but-unreported, the LEAD (only the lead — workers never poll)
  wakes every ~5 min (`ScheduleWakeup`, prompt `collab`) and runs a CHEAP
  liveness probe per outstanding worker — pane id from
  `~/.rapid/collab-panes.json`, `tmux capture-pane | tail -3`, busy indicator
  = still working. Busy → do nothing (no doc/room reads; a worker can grind
  20+ min and that's healthy — the probe deliberately reads almost nothing so
  the lead's context stays clean). Idle with no report → NOW read its doc
  (the mark-pushed `**Pushed:**` stamp, `[c]`/`[x]` flips, new `[!]`) + the
  room, and nudge it to report through collab; pane dead → surface to the
  user. The sentinel never lapses while a lane is outstanding; it stops when
  every lane is reported. Worker report duty sharpened to match: results go
  to the requester via `collab_send`, never only your own chat (the lead
  can't see it — a report posted only there doesn't exist).
- **"Driver"/"rider" are now synonyms for "lead"/"worker"** everywhere in
  collab (roster, roles, conversation) — same roles, whichever words the
  user uses.
- **Two new reliability hooks + one broadened** (`references/hooks/`), making
  the new collab rules deterministic; same conventions as the v1.20 set (Node
  18+, zero-dep, fail open):
  - **`guard-agent-peer`** (PreToolUse on Task) — blocks spawning a subagent
    whose prompt names another live session's slug or worktree ("peers are
    NOT subagents"), feeding back the `collab_send` fix. Branch tokens
    (`rapid/<slug>…`) are stripped first so QC-ing a peer's shipped branch
    stays allowed.
  - **`compact-peers`** (PostToolUse on Bash) — after a `gh pr create` that
    opened a PR from a live-collab pane, sends `/compact` into every other
    same-repo collab pane (the post-push sweep), skipping mid-turn panes and
    verifying each send-keys submitted; prints a summary the lead relays.
  - **`guard-sealed-pr`** now guards a `rapid/*` push from ANY checkout, not
    just rapid worktrees — pushing a just-merged branch from the main clone
    orphaned a commit in the wild (this very repo, this very release).
- **`push` in a live collab: the lead ships, then auto-compacts the peers.**
  Every push, no separate ask: the lead opens the PR (workers never do),
  then sends `/compact` into each worker pane (idle-first via the sentinel
  probe, send-keys verified) — the shipped-lane chatter is exactly what the
  workers no longer need, and everything durable lives in the session docs —
  and ends its reply with the PR link. New "push in a live collab" section in
  `references/collab.md` + a clause on the `push` verb row.

## 1.21.0 — 2026-07-11

- **Inbox now says loudly that it never triggers the recipient.** Live
  incident: asked to reroute a task to a peer session, an agent dropped the
  full assignment into the peer's `## Inbox` and considered it delivered — the
  note sat unread, nothing ever fired. Inbox is passive by design (no loop, no
  poke), so the sender-side rule is now explicit everywhere a sender looks:
  - `references/inbox.md` gains a "🔴 Inbox never triggers the recipient" rule:
    when the agent is choosing the channel and the message assigns work, asks
    a question, or expects any action/reply, that's `collab` (message the
    agent directly) or `handoff` — never inbox, unless the user explicitly
    said "inbox" / "leave a note". Intro example reworded from an actionable
    ask to a passive FYI to match.
  - The doc template's `## Inbox` comment now warns the *writing* agent in
    place (the recipient's doc is exactly what a sender edits), and senders
    backfill the comment into older docs that lack it.
  - The `/rapid inbox` verb rows (SKILL.md + README), the frontmatter
    description, and the send-flow confirmation line all carry the same
    reminder (`this won't start them working — for that, /rapid collab
    <slug>`).
- **Collab roles: the lead delegates, peers do the work.** New rule in
  `references/collab.md` (Roles & roster) + a clause on the SKILL.md verb row:
  in a live collab the lead never spawns its own background agents to do lane
  work — that reruns the work on the lead's expensive model (no cost saving)
  and bypasses the (usually cheaper) peers the collab was opened for. The lead
  assigns lanes, coordinates, and QAs; workers may use background agents
  inside their own lane as long as everything lands on their branch and stays
  reviewable by the lead.
- **Workers don't plan at the user.** Also in Roles & roster: a worker's
  default is to just do its assigned lane. If a lane genuinely needs a plan
  first, the worker sends it to the LEAD for review (`[plan] …` via
  `collab_send`) and starts only when cleared — it never enters plan mode or
  asks the user "should I proceed?". User approval, when needed, is the
  lead's to seek through its normal question queue.
- **Peers are NOT subagents.** Live incident: told to send a plan request to
  the peer session by name (worktree path included), an agent instead spawned
  a background Plan subagent and sat polling it. New 🔴 rule at the top of
  `references/collab.md` + a SKILL.md Rules bullet: a named session ("your
  peer", a slug, its worktree path) is a live agent — requests to it route
  through `collab_send` / `handoff` / `inbox`, never the Agent tool. "Ask
  <slug> for a plan" means message <slug> and let IT write the plan.
- **The peer-authored plan flow now has a name: `rapid-plan`** (new
  `/rapid plan <slug> <task>` verb + a "rapid-plan" section in
  `references/collab.md`), so "plan" stops pattern-matching the harness's
  Plan subagent / plan mode. Flow: requester `collab_send`s a
  `[plan-request]` brief; the peer authors the plan in its own chat and sends
  it back as `[plan] …`; the requester (lead) reviews before anything reaches
  the user. Saying "rapid-plan" anywhere means this flow.

## 1.20.0 — 2026-07-08

- **Three more reliability hooks** (`references/hooks/`), joining `mark-pushed`
  to make skill rules deterministic instead of agent-remembered. All Node 18+,
  zero-dep, resolve the session by cwd, and **fail open** (a hook bug never
  blocks your shell); each no-ops outside a rapid worktree.
  - **`guard-git-add`** (PreToolUse) — blocks `git add -A` / `--all` / `.`
    inside a rapid worktree. node_modules is symlinked there, and repos ignore
    `node_modules/` as a directory, not as a symlink — so a blanket add commits
    the symlink. Explicit-path staging still passes.
  - **`exclude-node-modules`** (PostToolUse) — after `git worktree add`, appends
    `/node_modules` to the new worktree's `.git/info/exclude` (belt-and-
    suspenders for the same trap; previously a manual step). Idempotent.
  - **`guard-sealed-pr`** (PreToolUse) — blocks a `git push` to a `rapid/*`
    branch whose PR is MERGED/CLOSED, enforcing "verify the PR is OPEN before any
    git write." One `gh pr view` per rapid push; fails open if unavailable.
  - `references/setup.md` gains a "Reliability hooks" section with the combined
    `~/.claude/settings.json` install block and the rationale for what was (and
    wasn't) hooked. Shared helpers live in `references/hooks/_shared.mjs`.

## 1.19.0 — 2026-07-08

- **Push now stamps the session doc automatically — no more hand-marking after
  every push.** New `mark-pushed` hook (`references/hooks/mark-pushed.mjs`): a
  `PostToolUse(Bash)` hook that, after any `gh pr create` that opened a PR from
  inside a rapid worktree, flips the doc's `**Pushed:**` header to the PR ref and
  appends a `## Pushes` entry — the durable "this session shipped, on THIS
  branch, via THIS PR" record that cleanup keys on. Previously this was a manual
  push-flow step (push.md 8–9) the agent could skip, and when work squash-merged
  under a `-batch-N` branch the doc never captured, cleanup couldn't trace it and
  flagged the worktree as unshipped forever (the pile-up this pairs with the
  v1.18.0 fetch-first fix to eliminate).
  - Idempotent (skips a PR # already recorded); no-ops on non-PR commands and
    non-rapid dirs; wrapped so it can never throw or block a push. Node 18+, zero
    deps. Reads the same `sessionsRoot`/`RAPID_HOME` config as the relay.
  - Does **not** flip notes `[c]`→`[x]` — which notes shipped is semantic and
    stays the agent's job; the hook only guarantees the header + branch record.
  - Install is one `PostToolUse` entry in `~/.claude/settings.json` (see
    `references/setup.md` → "Auto-mark pushed sessions"); `push.md` notes the two
    coexist.

## 1.18.0 — 2026-07-08

- **Cleanup now judges against the CURRENT `origin/main` — merged, live
  worktrees stop getting flagged as unshipped.** `burn`, `tidy`, and the reap
  sweep evaluated "shipped / ahead / has-remote-ref" against whatever stale
  `origin/main` the local clone happened to have, so a worktree whose work had
  long since merged read as *ahead of main* and got flagged to keep — every
  time. All three now **`git fetch --prune origin main` first**, before any
  evaluation. Stale-main was the #1 cause of the pile-up.
- **The "shipped" test got a correct, non-contradictory definition.** The old
  rule was an absolute "never use ancestry" (to avoid squash-merge
  false-positives), which left only same-name PR lookup — and that misses work
  that merged under a reworked or renamed branch. A branch is now **shipped** if
  ANY of: (1) its tip is an ancestor of fresh `origin/main`; (2) a recorded
  branch is MERGED/CLOSED in the batched PR-state map (covers squash/rebase,
  which read as ahead); (3) `git cherry origin/main <branch>` shows no `+`
  commits (patch-id contained). Ancestry/patch-id only ever *clear* a branch,
  never condemn it; PR-state covers the squash case they miss. "Ahead of main"
  alone is no longer treated as unshipped.
- **Orphaned rapid worktrees (no session doc) are handled in `burn`.** They're
  inventoried and run through the same shipped test; one that no signal can
  clear (no doc, no merged PR, not in main by ancestry or patch-id) is **kept
  and flagged**, never auto-deleted on a guess.

## 1.17.0 — 2026-07-07

- **A second (third, …) live collab is now as easy as the first — one per repo,
  automatically.** The `collab-start` tmux session used to be a single hardcoded
  name (`rapid-collab`), so a second concurrent collab had to be driven with raw
  `tmux` and the `open`/`kill`/`--add` verbs couldn't see it. The session is now
  named **per repo** — `rapid-collab-<repo>`, derived from the slugs' worktrees
  (all slugs in a collab share one repo). Start a collab in a different repo and
  it lands in its own tmux session with zero extra typing.
  - **Lifecycle verbs resolve their target from context.** `collab-start open` /
    `kill` figure out which collab from where you run them: the current repo's
    (run from inside a pane or anywhere in the repo). If you're outside any repo
    and several are running, they list the collabs and ask you to disambiguate
    with `-n`. `--add` resolves the session from the *new* slug's own repo.
  - **`-n <name>` override** runs two collabs in the *same* repo
    (`rapid-collab-<name>`); pass the same `-n <name>` to that collab's
    `open`/`kill`. The relay itself was already name-agnostic (it keys off cwd →
    slug and `$TMUX_PANE`), so nothing else changed — multiple named collabs just
    coexist.
  - Repo names with spaces/dots are sanitized into valid tmux session names
    (e.g. `Dice AI` → `rapid-collab-Dice-AI`).
  - Docs updated: `references/collab.md` (spin-up add-check + reopen/shutdown),
    `references/collab-live/README.md`, and the `collab-start` header/help.
  - Also fixed a stale post-launch hint: `collab-start` no longer tells you to
    `/rapid resume` each pane — panes auto-adopt their worktree's session.

## 1.16.2 — 2026-07-06

- **CLI copy: every suggested command now says `rapid-collab`.** `collab-start`
  printed its own filename in hints ("Reopen anytime: collab-start …"), but the
  documented way to invoke it is the `rapid-collab` alias — a user who typed
  `rapid-collab kill` was told to reopen with a command that may not exist in
  their shell. All user-facing suggestions (kill/open hints, usage, README
  manage block + alias tip) now use `rapid-collab`; the `collab-start:` error
  prefix stays as the program identity.

## 1.16.1 — 2026-07-04

- **Fix: live sends could land in the peer's composer WITHOUT submitting.** The
  relay typed the message and fired Enter immediately; an Enter arriving while
  the TUI is still ingesting the pasted text gets swallowed, leaving the
  message sitting unsent in the peer's textfield — indistinguishable from
  silence, and the direct cause of leads waiting on peers who had "replied".
  `tmuxPoke` now settles briefly after typing, then **verifies the composer
  actually cleared** after Enter (capture-pane, text gone after the `❯`
  prompt) and re-sends Enter with backoff up to 4 times; if it still won't
  submit it throws, so `collab_send` reports the doc-only fallback instead of
  claiming live delivery. Running agents pick the fix up on their next claude
  restart (the relay is spawned per chat).
- The mid-session auto-join instructions in `collab.md` get the same rule for
  hand-typed `tmux send-keys`: always capture-pane and confirm the line left
  the composer; re-send Enter (or the text) if it's still sitting there.

## 1.16.0 — 2026-07-04

- **Close the loop — no more silent finishes while a peer waits.** Agents
  cannot see each other working; the only cross-chat signal is a message. A
  peer that completed a request and moved on without saying so looked
  identical to a stuck one, so leads sat blocked indefinitely. New
  `collab.md` section "Waiting on a peer" (both modes):
  - **A request obligates two messages**: an ack before starting (what +
    roughly when), and a result report the moment it lands (what changed +
    where — branch/PR/file, not a bare "done"). Stalls and parks get reported
    too. Workers report lane completion to the lead unprompted — the lead is
    by definition waiting on every lane.
  - **The waiting side arms a watchdog** — the one sanctioned live-mode
    self-wake (`ScheduleWakeup` ~270s): each quiet wake sends one status
    nudge to the peer; any peer message resets the count; 3 consecutive quiet
    nudge-cycles (~15 min) → escalate to the user and leave the item `[!]`.
    The nudge doubles as recovery for a lost/garbled original ask.
  - Live mode's "no poll loop" rule is now scoped to *receiving* — the
    blocked-waiting watchdog is the explicit exception.

## 1.15.0 — 2026-07-04

- **`rapid-collab open` / `rapid-collab kill` — collab tmux lifecycle.** Closing
  the terminal window only *detaches* tmux: the panes and their agents keep
  running invisibly, and a later `/rapid collab <N>` piles new panes onto the
  ghosts. Two new `collab-start` subcommands close the loop:
  - **`open`** — reattach to the running collab (switches clients when already
    inside tmux); says so if nothing is running.
  - **`kill`** — shut it down: kills the tmux session and every agent pane in
    it, and prunes those panes from the relay registry
    (`~/.rapid/collab-panes.json`) so a stale entry can't misroute a later live
    send. Session docs, worktrees, and branches are untouched — it ends the
    processes, not the work.
  - The skill now runs `rapid-collab kill` / `rapid-collab open` itself when the
    user says they're done with the collab or wants it back on screen — no more
    handing back raw tmux commands.
  - Docs: lifecycle section in `collab.md`; "Manage the running collab" in
    `collab-live/README.md` (which also now documents `--add`); `collab-start`
    header + `-h` usage.
- **Live mode means CHAT — the doc room is the non-live fallback, stated
  explicitly.** Agents in live mode were still corresponding through the doc:
  hand-appending `## Collab` lines as their way of "sending", or messaging
  "check the room" instead of the content. The rules now say it outright: in
  live mode the conversation happens in the chats via `collab_send` (which
  auto-writes the room line as a transcript); never hand-append chat lines,
  never reply by editing a doc, never send a bare "go read the room". Every
  doc-room section in `collab.md` (manual append, relay-once, autonomous poll
  loop, the `/rapid collab <slug>` numbered flow) is now explicitly labeled
  doc-mode-only, with the live-mode shortcut up top. Roster line + loop-state
  comment stay hand-maintained in both modes.

## 1.14.0 — 2026-06-25

- **Collab roles & roster — one agent fronts the user.** Multi-agent collab now
  has a **lead** (whoever opens the collab): the single point of contact with
  the user. Fixes a real race — a question could be lost behind a chat blocked
  waiting on the user, or two agents could ask at once and split attention.
  - **Workers route user-questions through the lead.** A worker that needs the
    user's decision sends `[Q→user] …` to the lead, marks that item `[!]` blocked,
    and keeps doing other independent work; the lead surfaces it to the user
    (stacking multiples, numbered), gets the answer, and relays it back so the
    worker unblocks. The user becomes one ordered queue.
  - **The roster lives in the room.** The lead maintains a roster line at the top
    of the `## Collab` room — `lead: … · members: … · owns: …` — the one mutable
    line, the authoritative "who's lead / who's here / who owns what."
  - **A new agent joining mid-session reads the room to learn who's who**, then
    checks in with the lead, who assigns it a non-overlapping lane and rewrites
    the roster. No re-explaining; the durable room is the source of truth.
  - `references/collab.md` (new "Roles & roster" section).
- **One-command mid-session add.** `/rapid collab 1` now notices a running
  `rapid-collab` tmux and **adds the new agent as a pane to it** (via
  `collab-start --add`) + auto-nudges it to join the lead — no more
  `tmux split-window` / `Ctrl-b %` by hand. New `--add` mode in
  `collab-start` (splits the live session instead of erroring; caps total panes
  at 4); the spin-up flow branches on whether a collab is already running.

## 1.13.0 — 2026-06-24

- **Live collab now delivers the message directly — no "collab" doorbell.**
  Previously a live send appended to the peer's room and typed the *word*
  `collab` into its pane, so the peer had to go *read* the room to find what you
  said. Now the relay types **your message itself** into the peer's pane (tagged
  `[collab from rapid/<sender>]` for reply routing only — not an attribution), so
  the two agents converse directly: the peer sees the message land and answers
  with `collab_send`, which types the reply into *your* pane. The `## Collab`
  room is still written as the durable record + recovery log (a garbled/mid-turn
  inject only delays, never loses — the peer catches it on its next `collab`).
  Also fixes double-signing: pass the **raw** message to `collab_send`; the relay
  does all signing/tagging. `relay.mjs`, `collab.md`, `collab-live/README.md`.
- **Version check fires at session start again.** v1.9.0 moved it off start
  (network-free start), leaving it only on the reap — so users who never ran
  cleanup never saw update pings. Restored: runs once/day right *after* the
  session-start ack (non-blocking, fail-silent; the bare menu stays
  network-free). Still throttled across start + reap + `/rapid update`.
- **`/rapid collab setup` offers the `rapid-collab` shell alias.** After enabling
  live mode it offers (with consent) to add the alias to your shell rc
  (zsh/bash/fish-aware, idempotent, real path); same offer on first
  `/rapid collab <N>` if unset. No more manual `~/.zshrc` paste.

## 1.12.0 — 2026-06-24

- **`/rapid collab <N>` — spin up a collab set in one command.** A *number*
  (1–4) means "mint N collab-ready sessions in this repo and print the command to
  open them." It's a scaffolder: it creates the sessions + worktrees, prints the
  opener (`rapid-collab <slugs>` for 2+, or a `cd … && claude` + pair hint for 1),
  and does NOT bind the current chat — you close it and run the printed line. >4
  is rejected. Disambiguation: a number spins up, the word `setup` enables live
  mode, a slug messages that peer, bare `collab` checks the room.
- **Skip `/rapid resume` in collab panes — auto-adopt identity from the
  directory.** Since the relay already derives a pane's identity from its cwd, a
  collab pane now auto-adopts the session whose worktree it's in the moment you
  run `/rapid collab …` — no manual resume. The crossed-identity guard stays for
  the one failure case (already bound to a *different* slug than the cwd).
- **Session status after every `push`/`carpool`.** Each ship now ends with the
  full review (shipped / done-unshipped / in progress / queued / parked /
  blocked) plus a one-line verdict — `✅ queue clear` or `⚠️ N still open: …` — so
  you always know whether everything's done or something was deferred.
- **Live-collab onboarding (`/rapid collab setup`).** One command registers the
  relay MCP, sets `collabLive: true`, and verifies tmux. When someone uses collab
  without it configured, rapid now **offers to enable it** instead of silently
  dropping to doc-mode. First-run onboarding mentions it; `collab-start` caps at
  4 panes to match `/rapid collab <N>`.
- Docs: `references/collab.md` (spin-up + auto-adopt + enabling), `setup.md`
  (Enabling live collab), `push.md` (status step), `collab-live/README.md`,
  `collab-start` (cap). *(Deferred: a `rapid-collab <dir> <dir>` shell variant
  that mints from raw directories — doing it well duplicates session-creation in
  bash; tracked as a follow-up.)*

## 1.11.3 — 2026-06-24

- **collab live mode: identity-must-match-the-pane guard.** Live mode keys a
  pane's identity off its working directory (cwd → `**Worktree:**` → slug), but
  `/rapid resume` can bind an agent to *any* slug — so resuming a slug whose
  worktree ≠ the pane's cwd silently inverts identity and misroutes every poke.
  (Found while testing: two collab panes resumed each other's slugs; one agent
  ended up "waiting on itself.") Fixes:
  - **Agent guard** (`references/collab.md`): before sending/replying/acting on a
    poke in live mode, compare the bound slug to the relay's cwd-derived `self=`
    (`collab_register` / `relay.mjs status`); on a mismatch, STOP and tell the
    user to `/rapid resume <self>` instead of misrouting.
  - **`collab-start`** now prints the exact `/rapid resume <slug>` per pane
    (paired to that pane's directory) instead of a generic "resume <slug>", so
    the slugs can't be crossed; header/usage/dry-run text updated to match.
  - `references/collab-live/README.md` gains a matching ⚠️ note.

## 1.11.2 — 2026-06-24

- **`inbox`: dropped the auto-surfacing — reading is purely manual.** 1.11.0
  shipped the inbox with passive surfacing (a `📬` unread count on the `/rapid`
  menu and an "unread notes" flag when binding a session). That was the wrong
  instinct: the intended flow is to leave a note in one agent's inbox and then,
  when ready, go to the other agent and tell it to check. Removed the menu `📬`
  count and the resume/reuse flag entirely — a note now waits silently until the
  user tells the recipient to read it. The read trigger also accepts natural
  phrasings ("check your inbox" / "check inbox" / "read your inbox"), not just
  the bare word. The reap still treats an unread inbox note as at-risk, so a
  left note is never cleaned away before it's read.

## 1.11.1 — 2026-06-24

- **`collab-start` helper for live mode.** One command —
  `references/collab-live/collab-start <slugA> <slugB> …` — resolves each
  session's worktree, opens a tiled tmux session with a pane per slug (each
  started *in its worktree* so the relay auto-registers it), and launches
  `claude` in every pane. You then `/rapid resume <slug>` in each and
  `/rapid collab <peer>` to talk. `--dry-run` prints the plan without touching
  tmux. Removes the manual tmux fiddling from collab live-mode setup; documented
  in `references/collab-live/README.md`.

## 1.11.0 — 2026-06-24

- **New `inbox` verb — leave an async note for another session.** The async
  cousin of `collab`: where `collab` opens a live/polled back-and-forth, `inbox`
  just drops a note into another session's doc for it to find later. Built for
  "tell one chat to leave a message for another" without starting a conversation
  or arming any polling.
  - `/rapid inbox <slug> [message]` appends a signed `[ ]` line to session
    `<slug>`'s new `## Inbox` section and **stops** — no autonomous loop, no
    tmux poke (not even in live mode), no relay-to-start. Deliberately passive:
    it's the leave-a-note channel, not the talk-in-real-time one.
  - `inbox` (bare word) reads **your** session's `## Inbox`: shows unread notes,
    marks them read (`[ ]` → `[x]`), and offers to pull actionable ones into
    `## Notes`.
  - **Passive surfacing** (no poll, no poke): the `/rapid` menu shows a `📬 N`
    marker next to a session with unread notes, and binding a session (reuse or
    resume) flags `📬 N unread inbox notes — say inbox to read`.
  - **Safety:** unread inbox notes are an at-risk signal for the reap — a session
    holding one is skipped until the note is read, so a left note is never
    silently cleaned away. A peer's `## Inbox` joins its `## Collab` room as a
    sanctioned cross-doc write; `wash`/`wax` preserve the section.
  - New `references/inbox.md`; SKILL.md triggers, doc template, menu, reap rules,
    and cross-doc rule updated to match.

## 1.10.0 — 2026-06-23

- **`collab` live mode (opt-in, real-time).** A new optional transport for the
  cross-agent chatroom that swaps the doc-mode poll + one-time manual relay for
  a real-time **push**: when one agent sends, the peer is poked to read
  *immediately* — no self-poll loop, no per-message relay. Agents stay ordinary
  interactive `claude` sessions (your subscription, not API-billed SDK).
  - Ships a zero-dependency relay, `references/collab-live/relay.mjs`, that runs
    as **both** a local MCP server (`collab_send` / `collab_register` tools) and
    a CLI. On send it appends the signed line to the peer's `## Collab` (still
    the durable source of truth) and `tmux send-keys "collab"` into the peer's
    pane. Identity is derived (cwd→`**Worktree:**`→slug; pane from `$TMUX_PANE`
    via `~/.rapid/collab-panes.json`) — nothing hardcoded.
  - **Opt-in and additive:** gated on `collabLive: true` in `config.json` + the
    relay installed + both chats in **tmux** (Unix only). When unavailable,
    `collab` silently falls back to the existing doc-mode poll/relay flow —
    nothing breaks for anyone.
  - Runaway exchanges are bounded by the existing `[DONE]`/`[PAUSED]` protocol;
    a missed poke only *delays* a message (the room is durable), so live mode
    needs no fallback poll.
  - Docs: new **Live mode** section in `references/collab.md`, setup in
    `references/collab-live/README.md`, `collabLive` added to the `config.json`
    schema in `references/setup.md`.

## 1.9.1 — 2026-06-23

- **ASCII logo header on the `/rapid` menu.** Bare `/rapid` now prints a small
  `rapid` wordmark — a diagonal slash tucked against the letters so it reads
  `/rapid` — above the menu options, with the tagline, installed version, and
  `rapid-skill.vercel.app` underneath. The version is rendered from this
  SKILL.md's frontmatter (`v<version>`), so it tracks the installed build
  automatically. Cosmetic only; the menu's behavior and the `/rapid <note>`
  fast path are unchanged.

## 1.9.0 — 2026-06-23

- **Menu-first start.** Bare `/rapid` (and `/rapid start` with no slug) now opens
  an **instant menu** — New session, Resume, Cleanup, Review, Handoff, Update,
  Help — and does *nothing* until you pick: no session created, no network, no
  housekeeping. The menu appears the moment you type, filled from a cheap,
  network-free local scan that shows live/finished counts. You pick the intent;
  the skill only then acts. New section **Step 2·menu** in SKILL.md.
- **`/rapid <note>` is the unchanged fast path.** A note attached = clear intent,
  so it skips the menu entirely and captures straight into a new-or-reused
  session, exactly as before. Typing your first note at the menu does the same.
- **Cleanup is now opt-in, never automatic.** The start-time reap sweep
  (`Step 2·after`) is **removed** — starting a session no longer reaps finished
  leftovers, fast-forwards `main`, or touches the network for chores. The same
  sweep now runs *only* when you ask: the menu's **Cleanup** option or the bare
  `tidy` / `reap` verb (mechanics unchanged; renamed to **The reap sweep**).
  Trade: the user decides when to GC, so start is always instant; the menu
  surfaces the finished-session count as a nudge so it's easy to remember.
- **`lastReap` throttle retired.** With no automatic sweep there's nothing to
  throttle, so the per-repo `lastReap` map in `config.json` is no longer read or
  written (an old key is harmless). The once-daily version check, which used to
  ride the post-ack reap pass at start, now rides the reap sweep instead — so a
  plain session start never goes to the network at all. `/rapid update` still
  checks on demand.

## 1.8.1 — 2026-06-22

- **Session-level `**Pushed:**` header flag.** New doc-header field, `no` until
  a `push`/`carpool` opens a PR, then the PR ref(s). Gives cleanup and scans an
  at-a-glance answer to "did this session ever reach a PR," instead of inferring
  it from the `## Pushes` block or per-note `[x]` boxes. The reap now treats a
  `**Pushed:** no` header as an explicit at-risk signal (local-only work that
  never became a PR) and never auto-deletes it; a pushed session stays deletable
  only after its PR is confirmed merged. Closes the gap where committed-but-
  never-pushed work could be quietly cleaned away.

## 1.8.0 — 2026-06-17

- **Instant start — cleanup moved off the critical path.** `/rapid` now binds
  or creates the session and acknowledges *first*, then reaps finished
  leftovers *after* — never before. The Step 2 sweep that used to run
  synchronously on every start (a `gh pr list` per recorded branch + `git
  fetch`/`pull`, scaling with the number of leftovers, often a multi-second to
  multi-minute wall) is now: **(1) throttled** per-repo via a new `lastReap`
  map in `config.json` — skipped entirely if the repo was reaped in the last
  6 hours, so nearly every start does zero network; **(2) non-blocking** — run
  detached when the harness supports background tasks, else inline after the
  ack; and **(3) batched** — all PR states fetched in ONE `gh pr list` for the
  repo instead of N sequential `--head` calls. Why GC exists is unchanged
  (users start sessions far more than they run `done`); it just no longer makes
  them wait to drop a note. The reap section is renamed **Step 2·GC → Step
  2·after** to reflect that it runs post-acknowledgement.
- **One-line "other sessions" hint at start.** After the ack, a cheap,
  network-free doc scan appends a hint when the repo has other sessions: which
  are resumable (live notes → `/rapid resume <slug>`) and how many are finished
  (→ `say tidy`). Surfaces resume + cleanup without a blocking menu — the hot
  path (`/rapid <note>`) stays zero-friction.
- **New `tidy` / `reap` verb.** On-demand version of the start-time reap:
  cleans only *finished* (shipped/safe) sessions for the current repo and
  reports what it did. The gentle middle of the cleanup ladder — safer than
  `burn` (which nukes everything); needs no session and no confirmation, and
  bumps `lastReap` so the next auto-sweep stays throttled. See
  `references/cleanup.md`.
- **Version check is post-ack too.** The once-daily update ping now runs in the
  same throttled post-ack pass as the reap, so it never delays capture.

## 1.7.0 — 2026-06-16

- **Rapid now only ever creates `rapid/*` branches.** Per-note working branches
  changed from `<type>/<short-slug>` (`feat/*`, `fix/*`) to
  `rapid/<slug>-<note-slug>`, joining the session branch (`rapid/<slug>`) and
  push batches (`rapid/<slug>-batch-<N>`) under one prefix. A session must never
  attach to or cut a non-`rapid/` branch unless the user explicitly asks.
  **Why:** per-note branches are local-only cherry-pick sources that never get
  pushed, so when named `feat/*`/`fix/*` the Step 2·GC auto-reap (which keys on
  `rapid/<slug>*`) couldn't see them and they piled up indefinitely (a user hit
  100+ stale local branches). The existing `rapid/*` scan now reaps them
  automatically. Naming-only — pushes still ride `rapid/<slug>-batch-<N>`, so
  PR/GitHub branch names are unaffected. `burn` stays the catch-all that also
  sweeps any non-`rapid/` branches a session recorded.

## 1.6.1 — 2026-06-15

- **Collab loop: seeing any new peer note resets the idle budget to a full 3.**
  Sharpened the autonomous-loop stop rule so it ends only on **3 *consecutive*
  quiet checks** — *any* new peer line you see on a wake (not just one addressed
  to you; a `[DONE]`/`[PAUSED]`/info line counts too) refills the budget to 3,
  even if spotted on your last check. So a message that lands late never causes a
  premature stop; only an unbroken run of silence does. Also added a **"When to
  check the room"** rule: check at every natural pause *during* work (between
  sub-tasks / notes) plus the ~5-min timer as backstop — don't wait until the
  whole task is done, or a peer needing mid-task coordination can hit its own
  idle timeout and PAUSE before you answer. SKILL.md collab row + the
  `collab-loop` state note updated to match. See `references/collab.md`.

## 1.6.0 — 2026-06-14

- **`collab` is now autonomous: agents self-poll instead of relaying every
  message.** After posting into a room or running `collab`, a chat arms a poll
  loop (`ScheduleWakeup`, ~5 min; `/loop` self-paced as a fallback) that re-reads
  the `## Collab` room on each wake, acts on anything the peer cleared, and
  replies. Budget is **3 idle checks ~5 min apart (~15 min), then stop**; sending
  OR receiving a message resets it, so an active exchange keeps going and only
  silence ends it. A `collab-loop` state comment in the chat's OWN `## Collab`
  tracks `checks-left` + `last-seen` across context compaction. The user still
  relays ONCE per side to kick each agent off (a file write can't wake a sleeping
  chat); after that the two self-drive. **On stop the agent posts an explicit
  status tag to the ROOM** so the peer reading it can tell finished from paused:
  `[DONE] <result>` (work complete, nothing more coming) vs `[PAUSED]` (idle after
  3 quiet checks, work NOT finished, resume to continue). A reader honors the tag
  (don't redo a `[DONE]`, don't assume a quiet/`[PAUSED]` peer finished). The
  agent echoes the same in the user's chat. Guardrails: act only on what the peer
  explicitly cleared, and never build / commit / push just because a peer said
  so (the user's standing rules still gate state-changing actions). Also bumped
  the SKILL.md frontmatter version (was stale at 1.3.0). See `references/collab.md`.

## 1.5.0 — 2026-06-14

- **Replaced the multi-agent roster `fleet` with a simple `handoff`.** The old
  `fleet` (split one backlog into N file-disjoint lanes with a roster +
  war-room) is gone. In its place, **`/rapid handoff [this session | <note N> |
  <description>]`** seeds a NEW standalone session doc (own slug, header
  `**Handoff:** pending`, no worktree) holding the full instructions, and ALWAYS
  ends with the copy-paste line `/rapid start <slug>`. A fresh chat runs that to
  adopt it — `/rapid start` / `/rapid resume` now cut the worktree + branch off
  `origin/main` when adopting a pending hand-off. One plan, one chat. See
  `references/handoff.md`.
- **New `collab` — a chatroom between two live agents.** `/rapid collab <slug>
  [message]` posts into a shared, append-only `## Collab` room and tells the
  user to relay to that chat; the bare word `collab` reads the room. Every new
  session doc carries a (blank) `## Collab` section. No live channel: the user
  relays. See `references/collab.md`.
- **New rule: one chat writes one doc — never another chat's.** Fixes the
  lost-update trap where a plan written to a loose `~/.rapid/*-plan.md` file was
  owned by nobody, so the adopting chat wrote its status back into the
  originating doc and the two clobbered each other. The only sanctioned
  cross-doc write is posting to a peer's `## Collab` room. GC and
  reuse-as-empty skip a `**Handoff:** pending` doc.

## 1.3.0 — 2026-06-13

- **New `fleet` command — collaborate with other agents on one session's
  work.** A lead chat splits its backlog into N **file-disjoint**
  assignments (so parallel agents never edit the same file), writes them
  into a `## Fleet` roster + append-only log in its own doc, and emits a
  generic join command. The user opens N chats and pastes `/rapid fleet
  join <lead-slug>` into each; each agent **self-claims** an open
  assignment (optimistic claim-and-verify with a lexicographic tie-break,
  since there's no lock), spins up its **own** independent rapid session
  (own slug/worktree/branch), and **ships its own PRs**. The lead
  coordinates and tracks; members touch the shared doc only on four events
  (claimed / blocked / shipped / handoff). No live channel between chats —
  the user is the relay and the lead re-reads on `fleet` / prod. GC never
  reaps a doc with an active fleet block. See `references/fleet.md`.
- **`fleet sync` — ship the whole fleet from the lead.** When the work is
  done, the user no longer visits each member chat to push. `fleet sync`
  (lead) gathers every member's committed branch (member worktrees share
  the lead's git repo), verifies readiness, flags any with uncommitted
  work (`sync force` lets the lead commit on their behalf), and stages them
  — then one `push` to the lead opens one PR per assignment. Honors the
  never-PR-without-`push` rule: sync gathers, push ships.

## 1.2.8 — 2026-06-13

- **New `wax` command — groom the doc without emptying it.** The
  non-destructive cousin of `wash`: condenses finished notes to one line
  (keeping their PR links), groups related live notes under feature
  subheadings, refreshes in-progress state, and strips stale sub-bullets.
  Hard guardrails so grooming never amputates load-bearing tokens (PR
  URLs, `branch:` lines, the `## Pushes` block, status boxes). Doc-only —
  no git mutations. See `references/wax.md`.

## 1.2.7 — 2026-06-11

- **GC reaps by PR state, not ancestry.** Step 2·GC (and the `scrap`/`burn`
  risk-passes) now decide "shipped" via `gh pr list --head <branch> --state
  all` (MERGED/CLOSED = shipped). Banned `rev-list origin/main..HEAD` /
  `merge-base --is-ancestor` — a squash/rebase-merged branch reads as *ahead*
  of main and was the #1 cause of sessions never reaping (worktrees piling up
  to GBs). Stale `[c]`/`[~]` checkboxes no longer block reaping.
- **Exact-ref deletion.** Remote-branch deletes must use the exact,
  fully-qualified ref name, never a bare suffix/pattern — the footgun that
  nearly nuked an unrelated branch.

## 1.2.6 — 2026-06-10

- **Agentic UI + feature-work rules.** New guidance so the agent carries
  design direction instead of waiting for pixel-level line-items: look at the
  actual rendered UI (screenshot before/after), sweep sibling instances of a
  pattern, keep the established design language, and offer 1–2 concrete
  suggestions per change.
- **New feature → scan the app for where it plugs in.** A feature isn't done
  until it's a first-class citizen everywhere its peers live (filters, nav,
  settings, search, shortcuts, empty states, mobile vs desktop, shared
  enums/label maps); enumerate the integration points hit in the outcome line.
- **Self-unblock.** Fix the blocker (deps, dev server, env, tooling, auth)
  and keep going rather than bouncing it back; fold reusable fixes into the
  skill.
- **Be able to screenshot the running app**, so "look at the UI" is real:
  symlink node_modules/.env from the main checkout, start the dev server,
  drive it with agent-browser at mobile + desktop viewports, and fall back to
  the deployed/preview URL when a screen is unreachable.

## 1.2.5 — 2026-06-09

- **Verify PR/deploy status before reporting it.** New rule: never tell the
  user a PR is open/merged/shipped/deployed (or that a change "won't take
  effect until X merges") without running `gh pr view` first — they often
  merge within minutes, so remembered state goes stale fast.

## 1.2.4 — 2026-06-08

- **Broaden the terse-style formats.** The response-style section now points
  to the full toolbox — tables, lists, checklists, code blocks, and
  mermaid/ASCII diagrams — and says to match the format to the data, not
  just "bullets and tables."

## 1.2.3 — 2026-06-08

- **Terse-by-default response style.** New section instructs the agent to
  lead with the answer, prefer bullets/tables, and compress (not omit) —
  the user juggles multiple projects and wordy replies are fatiguing.

## 1.2.2 — 2026-06-07

- **Slug pools doubled.** 40 speed adjectives × 40 vehicles (1600 combos):
  quantum, overdrive, warp, ballistic, stealth… meet drone, jetpack,
  maglev, hypercar, hot-rod. `warp-maglev` and `stealth-jetpack` are now
  possible sessions.

## 1.2.1 — 2026-06-06

- **Speed-themed slug adjectives.** The adjective pool is now all speed &
  motion (`turbo-kart`, `nitro-scooter`, `breakneck-blimp`) — matching the
  vehicle nouns. Example slugs updated across the docs.

## 1.2.0 — 2026-06-06

- **Delegation for big notes.** When a note is feature-sized and the
  harness supports background subagents (Claude Code, Codex), the agent
  delegates it to a background agent in its own disposable worktree —
  the main loop stays free to capture notes instantly and work small
  ones inline. One delegate at a time; delegates commit to the note
  branch but never push or open PRs; completion flips the note to `[c]`
  for the normal `push` batch. `review` gains a `delegated:` row, and
  the doc lint allows one inline `[~]` plus one delegated.

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
- **Cross-tool install.** `npx skills add pxdogbo/rapid` wires the skill
  into every agent on the machine (Claude Code, Codex, Cursor & friends);
  per-tool clone paths documented too. Frontmatter gained
  `user-invocable: true` so Codex surfaces `/rapid` in its slash menu.
- **Vehicle slugs.** Session names are now `<adjective>-<vehicle>`
  (`turbo-kart`, `swift-glider`, `neon-moped`) instead of animals — things
  that travel, for a queue that ships.
- **Bare-word safety.** `wash` aliases trimmed to `wash`/`clean` (`wipe`
  and `clear` removed — too common as ordinary words), and a bare word
  with no session no longer silently starts one — it's just a normal
  message (exceptions: `burn` is repo-wide, `/rapid update` is about the
  skill).

## 1.0.0 — 2026-05-31

- Initial release: session docs + worktree isolation, drive-by note
  capture, status boxes (`[ ]` `[~]` `[c]` `[x]` `[!]` `[p]` `[-]`),
  batched `push` with sealed PRs, `test`/`testdrive` self-verification,
  `wash`/`scrap`/`burn` cleanup ladder, `park`, `link`, `reverse`/`undo`,
  session-start garbage collection.
