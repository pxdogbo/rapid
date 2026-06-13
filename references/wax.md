# `wax` — groom the session doc

Read this file when the user texts the bare word `wax` while **this chat
has a session**. If this chat has no session, treat `wax` as a normal
message — do nothing rapid-related.

`wax` brings the doc up to speed and cuts bloat **without destroying the
queue**. It is the gentle, non-destructive cousin of `wash`:

| Verb | What it does to `## Notes` |
|---|---|
| `wax` | tidies + condenses in place — every live note survives |
| `wash` | empties the block entirely so the session can be reused |

Use it mid-session when the doc has gotten noisy: a pile of shipped notes
burying the live queue, stale `paused at:` lines, scattered notes that
belong to the same feature, an in-progress note whose sub-bullets no
longer reflect where the work actually is.

---

## What `wax` does

1. **Read this chat's session doc** from disk — it is the source of truth.
2. **Condense finished notes.** Collapse each `[x]` shipped and `[-]`
   dropped note to a single line that keeps its summary + (for shipped)
   its `→ PR #<n> <url>`. Drop the verbose per-file outcome sub-bullets —
   that detail already lives in the PR body. Optionally cluster all
   finished notes under one `### Done` subheading so the live queue is
   easy to scan.
3. **Group related live notes.** When several notes touch the same
   feature or surface, cluster them under a short `### <feature>`
   subheading (e.g. `### Sidebar`, `### Onboarding`) in their existing
   order. Light grouping only — don't invent structure that isn't there.
4. **Refresh in-progress state.** For each `[~]` note, rewrite its
   `paused at:` / state sub-bullet to reflect where the work actually
   stands now (re-derive from the worktree / `git status` if useful), so
   the doc never lies about progress.
5. **Strip bloat.** Remove duplicate or contradictory sub-bullets, stale
   `paused at:` lines on notes that have since moved on, answered-blocker
   questions on notes no longer `[!]`, and redundant timestamps. Keep the
   one line that carries information; cut the rest.
6. **Reply in one line** summarizing what changed and the resulting queue
   shape:
   `Waxed rapid/<slug>: condensed 6 shipped, grouped 3 sidebar notes,
   refreshed note 5, dropped 4 stale bullets. Queue: 2 in progress, 3
   queued, 1 parked.`
   Then stop — no recap, no work.

---

## What `wax` must NEVER do

> ⚠️ **Groom, don't amputate.** Waxing reorganizes and compresses; it
> never changes what the doc *means* or throws away anything a later
> command needs. Preserve every load-bearing token:

- **`→ PR #<n>` lines and their URLs** — keep at least one per shipped
  note. `link` and `review` read these. Losing a URL is data loss.
- **`branch: <name>` lines on `[~]` / `[c]` notes** — `push` picks up
  note branches from these. Never drop them.
- **The `## Pushes` block** — untouched, verbatim. `link` resolves past
  PRs from it.
- **The metadata header** (`**Started:**`, `**Surface:**`, `**Repo:**`,
  `**Worktree:**`, `**Branch:**`, and any `**Fleet:**` line) — untouched,
  except to correct a `**Worktree:**` path that no longer exists to `n/a`.
- **Status boxes** — `wax` does NOT flip a note's status. Waxing is
  organizational, not a state change. If you spot a `[c]` note whose PR
  has clearly merged, don't silently mark it `[x]` — surface it in your
  reply (`note 4's PR #12 looks merged — say "push" or flip it?`) and
  leave the box alone.
- **Parked `[p]` and blocked `[!]` notes** — keep them and their reason
  sub-bullets. They still count in `review` and still gate `wash` / `done`.

`wax` is **doc-only**: it never runs git mutations (no commit, push,
branch delete, worktree removal). It may *read* git / `gh` to refresh
accuracy, nothing more.

---

## Note numbering after a wax

Positional `<N>` counting (for `park <N>`, `drop <N>`, etc.) always reads
top-to-bottom in the current `## Notes` block, including every status and
subheading. Since the user explicitly asked to tidy, post-wax numbering
is simply whatever the freshly groomed doc shows — the doc is the source
of truth, as always.

---

## Edge cases

- **No session in this chat** → normal message, do nothing.
- **Doc already tidy** → reply `rapid/<slug> already tidy — nothing to
  wax.` and stop. Don't manufacture changes.
- **`## Notes` heading missing** (malformed doc) → re-emit the template
  skeleton (notes + pushes blocks), preserving any salvageable note lines,
  and say so.
- **Never queue `wax` as a note** — it's always a grooming command.
