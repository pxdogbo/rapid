# `test` / `testdrive` — verifying shipped work

Read this file when the user texts the bare word `test` or `testdrive`
mid-session. The two are aliases. **You verify the work end-to-end
yourself** before the user does. If this chat has no session, ignore —
it's a normal message. This exists because the failure mode of this
skill is: user asks → push → wait 10 min for deploy → user comes back,
nothing changed. `test`/`testdrive` is the antidote.

> **In a live collab, the lead never runs this flow — a rider does.** The
> user's `test` lands on the lead; the lead composes testing instructions and
> `collab_send`s them to the rider owning the lane; the rider runs this
> file's flow in its own pane and sends the verdict (step 5's shape, evidence
> included) back to the lead, who relays it to the user. See
> `references/collab.md` → "Testing in a live collab".

Behavior:

1. **Identify the target.** Default to the most recent `[x]` note whose PR
   is either merged-and-deployed *or* pushed (preview deploy expected). If
   there's a current `[~]` and the user just pushed it, target that
   instead. If unclear, ask in one line.
2. **Pick the right testing surface** based on the note's content:
   - Web UI / login / styling / navigation → `agent-browser` against the
     deployed URL (preview for an open PR, prod for a merged one).
   - iOS / Safari-specific behavior → iOS simulator (`xcrun simctl`) +
     `agent-browser` if the simulator surface is exposed, otherwise
     describe what you'd check manually and *do not* claim success.
   - API / backend → `curl` / a fetch script with real production-shaped
     payloads.
   - Server-rendered output / CSS resolution / build artifacts → curl the
     deployed page and grep the actual HTML/CSS.
3. **Wait for the deploy if needed.** If the PR's preview is still
   building, poll Vercel / the deploy host until it's ready (don't sleep
   blindly — check status). Do not test against an outdated build.
4. **Run the actual user-facing flow,** not a proxy for it. "The class
   name appears in the HTML" is *not* a substitute for "the button
   actually looks styled in a real browser." If you can't run the real
   flow, **say so explicitly** — never claim success on inference.
5. **Report a verdict**, in this shape:

   ```
   test: <note one-liner>
   surface: <browser preview / prod / iOS sim / curl / etc.>
   url / target: <where you actually tested>

   ✅ pass — <one-line: what you saw that confirms it works>
   or
   ❌ fail — <one-line: what you saw that contradicts the fix>
     evidence: <screenshot path / console log / curl output snippet>
     likely cause: <one-line hypothesis, no fix yet>
   or
   ⚠️ inconclusive — <one-line: what you couldn't verify and why>
   ```

6. **If pass:** stop. The user can decide what's next. Do not start the
   next note unprompted.
7. **If fail:** the failed note flips back to `[~]`, append a sub-bullet
   `test failed [HH:MM]: <what broke>`. Then *ask* before retrying — the
   user may want to pivot, gather more info, or stop. Do not auto-loop on
   a fix-and-test cycle.

Rules:
- **No vibes-based passes.** "Looks right to me" / "should work" is not a
  pass. Either you saw the working flow with your own tools or you didn't.
- **Always report the URL/target you tested against.** A pass on
  `localhost:3000` when prod is broken is a fail.
- **Screenshots beat prose.** When the test surface is a browser, capture
  a screenshot via `agent-browser` and reference it in the report so the
  user can spot-check.
- **Inconclusive is honest.** If the testing tool isn't available (e.g.
  no agent-browser, no simulator) say so and stop. Do not pretend.
