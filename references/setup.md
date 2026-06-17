# Setup — first-run onboarding, config, and updates

Read this file when: `~/.rapid/config.json` does not exist (first run),
or the user invokes `/rapid update`, or the once-daily version check is
due during session start.

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
  "lastReap": { "/Users/you/Developer/your-repo": "2026-06-05T14:00:00Z" }
}
```

- `sessionsRoot` — where session docs live. Default `~/.rapid/sessions`.
- `worktreesRoot` — parent dir for per-session worktrees
  (`<worktreesRoot>/<repo-name>/<slug>/`). Default `~/worktrees`.
- `onboardedAt` — set once when onboarding completes; its presence means
  "never ask again."
- `lastUpdateCheck` — date (YYYY-MM-DD) of the last new-version check.
- `lastReap` — map of repo-root → ISO datetime of the last finished-session
  reap for that repo. Step 2·after throttles on it: if the repo was reaped
  within the last **6 hours**, the start-time sweep is skipped entirely, so the
  overwhelming majority of `/rapid` starts do zero network. A manual `tidy`
  updates it too. A missing key / unknown repo means "never reaped" → the sweep
  runs. Created lazily on the first reap; absent until then.

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
   I'll mention it at session start — /rapid update pulls it.`
5. **Continue straight into the normal session start** — don't make the
   user re-type their `/rapid <note>`; carry the first note through.

Never re-run onboarding once `onboardedAt` exists. If config.json is
missing but `~/.rapid/sessions/` already has docs (pre-config install),
skip the consent question — the user has already been using the defaults
— and just write a default config.json silently.

---

## Once-daily version check

After the session is acknowledged — in the same throttled post-ack pass as the
finished-session reap (SKILL.md Step 2·after), never before the ack:

1. Read `lastUpdateCheck` from config.json. If it's today's date, skip.
2. Otherwise write today's date to `lastUpdateCheck` (regardless of
   outcome — never check more than once a day), then compare versions:
   - Installed: `version:` from the frontmatter of the installed
     SKILL.md.
   - Latest: if the skill directory is a git clone, `git -C <skill-dir>
     fetch --quiet origin main` and read the frontmatter from
     `origin/main:SKILL.md`. Otherwise `curl -fsS --max-time 3` the raw
     SKILL.md from the repo and read its frontmatter.
3. If latest > installed, append ONE line to the session-start
   acknowledgement:
   `rapid v<latest> available (you have v<installed>) — /rapid update to preview what changed.`
   The ping never applies anything — updating is always preview + confirm
   via `/rapid update`.
4. **Fail silently** on any error (offline, no git, timeout). Never
   block or delay a session start on this — the note queue is the
   product, the version ping is a courtesy.

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
