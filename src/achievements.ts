/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Achievements — the cheapest durable long-term content: they reuse the stamp
// VFX and voice the game already has, and give the D7 cohort a wall of concrete
// targets. Each is a pure predicate over the finished run, lifetime stats, and
// current streak. evaluate() returns every satisfied id; the caller diffs that
// against what's already stored to find what *just* unlocked.

import { RunSummary, Stats } from './storage';

export interface AchContext {
  run: RunSummary;
  stats: Stats; // lifetime stats, already including this run
  streak: number; // current streak count
}

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  test: (c: AchContext) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-merge', title: 'FIRST BLOOD', desc: 'Make your first merge', test: c => c.stats.totalMerges >= 1 },
  { id: 'first-cascade', title: 'CHAIN REACTION', desc: 'Trigger a cascade', test: c => c.run.bestChain >= 2 },
  { id: 'chain-4', title: '×4 CHAIN', desc: 'Chain a ×4 cascade', test: c => c.run.bestChain >= 4 },
  { id: 'chain-8', title: '×8 CHAIN', desc: 'Chain a ×8 cascade', test: c => c.run.bestChain >= 8 },
  { id: 'tier-5', title: 'HALFWAY', desc: 'Reach tier 5', test: c => c.stats.highestTier >= 5 },
  { id: 'tier-6', title: 'HIGHER', desc: 'Reach tier 6', test: c => c.stats.highestTier >= 6 },
  { id: 'tier-7', title: 'DEEPER', desc: 'Reach tier 7', test: c => c.stats.highestTier >= 7 },
  { id: 'tier-8', title: 'NEAR BLACK', desc: 'Reach tier 8', test: c => c.stats.highestTier >= 8 },
  { id: 'tier-9', title: 'THE BLACK 9', desc: 'Reach the final tier', test: c => c.stats.highestTier >= 9 },
  { id: 'score-1k', title: 'FOUR FIGURES', desc: 'Score 1,000 in a run', test: c => c.run.score >= 1000 },
  { id: 'score-5k', title: 'BIG NUMBER', desc: 'Score 5,000 in a run', test: c => c.run.score >= 5000 },
  { id: 'score-10k', title: 'FIVE FIGURES', desc: 'Score 10,000 in a run', test: c => c.run.score >= 10000 },
  { id: 'clean-run', title: 'FLAWLESS', desc: 'A 20+ tile run, no misclicks', test: c => c.run.invalidTaps === 0 && c.run.placements >= 20 },
  { id: 'survivor-50', title: 'SURVIVOR', desc: 'Place 50 tiles in one run', test: c => c.run.placements >= 50 },
  { id: 'survivor-100', title: 'IMMORTAL', desc: 'Place 100 tiles in one run', test: c => c.run.placements >= 100 },
  { id: 'games-10', title: 'REGULAR', desc: 'Play 10 games', test: c => c.stats.games >= 10 },
  { id: 'games-50', title: 'ADDICT', desc: 'Play 50 games', test: c => c.stats.games >= 50 },
  { id: 'daily-done', title: 'DAILY GRIND', desc: 'Finish a Daily Challenge', test: c => c.run.mode === 'daily' },
  { id: 'streak-3', title: 'HABIT', desc: 'Hold a 3-day streak', test: c => c.streak >= 3 },
  { id: 'streak-7', title: 'DEVOTED', desc: 'Hold a 7-day streak', test: c => c.streak >= 7 },
];

export const achievementById = (id: string): Achievement | undefined =>
  ACHIEVEMENTS.find(a => a.id === id);

/** All achievement ids currently satisfied by the given context. */
export const evaluate = (c: AchContext): string[] =>
  ACHIEVEMENTS.filter(a => a.test(c)).map(a => a.id);
