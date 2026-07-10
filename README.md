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
- The game ends when all 36 cells are full.

## Features

- **Generated audio** — every sound (place, merge, cascade tick, invalid
  click, game over) is synthesized live with the Web Audio API. No audio
  files. Merge pitch rises with tile tier and combo depth.
- **Haptics** — vibration feedback on supported mobile browsers, scaled to
  the action.
- **Brutalist VFX** — hard, stepped CSS one-shots: placement pops, merge
  punches with an outline flash, doomed-tile flashes, combo stamps, score
  nudges. No particles, no gradients, no glow. Honors
  `prefers-reduced-motion`.
- **Pause menu** — Menu button or `Esc`; genuinely holds mid-cascade merges
  until resume.
- **Splash screen** — looping gameplay render with the title stamping in.
- **Mobile-first** — fluid grid that scales to any viewport, no tap delay,
  no pull-to-refresh, no tap highlight.
- Sound preference and best score persist in `localStorage`; audio unlocks
  on the first tap, never before.

## Tech

React 19 · TypeScript · Vite 6 · Tailwind CSS 4 — no game engine, no
animation library, no audio assets.

| File | Role |
| --- | --- |
| `src/gameLogic.ts` | Pure logic: grid, flood-fill connectivity, tile RNG |
| `src/useGame.ts` | Game state hook: cascade loop, scoring, pause, fx events |
| `src/App.tsx` | Presentation: board, header, pause and game-over overlays |
| `src/Splash.tsx` | Intro screen with video background |
| `src/audio.ts` | Web Audio SFX engine + haptics |
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
