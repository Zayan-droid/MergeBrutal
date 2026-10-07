export type CellValue = number | null;
export type GridData = CellValue[][];

export const ROWS = 6;
export const COLS = 6;

export const TIER_COLORS: Record<number, string> = {
  1: 'bg-red-600 text-white',
  2: 'bg-blue-600 text-white',
  3: 'bg-yellow-400 text-black',
  4: 'bg-green-600 text-white',
  5: 'bg-fuchsia-600 text-white',
  6: 'bg-cyan-400 text-black',
  7: 'bg-orange-500 text-black',
  8: 'bg-white text-black',
  9: 'bg-black text-white border-white',
};

// The live palette. Themes swap this map in via setActiveTierColors; getTierStyle
// reads it, so a theme change repaints every tile on the next render with no
// call-site changes. Starts as the default brutalist palette above.
let activeTierColors: Record<number, string> = TIER_COLORS;

export const setActiveTierColors = (colors: Record<number, string>): void => {
  activeTierColors = colors;
};

export const getTierStyle = (tier: number | null): string => {
  if (tier === null) return 'bg-transparent';
  return activeTierColors[tier] || 'bg-black text-white';
};
