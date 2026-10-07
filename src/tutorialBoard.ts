/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GridData } from './types';
import { createEmptyGrid } from './gameLogic';

// A rigged first board that teaches the whole loop in a single tap. With
// NEXT = 1, placing at (0,2) completes three 1s → a 2, and that 2 immediately
// joins the two neighbouring 2s → a 3: place → merge → cascade ×2, felt, not
// read. The player keeps this board as their first real run.
export const buildTutorialGrid = (): GridData => {
  const g = createEmptyGrid(6, 6);
  g[0][0] = 1;
  g[0][1] = 1; // + placed 1 at (0,2) → three 1s
  g[0][3] = 2;
  g[1][2] = 2; // the new 2 at (0,2) chains with these → three 2s
  return g;
};

export const TUTORIAL_TARGET = { r: 0, c: 2 };
export const TUTORIAL_NEXT = 1;
