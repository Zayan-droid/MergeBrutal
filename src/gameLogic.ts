import { ROWS, COLS, GridData } from './types';
import { Rand } from './rng';

export const createEmptyGrid = (rows: number = ROWS, cols: number = COLS): GridData => {
  return Array.from({ length: rows }, () => Array(cols).fill(null));
};

// `rand` is injectable so the Daily Challenge can drive a seeded, reproducible
// tile sequence; endless and the other modes just pass Math.random (the default).
export const generateNextTile = (highestTier: number, rand: Rand = Math.random): number => {
  const r = rand();
  if (highestTier > 3) {
    if (r < 0.6) return 1;
    if (r < 0.9) return 2;
    return 3;
  }
  if (r < 0.75) return 1;
  return 2;
};

// Flood-fill orthogonally for same-tier neighbours. Bounds come from the grid
// itself, so this works for any board size (4×4, 6×6, 8×8, …).
export const getConnected = (
  grid: GridData,
  startR: number,
  startC: number,
  targetTier: number,
): { r: number; c: number }[] => {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const visited = new Set<string>();
  const connected: { r: number; c: number }[] = [];
  const stack = [{ r: startR, c: startC }];

  while (stack.length > 0) {
    const { r, c } = stack.pop()!;
    const key = `${r},${c}`;

    if (visited.has(key)) continue;
    visited.add(key);

    if (grid[r][c] === targetTier) {
      connected.push({ r, c });

      const neighbors = [
        { r: r - 1, c },
        { r: r + 1, c },
        { r, c: c - 1 },
        { r, c: c + 1 },
      ];

      for (const n of neighbors) {
        if (n.r >= 0 && n.r < rows && n.c >= 0 && n.c < cols) {
          stack.push(n);
        }
      }
    }
  }

  return connected;
};

export const isGridFull = (grid: GridData): boolean => {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === null) return false;
    }
  }
  return true;
};

export const countEmpty = (grid: GridData): number => {
  let n = 0;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === null) n++;
    }
  }
  return n;
};

// The first cell (scanning row-major) whose placement would complete a merge of
// the given tile — used by the tutorial and the first-session "aha" hint.
export const findMergeHint = (grid: GridData, tile: number): { r: number; c: number } | null => {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] !== null) continue;
      const probe = grid.map(row => [...row]);
      probe[r][c] = tile;
      if (getConnected(probe, r, c, tile).length >= 3) return { r, c };
    }
  }
  return null;
};
