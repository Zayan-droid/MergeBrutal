# Merge Brutal — Retention Audit (D1 / D3 / D7)

_Audited 2026-10-07 against `main` @ `80f2d96`. Scope: the shipped web build at
merge-brutal.vercel.app — a static Vite bundle, no backend, no accounts._

---

## Implementation status (2026-10-07)

The full D1→D7 suite below has since been **built and verified in-browser**,
backend-free. Shipped in this pass:

- **D1:** interactive first-run tutorial (place → merge → cascade in one tap),
  fast splash with tap-to-skip, live session-goal bar, first-session hint ring,
  and a game-over "launch pad" (score vs best, next-tier target, fresh unlocks,
  instant replay).
- **D3:** date-seeded Daily Challenge, daily streak (home + in-game badge, with
  loss-aversion reset), Wordle-style share card (Web Share / clipboard).
- **D7:** tier-9 summit framing + highest-tier record, 20 achievements (surfaced
  on death), 5 unlockable tile themes, Time Attack / Zen / board-size (4·6·8)
  modes, and a stats page.

Analytics + PWA install were intentionally deferred (see _Cross-cutting_). The
sections below are the original audit, kept as the rationale for each system.

---

## Verdict

Merge Brutal is a **polished single-session toy with zero retention
architecture.** The moment-to-moment feel is excellent — synthesized SFX,
haptics, voice cheers, stepped brutalist VFX, danger ring, combo stamps. That
earns attention. But nothing in the game is built to bring a player *back*.

The only thing that survives a session is a single number (`best`) and a sound
preference. There is:

- **no onboarding** — a new player is dropped on a blank 6×6 grid with no
  explanation of tap-to-place, merge-3, cascades, or the NEXT tile;
- **no goal** beyond "beat your own best";
- **nothing waiting** for the player tomorrow — no streak, no daily, no
  unfinished objective, no progression;
- **no reason to tell anyone** — no share, no leaderboard, no identity.

A game can have world-class juice and still retain ~0% at D7 if nothing pulls
the player back. That is the situation here. The good news: the core loop is
genuinely satisfying, so every retention hook we add lands on solid ground.

### Current retention scorecard

| Window | What should drive it | Present today? | Grade |
| --- | --- | --- | --- |
| **D1** | Fast comprehension, early "aha", a clear "one-more-game" goal, low entry friction | Juice ✅, comprehension ❌, goal ❌, friction ⚠️ (forced 3s splash) | **D** |
| **D3** | Habit hooks: daily streak, daily challenge, multi-session goals, something "waiting" | None | **F** |
| **D7** | Meta-progression, mastery, variety, achievements, social proof | None | **F** |

---

## How to read this

Retention is three different problems, not one:

- **D1 is a *first-session* problem.** You retain a player to day 1 by making
  the very first session legible, rewarding, and goal-shaped. Most D1 loss is
  confusion and "I don't know what I'm supposed to do / why I'd do it again."
- **D3 is a *habit* problem.** You retain to day 3 by making the player leave
  something behind that pulls them back — a streak they don't want to break, a
  daily puzzle that resets, a goal they were 1 move from.
- **D7 is a *depth* problem.** You retain to day 7 by having more to chase than
  a first session can exhaust — progression, unlocks, mastery tiers,
  achievements, variety.

Each section below is: **what drives it → current state → specific fixes**,
fixes ordered by impact ÷ effort.

---

## D1 — First-session retention

### What drives it
A new player decides in the first ~60 seconds whether this is worth a second
game. Three things decide it: (1) do they understand the game without reading,
(2) do they feel a win quickly, (3) is there a concrete goal that makes "one
more" irresistible. Friction before the first tap is pure leakage.

### Current state
- **No tutorial of any kind.** `App.tsx` renders the board immediately after
  splash. The rules — tap an empty cell to drop NEXT, 3+ same-value orthogonal
  tiles collapse into the next tier, cascades multiply — are only in the README,
  which players never see. Merge-3-adjacency is *not* a genre default (2048 is
  the mental model most bring, and 2048 merges pairs by swiping, not triples by
  tapping). High chance a new player taps randomly, triggers a merge by
  accident, and never forms a model of *why*.
- **Forced 3-second splash wait.** `Splash.tsx:27` hides the Play button behind
  `setTimeout(… 3000)`. Three seconds of a video with no skip is friction before
  the player has done anything. First-session players are the most impatient
  ones you have.
- **No first-session goal.** The header shows `BEST: 0`. There's no "reach tier
  4", no "survive 20 merges", no target. The player's only goal is to beat a 0,
  which is trivially met and carries no tension.
- **Game-over screen is a dead end.** `DEAD → Final Score → Try Again` (`App.tsx`
  278-302). It states a number and offers a restart. It never says how close
  they were to anything, never sets up the next attempt ("you hit tier 5 — reach
  tier 6 next"), never shows progress.
- **The "win celebrations" are feedback, not goals.** `NICE/GREAT/AWESOME…`
  (`useGame.ts:35`) are great juice, but they reward what *already happened*;
  they don't give the player something to *aim at*.

### Fixes (ordered by impact ÷ effort)

1. **Interactive first-run tutorial (highest impact).** On first-ever load
   (gate on a `brutalist-merge-seen` localStorage flag), run a 3-step guided
   overlay on a rigged board:
   - Step 1: pre-place two red `1`s adjacent; highlight the empty cell that
     completes the triple; "TAP HERE." Player taps → watches the merge to `2`.
   - Step 2: set up a cascade (placing one tile triggers two merges); let it
     rip; stamp "CASCADE ×2."
   - Step 3: "Fill the board and you're DEAD. Go." Release to free play.
   This single feature is the biggest D1 lever available. Teach by doing, never
   with a wall of text.

2. **Kill the forced splash wait.** Show Play immediately (or after ~800ms),
   and make a tap *anywhere* on the splash skip straight to Play. Keep the video
   as ambiance, not a gate. One-line change in `Splash.tsx`.

3. **Rebuild the game-over screen into a launch pad.** Show, every death:
   - Final score **vs best**, with a delta ("+320 over your best!" or "480 to
     beat").
   - **Highest tier reached** and the explicit next target ("Reach tier 6").
   - A primary **PLAY AGAIN** that restarts instantly (it already does — just
     make the framing forward-looking, not terminal).
   Loss should feel like a running start, not a full stop.

4. **Put a session goal in the header.** A rotating objective chip ("REACH TIER
   5", "CHAIN A ×4 COMBO", "SCORE 1000") that ticks to done with a stamp. Gives
   the first session a shape beyond an abstract score.

5. **Add a first-session "aha" nudge.** If the player places ~6 tiles without
   ever forming a triple, pulse the hint logic: softly outline a cell that would
   complete a merge. Guarantees everyone feels the core mechanic in session one.

---

## D3 — Early habit retention

### What drives it
Players come back on day 3 only if something is **waiting** for them. The
canonical, backend-free mechanics are: a **daily streak** (loss aversion — don't
break the chain) and a **daily challenge** (a fresh reason to open the app every
day). This is exactly how Wordle retains with no accounts and no notifications.

### Current state
**Nothing persists across days.** The only cross-session state is `best`
(`useGame.ts:43`) and the sound flag (`audio.ts:10`). There is no concept of
"today," no streak, no daily, no stats, no record of yesterday. A player who
loved their first session has *no cue* to return and *nothing* to return to.
This is the single weakest area of the game and the highest-leverage place to
invest.

### Fixes (ordered by impact ÷ effort)

1. **Daily Challenge (the centerpiece — do this first).** A once-a-day mode that
   needs no backend:
   - Seed the tile RNG from the date (`YYYY-MM-DD` → seeded PRNG). Everyone gets
     the **same tile sequence** that day. (`generateNextTile` in `gameLogic.ts`
     currently uses `Math.random()` — swap in an injectable seeded generator.)
   - One ranked attempt per day. Store result + date in localStorage.
   - A dedicated "DAILY" button on the home/splash screen with a state badge:
     *Not played* → *Done, score X* → resets at local midnight.
   This gives a concrete, finite, repeatable reason to open the game every single
   day — the exact behavior D3 measures.

2. **Daily streak counter with loss aversion.** Track consecutive days the
   player opened/played. Show it prominently ("🔥 3 DAY STREAK" in brutalist
   style). Missing a day resets it to 0 — and showing the *about-to-be-lost*
   streak is what pulls people back. Pure localStorage: last-played date + count.

3. **Shareable result card (growth + habit, like Wordle's grid).** After the
   daily, offer SHARE → copies a brutalist text/emoji block:
   ```
   MERGE BRUTAL — 2026-10-07
   SCORE 4,820 · TIER 7 · ×6 CHAIN
   🟥🟦🟨🟩🟪 ⬛ DEAD
   🔥 streak 3
   ```
   Uses the Web Share API / clipboard — no backend. Every share is a free
   acquisition *and* a public commitment that reinforces the sharer's own habit.

4. **"Yesterday's board / best" callback.** On open, a one-line brutalist stamp:
   "YESTERDAY: 3,200 · BEAT IT." Cheap continuity cue that frames today as a
   rematch.

5. **Multi-session objectives.** A rotating set of 3 goals that persist across
   sessions ("reach tier 7", "score 5000 in one run", "chain a ×8") with a
   claim-the-reward stamp. Even without a reward economy, the *claim* moment is
   sticky; pair with unlocks (see D7).

---

## D7 — Deep / mastery retention

### What drives it
By day 7 the player has seen the core loop many times. They stay only if there's
**more to chase** than a session can exhaust: meta-progression, unlockables,
achievements, mastery tiers, variety of mode. The surviving D7 cohort is chasing
a long-term target.

### Current state
**Content is fully exhausted in a few games.** One endless mode, one board size,
one tile set, a terminal tier of 9 (`types.ts` defines colors up to tier 9) that
is *never surfaced as a goal*. No achievements, no unlocks, no modes, no
mastery ladder, no reason the 20th session differs from the 2nd. There is a
natural "summit" baked into the design — reaching tier 9 — that the game never
tells anyone to aim for.

### Fixes (ordered by impact ÷ effort)

1. **Surface the tier-9 summit as the headline long-term goal.** The game
   already caps at tier 9 (black tile). Make reaching each new top tier a
   celebrated milestone with a persistent "HIGHEST TIER EVER: 7" record and a
   locked trophy row 1→9. "Reach the black 9" becomes the aspirational chase
   that outlasts dozens of sessions. Nearly free — the ceiling already exists.

2. **Achievements / milestone wall.** 15–25 brutalist stamps: "First cascade",
   "×10 chain", "Tier 6", "Tier 9", "Score 10k", "7-day streak", "Survive 100
   merges", "No-invalid-tap run". Each persists in localStorage and fires the
   existing stamp VFX/voice on unlock. Achievements are the cheapest durable
   D7 content you can add — they reuse all the juice you already built.

3. **Unlockable tile themes / skins (meta-progression with no economy).**
   Unlock new palettes (`TIER_COLORS` is already a single swappable map in
   `types.ts`) by hitting milestones — "Monochrome" at tier 8, "Neon" at a
   7-day streak, etc. Gives achievements a tangible payoff and lets players
   personalize, which deepens ownership. A theme picker is a small, self-
   contained feature.

4. **Mode variety.** Once the daily exists, add 1–2 alt modes to break monotony:
   - **Time Attack** — most score in 90s.
   - **Small board (4×4) / Big board (8×8)** — the grid is already parameterized
     by `ROWS`/`COLS` in `types.ts`; a size selector is low-risk.
   - **Zen / no-death** — relaxed, no fail state, for the cohort that bounces off
     difficulty.
   Variety resets novelty and serves different play moods, both D7 drivers.

5. **Stats page.** Games played, total merges, best chain, best tier, average
   score, streak history. Self-tracking is itself a retention loop for the
   mastery-minded, and it's a natural home for the share button.

6. **(Optional, needs backend) Global + daily leaderboard.** The single biggest
   D7 lever that *isn't* free — requires a lightweight backend (Supabase/
   Vercel KV) and an anonymous identity. Competition against others is the
   strongest long-term pull, but it's the one item here that breaks the
   "no-backend" constraint, so treat it as a phase-2 decision.

---

## Cross-cutting / foundational

- **Add lightweight analytics.** You can't optimize retention you can't measure.
  There is no instrumentation today. Add a privacy-light analytics (Vercel
  Analytics, Plausible, or a tiny custom beacon) and track: session start,
  tutorial complete, first merge, game over + score/tier, daily played, streak
  length, share clicked. Without this, every change below is a guess.
- **PWA / Add to Home Screen.** A web game lives or dies by return friction.
  Add a manifest + service worker so players can install it to the home screen —
  an installed icon is the closest a no-account web game gets to a push channel,
  and it measurably lifts return rate. (`metadata.json` exists but there's no
  web-app manifest wired into `index.html`.)
- **No accounts = localStorage is your whole backend.** Everything in D1–D3 and
  most of D7 above is intentionally achievable client-side. Clearing storage or
  switching device loses everything; acceptable for now, but it's the reason a
  backend+identity eventually matters (leaderboards, cross-device streaks).

---

## Recommended build order

Ranked by retention impact per unit of effort, respecting the no-backend reality.

### Phase 1 — Fix the funnel (biggest, cheapest D1 wins)
1. Interactive first-run tutorial.
2. Remove the forced splash wait + tap-to-skip.
3. Game-over screen → launch pad (score vs best, next-tier target, instant replay).
4. Session goal chip in the header.

### Phase 2 — Build the habit (the D3 engine)
5. Daily Challenge (date-seeded RNG, one attempt, home-screen entry + badge).
6. Daily streak counter with loss-aversion framing.
7. Shareable result card (Web Share / clipboard).

### Phase 3 — Give them a mountain (D7 depth)
8. Surface the tier-9 summit + highest-tier-ever record + trophy row.
9. Achievements wall (reusing existing stamp/voice juice).
10. Unlockable themes tied to achievements.
11. Mode variety (Time Attack, board sizes, Zen).
12. Stats page.

### Phase 4 — Measure & scale (do #0 early in practice)
0. Analytics instrumentation + PWA install. _(Technically foundational — wire it
   up alongside Phase 1 so Phases 2–3 can be measured.)_
13. (Optional) Backend-backed leaderboards + anonymous identity.

---

## What NOT to do
- Don't add dark patterns (fake timers, pay-to-continue, aggressive interstitials
  on a free web toy) — they spike a vanity metric and torch the word-of-mouth
  that a brutalist indie game actually lives on.
- Don't gate the core loop behind the tutorial for returning players — run it
  once, then never again.
- Don't let any retention UI dilute the brutalist identity. Every hook above —
  streak flame, share card, achievements, daily badge — should be hard borders,
  mono type, stepped animation, no gradients. The aesthetic *is* the brand;
  retention features that look like generic mobile-game chrome would cost you
  more than they return.
