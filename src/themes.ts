/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Unlockable tile palettes — the tangible payoff for achievements and the
// game's main cosmetic meta-progression. A theme is just a tier→Tailwind-class
// map; applying one swaps the live palette (types.setActiveTierColors) so every
// tile repaints on the next render. Every palette keeps the brutalist contract:
// flat fills, hard black borders (added at the tile), no gradients.

import { TIER_COLORS, setActiveTierColors } from './types';
import { getSelectedTheme, getUnlockedThemes } from './storage';

export interface Theme {
  id: string;
  name: string;
  /** How it's earned — shown on the locked card. '' means always available. */
  unlock: string;
  /** Achievement id that grants it, if any. */
  via?: string;
  colors: Record<number, string>;
}

export const THEMES: Theme[] = [
  {
    id: 'brutal',
    name: 'Brutal',
    unlock: '',
    colors: TIER_COLORS,
  },
  {
    id: 'mono',
    name: 'Mono',
    unlock: 'Reach tier 8',
    via: 'tier-8',
    colors: {
      1: 'bg-neutral-200 text-black',
      2: 'bg-neutral-400 text-black',
      3: 'bg-neutral-500 text-white',
      4: 'bg-neutral-600 text-white',
      5: 'bg-neutral-700 text-white',
      6: 'bg-neutral-800 text-white',
      7: 'bg-neutral-900 text-white',
      8: 'bg-white text-black',
      9: 'bg-black text-white border-white',
    },
  },
  {
    id: 'neon',
    name: 'Neon',
    unlock: 'Hold a 7-day streak',
    via: 'streak-7',
    colors: {
      1: 'bg-fuchsia-500 text-black',
      2: 'bg-cyan-400 text-black',
      3: 'bg-lime-400 text-black',
      4: 'bg-yellow-300 text-black',
      5: 'bg-orange-400 text-black',
      6: 'bg-pink-400 text-black',
      7: 'bg-emerald-400 text-black',
      8: 'bg-violet-400 text-black',
      9: 'bg-white text-black',
    },
  },
  {
    id: 'blood',
    name: 'Blood',
    unlock: 'Score 10,000 in one run',
    via: 'score-10k',
    colors: {
      1: 'bg-red-200 text-black',
      2: 'bg-red-400 text-black',
      3: 'bg-red-600 text-white',
      4: 'bg-red-800 text-white',
      5: 'bg-rose-900 text-white',
      6: 'bg-black text-red-500 border-red-600',
      7: 'bg-red-600 text-black',
      8: 'bg-white text-red-600',
      9: 'bg-black text-white border-red-600',
    },
  },
  {
    id: 'acid',
    name: 'Acid',
    unlock: 'Chain a ×8 cascade',
    via: 'chain-8',
    colors: {
      1: 'bg-lime-300 text-black',
      2: 'bg-green-500 text-black',
      3: 'bg-emerald-600 text-white',
      4: 'bg-teal-500 text-black',
      5: 'bg-yellow-400 text-black',
      6: 'bg-lime-500 text-black',
      7: 'bg-green-700 text-white',
      8: 'bg-black text-lime-400 border-lime-400',
      9: 'bg-white text-black',
    },
  },
];

export const themeById = (id: string): Theme => THEMES.find(t => t.id === id) ?? THEMES[0];

/** Apply a theme to the live palette (does not persist selection). */
export const applyTheme = (id: string): void => {
  setActiveTierColors(themeById(id).colors);
};

/** Apply whatever theme the player had selected, honoring unlocks. */
export const applySavedTheme = (): string => {
  const unlocked = new Set(getUnlockedThemes());
  const sel = getSelectedTheme();
  const id = unlocked.has(sel) ? sel : 'brutal';
  applyTheme(id);
  return id;
};
