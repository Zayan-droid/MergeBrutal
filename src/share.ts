/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// The Wordle-style brag card. Every share is both free acquisition and a public
// commitment that reinforces the sharer's own habit — and it costs no backend:
// Web Share API where available (mobile), clipboard everywhere else.

import { RunSummary } from './storage';
import { todayKey } from './rng';

// Colored squares per tier, so the shared text carries the brutalist palette.
const TIER_SQUARE: Record<number, string> = {
  1: '🟥',
  2: '🟦',
  3: '🟨',
  4: '🟩',
  5: '🟪',
  6: '🟦',
  7: '🟧',
  8: '⬜',
  9: '⬛',
};

const ladder = (highestTier: number): string => {
  let out = '';
  for (let t = 1; t <= Math.max(1, highestTier); t++) out += TIER_SQUARE[t] ?? '⬛';
  return out;
};

export const buildShareText = (s: RunSummary, streak: number): string => {
  const title = s.mode === 'daily' ? `MERGE BRUTAL · DAILY ${todayKey()}` : 'MERGE BRUTAL';
  const lines = [
    title,
    `SCORE ${s.score.toLocaleString()} · TIER ${s.highestTier} · ×${s.bestChain} CHAIN`,
    `${ladder(s.highestTier)} ⬛ DEAD`,
  ];
  if (streak > 1) lines.push(`🔥 ${streak}-day streak`);
  lines.push('merge-brutal.vercel.app');
  return lines.join('\n');
};

export type ShareOutcome = 'shared' | 'copied' | 'failed';

/** Share the result; returns how it went so the UI can confirm. */
export const shareResult = async (s: RunSummary, streak: number): Promise<ShareOutcome> => {
  const text = buildShareText(s, streak);
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ text });
      return 'shared';
    }
  } catch (e) {
    // user cancelled the native sheet — not an error worth surfacing
    if (e instanceof DOMException && e.name === 'AbortError') return 'failed';
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
};
