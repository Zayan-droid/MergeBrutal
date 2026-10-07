/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GridData } from './types';
import { createEmptyGrid } from './gameLogic';

// The guided, hand-held tutorial, authored as a linear list of scenes. "talk"
// scenes are illustrated cards the player reads and dismisses; "act" scenes rig
// the real board and make the player perform the move themselves — a pointing
// hand taps the exact cell. Teach by reading, then by doing, then explain what
// just happened (the act scene's done* copy).

/** Build a 6×6 board from a sparse {"r,c": tier} map. */
const board = (cells: Record<string, number>): GridData => {
  const g = createEmptyGrid(6, 6);
  for (const k in cells) {
    const [r, c] = k.split(',').map(Number);
    g[r][c] = cells[k];
  }
  return g;
};

export type Visual = 'next' | 'adjacency' | 'score' | 'ladder' | 'danger' | 'modes';

export interface Scene {
  id: string;
  kind: 'talk' | 'act';
  title: string;
  lines: string[];
  visual?: Visual; // illustrated panel on a talk card
  cta?: string; // continue-button label
  // act scenes only:
  grid?: GridData; // the board to set when this scene begins
  next?: number; // forced NEXT tile
  target?: { r: number; c: number }; // the one cell the hand points to
  expect?: 'place' | 'merge'; // what completes the step
  doneTitle?: string; // shown after the action resolves
  doneLines?: string[];
}

export const SCENES: Scene[] = [
  {
    id: 'welcome',
    kind: 'talk',
    title: 'How to play',
    lines: [
      'The rules are simple. Mastering them is not.',
      "We'll learn by playing — just follow the hand.",
    ],
    cta: 'Start',
  },
  {
    id: 'next-tile',
    kind: 'talk',
    title: 'Your NEXT tile',
    lines: [
      'Up top, NEXT shows the tile you are about to drop.',
      "It's a 1 right now. You don't choose it — you place it.",
    ],
    visual: 'next',
    cta: 'Got it',
  },
  {
    id: 'place',
    kind: 'act',
    title: 'Drop a tile',
    lines: ['Tap the glowing cell to place your 1.'],
    grid: board({}),
    next: 1,
    target: { r: 2, c: 2 },
    expect: 'place',
    doneTitle: 'Placed!',
    doneLines: [
      'That tile stays on the board, and a fresh NEXT is ready.',
      'Tiles never move on their own — they sit until you match them.',
    ],
  },
  {
    id: 'match',
    kind: 'act',
    title: 'Match three',
    lines: ['Line up THREE of the same number.', "Tap the hand's cell to finish the row of 1s."],
    grid: board({ '0,0': 1, '0,1': 1 }),
    next: 1,
    target: { r: 0, c: 2 },
    expect: 'merge',
    doneTitle: 'A tier up!',
    doneLines: [
      'Three 1s collapsed into a single 2 — one tier higher.',
      "That's the whole engine: match three, climb a tier.",
    ],
  },
  {
    id: 'adjacency',
    kind: 'talk',
    title: 'What connects',
    lines: [
      'Tiles connect UP, DOWN, LEFT and RIGHT.',
      "Diagonals DON'T count — keep your matches side by side.",
    ],
    visual: 'adjacency',
    cta: 'Got it',
  },
  {
    id: 'cascade',
    kind: 'act',
    title: 'Cascades',
    lines: ['When a merge makes ANOTHER match, the chain keeps going.', "Tap the hand's cell and watch."],
    grid: board({ '0,0': 1, '0,1': 1, '0,3': 2, '1,2': 2 }),
    next: 1,
    target: { r: 0, c: 2 },
    expect: 'merge',
    doneTitle: 'Cascade!',
    doneLines: [
      'One tap: the 1s made a 2, then that 2 chained into a 3.',
      'Each link raises the combo — ×2, ×3, ×4 — and your score with it.',
    ],
  },
  {
    id: 'score',
    kind: 'talk',
    title: 'How you score',
    lines: [
      'Points = tier × 10 × tiles × combo.',
      'Higher tiers and longer chains pay FAR more. Chase cascades.',
    ],
    visual: 'score',
    cta: 'Got it',
  },
  {
    id: 'tiers',
    kind: 'talk',
    title: 'Climb the tiers',
    lines: [
      'Every tier has its own color. Keep merging to climb.',
      'The black 9 is the summit — almost no one reaches it.',
    ],
    visual: 'ladder',
    cta: 'Got it',
  },
  {
    id: 'danger',
    kind: 'talk',
    title: "Don't fill up",
    lines: [
      "Unmatched tiles pile up. Fill every cell and it's over — DEAD.",
      'When space runs low the frame flashes red. Leave yourself room.',
    ],
    visual: 'danger',
    cta: 'Got it',
  },
  {
    id: 'modes',
    kind: 'talk',
    title: 'When you want more',
    lines: [
      'Pause anytime with the II button.',
      'From the menu: a daily challenge, time attack, zen, bigger boards, awards and themes.',
    ],
    visual: 'modes',
    cta: 'Almost there',
  },
  {
    id: 'ready',
    kind: 'talk',
    title: 'Go brutal',
    lines: ["That's everything. Build the longest chains you can and climb.", 'Good luck.'],
    cta: 'Play',
  },
];
