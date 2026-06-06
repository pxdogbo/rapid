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
  "lastUpdateCheck": "2026-06-05"
}
```

- `sessionsRoot` — where session docs live. Default `~/.rapid/sessions`.
- `worktreesRoot` — parent dir for per-session worktrees
  (`<worktreesRoot>/<repo-name>/<slug>/`). Default `~/worktrees`.
- `onboardedAt` — set once when onboarding completes; its presence means
  "never ask again."
- `lastUpdateCheck` — date (YYYY-MM-DD) of the last new-version check.

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

During session start (after the GC sweep, never blocking it):

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
   `rapid v<latest> available (you have v<installed>) — /rapid update to see what's new.`
4. **Fail silently** on any error (offline, no git, timeout). Never
   block or delay a session start on this — the note queue is the
   product, the version ping is a courtesy.

---

## `/rapid update`

Updates the installed skill in place and shows what changed.

1. **Locate the skill directory** (the directory containing the
   SKILL.md you are reading from). Note the installed `version:` from
   its frontmatter.
2. **If it's a git clone** (has a `.git`):
   ```
   git -C <skill-dir> pull --ff-only
   ```
   If the pull fails (diverged, dirty), report verbatim and stop — the
   user may have local edits worth keeping. Never force.
3. **If it's not a clone**: tell the user how to reinstall —
   `git clone https://github.com/pxdogbo/rapid ~/.claude/skills/rapid`
   (or their tool's skill path) — and stop.
4. **Show the delta**: read `CHANGELOG.md` and print every entry newer
   than the previously installed version. If versions match after the
   pull: `Already on the latest (v<version>).`
5. **Remind about reload** in one line: a running session keeps using
   the instructions already in context; new sessions pick up the new
   version.

`/rapid update` works any time — no session required.
