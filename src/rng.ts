/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Seeded PRNG for the Daily Challenge: the same date produces the same tile
// sequence for every player, so scores are comparable and shareable — all
// client-side, no backend. Endless mode just passes Math.random instead.

export type Rand = () => number;

/** FNV-1a string hash → 32-bit unsigned seed. */
export const hashString = (s: string): number => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/** mulberry32 — tiny, fast, well-distributed deterministic generator. */
export const mulberry32 = (seed: number): Rand => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** A generator seeded from an arbitrary string (e.g. a date key). */
export const seededRand = (seed: string): Rand => mulberry32(hashString(seed));

/** Local calendar day as YYYY-MM-DD — the Daily Challenge's identity. */
export const todayKey = (d = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Whole-day difference between two YYYY-MM-DD keys (b - a). */
export const dayDiff = (a: string, b: string): number => {
  const pa = Date.parse(`${a}T00:00:00`);
  const pb = Date.parse(`${b}T00:00:00`);
  if (!Number.isFinite(pa) || !Number.isFinite(pb)) return NaN;
  return Math.round((pb - pa) / 86400000);
};
