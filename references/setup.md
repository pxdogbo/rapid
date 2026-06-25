# Setup — first-run onboarding, config, and updates

Read this file when: `~/.rapid/config.json` does not exist (first run),
or the user invokes `/rapid update`, or the once-daily version check is
due (it now rides the reap sweep — the menu's Cleanup option or `tidy` —
never session start).

---

## config.json

`~/.rapid/config.json` is the skill's only config file. It is created by
the first-run onboarding and read at the start of every session. Schema:

```json
{
  "sessionsRoot": "~/.rapid/sessions",
  "worktreesRoot": "~/worktrees",
  "onboardedAt": "2026-06-05T10:00:00Z",
  "lastUpdateCheck": "2026-06-05",
  "collabLive": false
}
```

- `sessionsRoot` — where session docs live. Default `~/.rapid/sessions`.
- `worktreesRoot` — parent dir for per-session worktrees
  (`<worktreesRoot>/<repo-name>/<slug>/`). Default `~/worktrees`.
- `onboardedAt` — set once when onboarding completes; its presence means
  "never ask again."
- `lastUpdateCheck` — date (YYYY-MM-DD) of the last new-version check.
- `collabLive` — opt-in real-time `collab` (Unix + tmux only). Default
  `false` (doc-mode poll/relay). When `true` AND the `rapid-collab` relay is
  installed AND both chats run in tmux, a `collab` send pokes the peer
  instantly — no poll loop, no manual relay. Falls back to doc-mode otherwise.
  Setup: `references/collab-live/README.md`.

> Earlier versions stored a `lastReap` map (repo-root → datetime) to throttle
> an automatic start-time sweep. As of 1.9.0 cleanup is manual — there is no
> automatic sweep and nothing throttles on it — so `lastReap` is no longer
> read or written. An old key left in `config.json` is harmless; ignore it.

**Resolve every path through this file.** Anywhere the skill docs say
`~/.rapid/sessions/` or `~/worktrees/`, the actual path is whatever
config.json says. If a key is missing, use the default and add it.
The config is plain JSON precisely so non-Claude tools (Codex CLI,
anything reading `~/.rapid/`) can honor the same paths.

---

## First-run onboarding

Trigger: `/rapid` (any form) fires and `~/.rapid/config.json` does not
exist. Run this BEFORE creating any directories, docs, or worktrees.

1. **Introduce the skill in one short block** — what's about to happen
   and where files go. Keep it tight; this is a consent screen, not a
   manual:

   ```
   First rapid session — quick setup (one time).

   rapid is a realtime note queue: drop observations while you use your
   product live; I capture each one to a doc on disk, work through them
   in an isolated git worktree, and ship batches as single PRs when you
   say `push`. The five words you'll use most: drop a note (just type
   it), `review` (where things stand), `push` (ship one PR), `test`
   (I verify it myself), `wash` (clear the queue, keep the session).

   It stores files in two places:
     ~/.rapid/        — session docs (the note queues) + this config
     ~/worktrees/     — isolated working copies, one per session

   OK to create these, or want different locations?
   ```

2. **Wait for the answer.**
   - "ok" / "yes" / any affirmative → use the defaults.
   - Custom paths → expand `~`, validate they're writable, and use them.
   - If the user asks questions, answer, then re-ask.
3. **Create the directories** (`sessionsRoot`, `sessionsRoot/archive`)
   and **write config.json** with `onboardedAt` set to now.
4. **Mention updates once**: `When a new version of the skill ships,
   I'll flag it the next time you clean up — /rapid update pulls it.`
   Optionally add one line about live collab: `And if you ever want two agents
   working together in real time, \`/rapid collab setup\` turns that on.`
5. **Continue straight into the normal session start** — don't make the
   user re-type their `/rapid <note>`; carry the first note through.

Never re-run onboarding once `onboardedAt` exists. If config.json is
missing but `~/.rapid/sessions/` already has docs (pre-config install),
skip the consent question — the user has already been using the defaults
— and just write a default config.json silently.

---

## Once-daily version check

Runs **once per day**, on whichever comes first:
- **Session start** — right after the acknowledgement when a session is started,
  reused, or resumed (NOT on the bare `/rapid` menu — that stays network-free
  until the user picks). Post-ack, non-blocking, fail-silent: it never delays
  capture, it just appends a one-line "update available" ping to / after the ack.
- **The reap sweep** (menu Cleanup / `tidy`) — runs it there too.
- **`/rapid update`** always checks, ignoring the daily throttle.

Because of the `lastUpdateCheck` throttle, the very first session (or reap) of
the day does the check and every later one that day skips it — so a new session
tells you about an update without the network cost repeating all day.

1. Read `lastUpdateCheck` from config.json. If it's today's date, skip.
2. Otherwise write today's date to `lastUpdateCheck` (regardless of
   outcome — never check more than once a day), then compare versions:
   - Installed: `version:` from the frontmatter of the installed
     SKILL.md.
   - Latest: if the skill directory is a git clone, `git -C <skill-dir>
     fetch --quiet origin main` and read the frontmatter from
     `origin/main:SKILL.md`. Otherwise `curl -fsS --max-time 3` the raw
     SKILL.md from the repo and read its frontmatter.
3. If latest > installed, append ONE line — to the session-start ack (when
   triggered at start) or the cleanup report (when triggered by a reap):
   `rapid v<latest> available (you have v<installed>) — /rapid update to preview what changed.`
   The ping never applies anything — updating is always preview + confirm
   via `/rapid update`.
4. **Fail silently** on any error (offline, no git, timeout). Never
   block or delay the cleanup on this — the version ping is a courtesy
   riding along, not the point of the sweep.

---

## `/rapid update`

**Preview first, apply only on confirmation.** Nothing is pulled,
overwritten, or executed before the user has seen what changed and said
yes. The skill is markdown-only — an update is a readable text diff, so
show it like one.

1. **Locate the skill directory** (the directory containing the
   SKILL.md you are reading from). Note the installed `version:` from
   its frontmatter.
2. **Fetch the latest changelog WITHOUT touching the install**:
   - Git clone: `git -C <skill-dir> fetch --quiet origin main`, then read
     `origin/main:CHANGELOG.md` and `origin/main:SKILL.md` frontmatter.
   - Otherwise: `curl -fsS --max-time 5` the raw `CHANGELOG.md` and
     `SKILL.md` from the repo.
   If latest == installed: `Already on the latest (v<version>).` Stop.
3. **Show the preview**: print every changelog entry newer than the
   installed version, then:
   `v<installed> → v<latest>. Apply? (For the full text diff first, say "show diff".)`
   - On `show diff` (clone): `git -C <skill-dir> diff HEAD..origin/main`
     — the entire change, every line readable. Non-clone: link to the
     GitHub compare view `https://github.com/pxdogbo/rapid/compare/v<installed>...v<latest>`.
   - Wait for the user. Anything other than a yes = no update, no
     changes, stop.
4. **Apply on confirmation**:
   - Git clone: `git -C <skill-dir> pull --ff-only`. If the pull fails
     (diverged, dirty), report verbatim and stop — the user may have
     local edits worth keeping. Never force.
   - skills-CLI install: tell the user to run `npx skills update` (or
     reinstall as a clone if they want `/rapid update` to apply directly).
5. **Remind about reload** in one line: a running session keeps using
   the instructions already in context; new sessions pick up the new
   version.

`/rapid update` works any time — no session required.

### Why updates are auditable

Worth telling the user if they ask about update safety:
- The skill is **plain markdown** — no binaries, no install hooks, no
  executable code ships with it. Every update is a human-readable diff.
- Versions are **git tags** on the public repo; any two versions can be
  compared on GitHub (`/compare/v1.0.0...v1.1.0`).
- The agent never auto-applies an update — the once-daily check only
  *mentions* a new version; applying always goes through the preview +
  confirm flow above.

---

## Enabling live collab (`/rapid collab setup`)

Live `collab` (real-time agent↔agent — see `references/collab.md` → Live mode) is
**opt-in** and needs a one-time setup. `/rapid collab setup` does all of it, and
the skill offers to run it automatically the first time someone uses collab
without it configured (it never silently degrades to doc-mode without saying so).
Steps:

1. **Check the platform.** Live mode is **macOS/Linux + tmux only**. Verify tmux
   is on PATH (`command -v tmux`). If missing, tell the user to install it
   (`brew install tmux`, or their package manager) and stop — set nothing yet.
   On Windows / no tmux, say live mode isn't available there; doc-mode collab
   still works unchanged.
2. **Register the relay as a user-scoped MCP server** so every chat — including
   each per-session worktree — gets the `collab_send` / `collab_register` tools:
   ```sh
   claude mcp add rapid-collab -s user -- \
     node ~/.claude/skills/rapid/references/collab-live/relay.mjs
   ```
   (Use the actual skill dir if it isn't the default `~/.claude/skills/rapid` —
   it's the directory this SKILL.md lives in.) If `rapid-collab` is already
   registered, skip this — don't double-add.
3. **Flip the flag:** set `collabLive: true` in `~/.rapid/config.json` (add the
   key if it's absent).
4. **Offer the `rapid-collab` shortcut.** The launcher (`/rapid collab <N>`
   prints it) lives at a long path — `…/references/collab-live/collab-start` — so
   offer a shell alias. **Ask first** (it edits the user's shell profile):
   `Add a \`rapid-collab\` shortcut so you can type \`rapid-collab <a> <b>\`
   instead of the full path?` On yes:
   - **Pick the rc file from `$SHELL`:** zsh → `~/.zshrc`; bash → `~/.bashrc`
     (or `~/.bash_profile` if that's what's sourced); fish →
     `~/.config/fish/config.fish`. If unsure which, ask.
   - **Idempotent:** grep the rc for an existing `rapid-collab` alias first; if
     it's already there, say so and skip.
   - **Append** the alias with the REAL collab-start path (the skill dir this
     SKILL.md lives in, not a hardcoded default):
     - zsh/bash: `alias rapid-collab=<skill-dir>/references/collab-live/collab-start`
     - fish: `alias rapid-collab '<skill-dir>/references/collab-live/collab-start'`
   - Tell them to `source <rc>` (or open a new terminal) to use it now.
   Declined → skip silently; the full path always works. (The same offer fires
   on the first `/rapid collab <N>` if the alias isn't set and live mode is on.)
5. **Confirm in one line:** `Live collab enabled — relay registered + collabLive
   on[ + rapid-collab alias added]. Restart your chats to load the new tools,
   then \`/rapid collab <N>\` to spin up a set.` (A running chat must restart to
   pick up the new MCP server.)

That's the whole setup. Afterwards `/rapid collab <N>` and `/rapid collab <slug>`
take the real-time path; nothing changes for doc-mode users. Re-running
`/rapid collab setup` is safe — it just verifies each piece (relay, flag, alias)
is in place.
