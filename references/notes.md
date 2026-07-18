# `park`, `unpark`, `drop`, `link` — note administration

Read this file when the user texts one of the bare words `park` /
`park <N>`, `unpark <N>`, `drop <N>`, or `link` / `link <N>`.

---

## Bare `park` / `park <N>`

When the user texts `park` or `park <N>` while **this chat has a
session**, they want to **set a note aside** — not done, not dropped,
just parked for later. The note keeps its branch, any commits, and any
sub-bullets; only its status box changes to `[p]`. If this chat has no
session, treat as a normal message.

Use cases the user gives:
- Mid-batch the note hits a question only the user can answer → park it,
  keep moving on the rest of the queue.
- A note turns out to need design input / external info / a teammate's
  PR to land first → park it, surface in the next review.
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
   - If there are more `[ ]` or paused `[~]` notes: `Picking up note <M>: <summary>.` Then continue the between-notes flow.
   - If nothing is left to do: `Queue clear (1 parked).` Stop.
5. **Parked notes count in pending totals** (`review`). They are NOT
   pushed by `push`. They trigger confirmation in `wash`, `scrap`, and
   `done`/`off`.

Rules:
- **Park does not drop.** Use `[-]` (dropped) only when the user
  explicitly says skip/drop/forget it. Parking implies "later," dropping
  implies "never."
- **Park is local.** It writes to the doc; it does NOT touch git.
  Branches stay where they are.

---

## Bare `unpark <N>`

When the user texts `unpark <N>` (or `unpark #<N>`) while **this chat
has a session**, flip note N from `[p]` back into the queue. The
reverse of `park`. If this chat has no session, treat as a normal
message.

Behavior:

1. **Resolve N** the same way as `park <N>`. If note N is not `[p]`,
   reply `Note <N> isn't parked (status: <box>).` and stop.
2. **Flip the status box**:
   - If there is no current `[~]` and nothing pending ahead of it →
     flip straight to `[~]` and start working on it now (honor any
     `paused at:` sub-bullet to resume where work left off).
   - Otherwise → flip to `[ ]` pending; it rejoins the queue in note
     order.
3. **Append a sub-bullet** `unparked [HH:MM]` under the note.
4. **Acknowledge in one line**: `Unparked note <N>: <summary> — <picking
   it up now / back in the queue>.`

`unpark 3`, "resume 3", "pick 3 back up" all mean the same thing —
handle phrased variants as the same action.

---

## Bare `drop <N>`

When the user texts `drop <N>` (or `drop #<N>`) while **this chat has a
session**, mark note N as dropped — the user is saying "never," not
"later." If this chat has no session, treat as a normal message.

Behavior:

1. **Resolve N** the same way as `park <N>`.
2. **If the note is `[x]` shipped**, dropping it doesn't undo anything —
   point that out: `Note <N> already shipped (PR #<n>). Drop just marks
   it; say "reverse <N>" if you want the work rolled back.` Then mark it
   anyway only if the user meant it — when in doubt, ask in one line.
3. **Flip the status box to `[-]`** and append `dropped [HH:MM]`.
   If the note was `[~]` in progress, also discard is NOT implied —
   leave any uncommitted work and branch in place and say so in the
   ack (the user can `reverse <N>` to also discard the work).
4. **Acknowledge in one line**: `Dropped note <N>: <summary>.` Then
   continue the between-notes flow (pick up the next queued note, or
   `Queue clear.`).

Rules:
- **Drop is bookkeeping, not rollback.** It never touches git. `reverse
  <N>` is the verb that discards work.
- Dropped notes don't count in pending totals and don't block `wash`.

---

## Bare `link` / `link <N>`

When the user texts `link` or `link <N>` (case-insensitive, optionally
with a leading `#` on the number like `link #3`) and **this chat has a
session**, print the URL(s) of recent PRs opened from this session —
plus, for web projects, the project's dev and production URLs. No
preamble, no commentary — the user wants the links.

Behavior:

1. **Read this chat's session doc** (`sessions/<slug>.md`) and extract
   the `## Pushes` block. Each push entry follows the format set by
   the push flow:
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

4. **Web project? Also print the project's own links.** After the PR
   list, add a Dev and a Prod line for the session's repo — resolved
   from local files only:
   ```
   - **Dev**: http://localhost:<port>
   - **Prod**: https://<domain>
   ```
   - **Detection + dev URL**: the repo is a web project if it has a dev
     server — a `dev`/`start` script in `package.json` or a framework
     config (Next.js, Vite, Astro, SvelteKit, Nuxt, CRA…). Resolve the
     port in this order: explicit `--port`/`-p`/`PORT=` in the script →
     port set in the framework config → the framework's default (Next.js
     and Nuxt 3000, Vite and SvelteKit 5173, Astro 4321, CRA 3000).
   - **Prod URL**, first local source that names one wins: the session
     doc's `**Links:**` header (see cache below) → `homepage` in
     `package.json` → deployment config (`vercel.json`, `netlify.toml`,
     `wrangler.toml` routes/domains, a `CNAME` file) → a canonical URL
     stated at the top of the README. Nothing local names it → omit the
     Prod line; NEVER guess or fabricate a domain.
   - **Cache the result** in the session doc header as
     `**Links:** dev <url> · prod <url>` so later `link` calls (in this
     chat or a chat that resumes the session) print it straight from the
     doc. This header line is the ONE write `link` may make.
   - **Monorepo with several web apps** → print the pair for the app the
     session's notes actually touched; genuinely ambiguous → one labeled
     Dev/Prod pair per app.
   - **Not a web project** → PR list only. No "not a web project" line,
     no apology.

5. **No work, no diffs.** This is read-only apart from the `**Links:**`
   header cache. Don't open the PRs to inspect them; don't run `gh pr
   view`; don't start dev servers, call deploy CLIs, or fetch anything
   over the network to resolve URLs. The user wants the links — that's
   it.

Edge cases:
- **No session in this chat** → treat as a normal message.
- **Session doc has no `## Pushes` block** → reply: "No PRs from this
  session yet." Stop.
- **`link 0` or negative** → reply: "N must be ≥ 1." Stop.
- **Doc is malformed / unreadable** → say so in one line, don't guess.

Never queue `link` (or `link <N>`) as a note. It's always a query.
