import { ROWS, COLS, GridData, CellValue } from './types';

export const createEmptyGrid = (): GridData => {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
};

export const generateNextTile = (highestTier: number): number => {
  const rand = Math.random();
  if (highestTier > 3) {
    if (rand < 0.6) return 1;
    if (rand < 0.9) return 2;
    return 3;
  }
  if (rand < 0.75) return 1;
  return 2;
};

export const getConnected = (grid: GridData, startR: number, startC: number, targetTier: number): { r: number, c: number }[] => {
  const visited = new Set<string>();
  const connected: { r: number, c: number }[] = [];
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
        { r, c: c + 1 }
      ];

      for (const n of neighbors) {
        if (n.r >= 0 && n.r < ROWS && n.c >= 0 && n.c < COLS) {
          stack.push(n);
        }
      }
    }
  }

  return connected;
};

export const isGridFull = (grid: GridData): boolean => {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === null) return false;
    }
  }
  return true;
};
