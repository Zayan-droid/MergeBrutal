/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// A session goal gives the first (and every) run a concrete shape beyond an
// abstract score — "REACH TIER 5", "CHAIN A ×4", "SCORE 1000". One is active per
// run; clearing it stamps DONE and, on the next run, a fresh one rotates in. It's
// deliberately lightweight: pure progress read off the live run state.

export interface Goal {
  id: string;
  label: string;
  /** Current progress 0..target from live run values. */
  progress: (v: GoalValues) => number;
  target: number;
}

export interface GoalValues {
  score: number;
  highestTier: number;
  bestChain: number;
  merges: number;
}

export const GOALS: Goal[] = [
  { id: 'score-500', label: 'SCORE 500', target: 500, progress: v => v.score },
  { id: 'tier-4', label: 'REACH TIER 4', target: 4, progress: v => v.highestTier },
  { id: 'chain-3', label: 'CHAIN A ×3', target: 3, progress: v => v.bestChain },
  { id: 'merges-15', label: 'MAKE 15 MERGES', target: 15, progress: v => v.merges },
  { id: 'score-1500', label: 'SCORE 1500', target: 1500, progress: v => v.score },
  { id: 'tier-5', label: 'REACH TIER 5', target: 5, progress: v => v.highestTier },
];

/** Pick the goal for a given run index, cycling through the list. */
export const goalForRun = (runIndex: number): Goal => GOALS[runIndex % GOALS.length];
