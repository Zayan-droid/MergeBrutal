/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// The whole persistence layer. With no backend and no accounts, localStorage is
// the entire save file: best score, lifetime stats, streak, daily result,
// achievements, and theme. Every access is wrapped — private mode / disabled
// storage degrades to session-only play instead of crashing.

import { todayKey, dayDiff } from './rng';

export type Mode = 'endless' | 'daily' | 'timeattack' | 'zen';

const K = {
  best: 'brutalist-merge-best', // pre-existing key — kept for back-compat
  seen: 'merge-brutal-seen', // first-run tutorial completed
  streak: 'merge-brutal-streak',
  daily: 'merge-brutal-daily',
  stats: 'merge-brutal-stats',
  ach: 'merge-brutal-ach',
  theme: 'merge-brutal-theme',
  themes: 'merge-brutal-themes', // unlocked theme ids
} as const;

const read = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable — this session only
  }
};

// --- Best score (legacy key, stored as a bare number string) ----------------

export const getBest = (): number => {
  try {
    const v = Number(localStorage.getItem(K.best));
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  } catch {
    return 0;
  }
};

export const setBest = (v: number): void => {
  try {
    localStorage.setItem(K.best, String(Math.floor(v)));
  } catch {
    // ignore
  }
};

// --- First-run tutorial -----------------------------------------------------

export const hasSeenTutorial = (): boolean => read<boolean>(K.seen, false);
export const markTutorialSeen = (): void => write(K.seen, true);

// --- Lifetime stats ---------------------------------------------------------

export interface Stats {
  games: number;
  totalScore: number;
  totalMerges: number;
  bestChain: number; // deepest single-placement cascade ever
  highestTier: number; // best top tier ever reached
  cleanRuns: number; // runs finished with zero invalid taps
  longestRun: number; // most tiles placed in one run
  bestScore: number; // mirrors best for convenience
}

const EMPTY_STATS: Stats = {
  games: 0,
  totalScore: 0,
  totalMerges: 0,
  bestChain: 0,
  highestTier: 1,
  cleanRuns: 0,
  longestRun: 0,
  bestScore: 0,
};

export const getStats = (): Stats => ({ ...EMPTY_STATS, ...read<Partial<Stats>>(K.stats, {}) });

export interface RunSummary {
  mode: Mode;
  score: number;
  highestTier: number;
  bestChain: number; // max combo depth reached this run
  merges: number;
  placements: number;
  invalidTaps: number;
  durationMs: number;
}

/** Fold a finished run into lifetime stats; returns the updated stats. */
export const recordRun = (s: RunSummary): Stats => {
  const prev = getStats();
  const next: Stats = {
    games: prev.games + 1,
    totalScore: prev.totalScore + s.score,
    totalMerges: prev.totalMerges + s.merges,
    bestChain: Math.max(prev.bestChain, s.bestChain),
    highestTier: Math.max(prev.highestTier, s.highestTier),
    cleanRuns: prev.cleanRuns + (s.invalidTaps === 0 && s.placements > 0 ? 1 : 0),
    longestRun: Math.max(prev.longestRun, s.placements),
    bestScore: Math.max(prev.bestScore, s.score),
  };
  write(K.stats, next);
  if (s.score > getBest()) setBest(s.score);
  return next;
};

// --- Daily streak -----------------------------------------------------------

export interface Streak {
  count: number;
  best: number;
  last: string; // YYYY-MM-DD of the last day a game was completed
}

const EMPTY_STREAK: Streak = { count: 0, best: 0, last: '' };

export const getStreak = (): Streak => ({ ...EMPTY_STREAK, ...read<Partial<Streak>>(K.streak, {}) });

/**
 * Register that a game was completed today and return the updated streak.
 * Same day → unchanged. Next day → +1. A skipped day → reset to 1.
 */
export const touchStreak = (): Streak => {
  const prev = getStreak();
  const today = todayKey();
  if (prev.last === today) return prev;
  const gap = prev.last ? dayDiff(prev.last, today) : Infinity;
  const count = gap === 1 ? prev.count + 1 : 1;
  const next: Streak = { count, best: Math.max(prev.best, count), last: today };
  write(K.streak, next);
  return next;
};

/** The streak as it stands for display, auto-expiring a broken one to 0. */
export const liveStreak = (): Streak => {
  const s = getStreak();
  if (!s.last) return s;
  const gap = dayDiff(s.last, todayKey());
  if (gap > 1) return { ...s, count: 0 };
  return s;
};

// --- Daily challenge result -------------------------------------------------

export interface DailyResult {
  date: string;
  score: number;
  tier: number;
  bestChain: number;
}

export const getDaily = (): DailyResult | null => {
  const d = read<DailyResult | null>(K.daily, null);
  return d && d.date === todayKey() ? d : null;
};

export const setDaily = (r: DailyResult): void => write(K.daily, r);

export const dailyPlayedToday = (): boolean => getDaily() !== null;

// --- Achievements -----------------------------------------------------------

export const getUnlockedAchievements = (): string[] => read<string[]>(K.ach, []);

export const addUnlockedAchievements = (ids: string[]): void => {
  if (!ids.length) return;
  const set = new Set([...getUnlockedAchievements(), ...ids]);
  write(K.ach, [...set]);
};

// --- Themes -----------------------------------------------------------------

export const getSelectedTheme = (): string => read<string>(K.theme, 'brutal');
export const setSelectedTheme = (id: string): void => write(K.theme, id);

export const getUnlockedThemes = (): string[] => {
  const set = new Set(['brutal', ...read<string[]>(K.themes, [])]);
  return [...set];
};

export const addUnlockedThemes = (ids: string[]): void => {
  if (!ids.length) return;
  const set = new Set([...getUnlockedThemes(), ...ids]);
  write(K.themes, [...set]);
};
