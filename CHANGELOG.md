# Changelog

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
