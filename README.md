# Merge Brutal

A stark, no-nonsense merge puzzle. Place tiles on a 6×6 grid; three or more
same-value tiles touching orthogonally collapse into one tile of the next
tier. Chains cascade, combos multiply, and when the board fills up you're
DEAD.

**Play it: https://merge-brutal.vercel.app**

## How to play

- Tap any empty cell to place the tile shown in **NEXT**.
- Three or more orthogonally connected tiles of the same value merge into a
  single tile of the next tier, landing on the cell you placed.
- Merges cascade: if the merged tile connects with another same-tier group,
  it merges again with an escalating combo multiplier
  (`tier × 10 × tiles × combo`).
- The game ends when the board is full. Reach the black **tier 9** to summit.
- A first-run tutorial teaches the whole loop in a single tap.

## Modes

- **Endless** — the classic run, on a 4×4, 6×6, or 8×8 board.
- **Daily Challenge** — a date-seeded board that's identical for everyone that
  day, one ranked attempt, shareable result card.
- **Time Attack** — most score in 90 seconds.
- **Zen** — no danger ring, no death drama; just merge.

## Retention systems

- **Daily streak** — consecutive days played, with loss-aversion framing.
- **Session goals** — a rotating per-run objective (reach a tier, chain a
  combo, hit a score) shown as a live progress bar.
- **Achievements** — 20 brutalist awards that fire the stamp VFX/voice on
  unlock and are surfaced on the game-over screen.
- **Unlockable themes** — 5 tile palettes earned through achievements.
- **Stats** — games, best, top tier, best chain, streak history, and more.
- **Share card** — Wordle-style result via the Web Share API / clipboard.
- The game-over screen is a launch pad: score vs best, your next-tier target,
  fresh unlocks, and an instant replay.

## Features

- **Generated audio** — every sound (place, merge, cascade tick, invalid
  click, game over) is synthesized live with the Web Audio API. No audio
  files. Merge pitch rises with tile tier and combo depth.
- **Haptics** — vibration feedback on supported mobile browsers, scaled to
  the action.
- **Brutalist VFX** — hard, stepped CSS one-shots: placement pops, merge
  punches with an outline flash, doomed-tile flashes, combo stamps, score
  nudges, a tutorial hint ring. No particles, no gradients, no glow. Honors
  `prefers-reduced-motion`.
- **Pause menu** — Menu button or `Esc`; genuinely holds mid-cascade merges
  until resume.
- **Splash screen** — looping gameplay render; a tap skips straight to play.
- **Mobile-first** — fluid grid that scales to any viewport, no tap delay,
  no pull-to-refresh, no tap highlight.
- All progress — best score, streak, daily result, achievements, themes,
  stats, sound — persists in `localStorage`; no backend, no accounts. Audio
  unlocks on the first tap, never before.

## Tech

React 19 · TypeScript · Vite 6 · Tailwind CSS 4 — no game engine, no
animation library, no audio assets.

| File | Role |
| --- | --- |
| `src/gameLogic.ts` | Pure logic: grid, flood-fill connectivity, tile RNG, merge hints |
| `src/useGame.ts` | Game state hook: modes, cascade loop, scoring, run stats, timer |
| `src/App.tsx` | Presentation: screens, board, tutorial, goal, overlays, meta-progression |
| `src/Home.tsx` | Home menu: modes, board size, streak/best, entry to modals |
| `src/Modals.tsx` | Achievements, Stats, and Themes modals |
| `src/Tutorial.tsx` | First-run coach overlay |
| `src/Splash.tsx` | Intro screen with video background |
| `src/ui.tsx` | Shared brutalist controls (button, plaque, modal shell) |
| `src/storage.ts` | localStorage: best, stats, streak, daily, achievements, themes |
| `src/rng.ts` | Seeded PRNG + date helpers for the Daily Challenge |
| `src/achievements.ts` | Achievement definitions + evaluation |
| `src/themes.ts` | Unlockable tile palettes |
| `src/goals.ts` | Rotating session goals |
| `src/share.ts` | Shareable result card (Web Share / clipboard) |
| `src/tutorialBoard.ts` | Rigged first board for the tutorial |
| `src/audio.ts` | Web Audio SFX engine + haptics + voice cheers |
| `src/index.css` | Tailwind theme + one-shot animation keyframes |

## Run locally

Prerequisite: Node.js 18+

```bash
npm install
npm run dev      # http://localhost:3000
```

`npm run build` produces a static bundle in `dist/`, and `npm run lint`
type-checks. No environment variables required.

## Deploy

Pushes to `main` auto-deploy to Vercel (framework preset: Vite).
