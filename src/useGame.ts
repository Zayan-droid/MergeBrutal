import { useState, useCallback, useEffect, useRef } from 'react';
import { GridData } from './types';
import { createEmptyGrid, generateNextTile, getConnected, isGridFull } from './gameLogic';
import { sfx } from './audio';

// Transient animation events. Each carries a monotonically increasing nonce
// `n` so the UI can remount (and thus retrigger) CSS animations, and so the
// latest event wins when several touch the same cell. Cells are keyed "r,c".
export interface FxState {
  placed: { cell: string; n: number } | null;
  merged: { cell: string; combo: number; n: number } | null;
  removed: { cells: string[]; n: number } | null;
  invalid: { cell: string; n: number } | null;
  score: { cell: string; amount: number; combo: number; n: number } | null; // floating +N at the merge
  tierUp: { tier: number; n: number } | null; // a new highest tier just landed
  cheer: { word: string; n: number } | null; // board-level "small win" stamp
}

const EMPTY_FX: FxState = {
  placed: null,
  merged: null,
  removed: null,
  invalid: null,
  score: null,
  tierUp: null,
  cheer: null,
};

export type ShakeLevel = 'soft' | 'hard';

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

// Escalating callouts for small wins — spoken and stamped on the board.
// Longer cascade chains and higher tiers reach deeper into the list.
const CHEER_WORDS = ['NICE', 'GREAT', 'AWESOME', 'SUPERB', 'BRUTAL', 'UNREAL'];

const pickCheer = (mergeCount: number, tierReached: number): string => {
  let level = Math.max(mergeCount - 2, 0); // 2 merges → NICE, 3 → GREAT, …
  if (tierReached >= 4) level = Math.max(level, tierReached - 3); // tier 4 → GREAT, 5 → AWESOME, …
  return CHEER_WORDS[Math.min(level, CHEER_WORDS.length - 1)];
};

const BEST_KEY = 'brutalist-merge-best';

const readBest = (): number => {
  try {
    const v = Number(localStorage.getItem(BEST_KEY));
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  } catch {
    return 0;
  }
};

export const useGame = () => {
  const [grid, setGrid] = useState<GridData>(createEmptyGrid());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(readBest);
  const [newBest, setNewBest] = useState(false); // this run beat the stored best
  const [highestTier, setHighestTier] = useState(1);
  const [nextTile, setNextTile] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shake, setShake] = useState<{ level: ShakeLevel; n: number } | null>(null);
  const [fx, setFx] = useState<FxState>(EMPTY_FX);
  const [drawId, setDrawId] = useState(0); // bumps whenever a new next tile is drawn
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false); // mirrors `paused` for the async cascade loop
  const fxCounter = useRef(0);
  const epochRef = useRef(0); // invalidates in-flight cascades on restart
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nextN = () => ++fxCounter.current;

  // The board is "in danger" once only a few cells remain — the frame goes to
  // a warning state so the squeeze is felt before the grid fills.
  const emptyCount = grid.reduce((acc, row) => acc + row.reduce((a, c) => a + (c === null ? 1 : 0), 0), 0);
  const danger = !gameOver && emptyCount > 0 && emptyCount <= 4;

  // Track the best score live so the header updates the moment it's beaten.
  useEffect(() => {
    if (score > best) {
      setBest(score);
      setNewBest(true);
      try {
        localStorage.setItem(BEST_KEY, String(score));
      } catch {
        // storage unavailable — best lasts this session only
      }
    }
  }, [score, best]);

  const triggerShake = (level: ShakeLevel) => {
    setShake({ level, n: nextN() });
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    shakeTimer.current = setTimeout(() => setShake(null), level === 'hard' ? 520 : 400);
  };

  const togglePause = useCallback(() => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  }, []);

  const placeTile = useCallback(async (r: number, c: number) => {
    if (gameOver || isProcessing || pausedRef.current) return;
    if (grid[r][c] !== null) {
      setFx(f => ({ ...f, invalid: { cell: `${r},${c}`, n: nextN() } }));
      sfx.invalid();
      return;
    }

    setIsProcessing(true);
    const epoch = epochRef.current;
    const targetKey = `${r},${c}`;
    const currentGrid = grid.map(row => [...row]);
    currentGrid[r][c] = nextTile;
    setGrid([...currentGrid]); // Immediate render of placed tile
    setFx(f => ({ ...f, placed: { cell: targetKey, n: nextN() } }));
    sfx.place();

    let currentTier = nextTile;
    let combo = 1;
    let newHighest = highestTier;
    let bigTierHit = false; // a new tier 4+ landed this placement

    // Cascade: mark the doomed tiles so they flash during the 200ms beat,
    // then collapse them into the target cell. The target cell is excluded
    // from the flash so the final merged tile's location stays unambiguous.
    while (true) {
      const connected = getConnected(currentGrid, r, c, currentTier);
      if (connected.length < 3) break;

      const doomed = connected
        .filter(cell => !(cell.r === r && cell.c === c))
        .map(cell => `${cell.r},${cell.c}`);
      setFx(f => ({ ...f, removed: { cells: doomed, n: nextN() } }));

      await sleep(200);
      // Hold the cascade while paused so merges (and their sounds) wait.
      while (pausedRef.current && epochRef.current === epoch) {
        await sleep(100);
      }
      if (epochRef.current !== epoch) return; // restarted mid-cascade

      for (const cell of connected) {
        currentGrid[cell.r][cell.c] = null;
      }
      currentTier++;
      currentGrid[r][c] = currentTier;
      const gained = currentTier * 10 * connected.length * combo;
      setGrid(currentGrid.map(row => [...row]));
      setFx(f => ({
        ...f,
        merged: { cell: targetKey, combo, n: nextN() },
        removed: null,
        score: { cell: targetKey, amount: gained, combo, n: nextN() },
      }));
      sfx.merge(currentTier, combo);
      setScore(s => s + gained);
      combo++;

      if (currentTier > newHighest) {
        newHighest = currentTier;
        setHighestTier(currentTier);
        if (currentTier >= 4) {
          bigTierHit = true;
          sfx.tierUp(currentTier);
          setFx(f => ({ ...f, tierUp: { tier: currentTier, n: nextN() } }));
        }
      }
    }

    if (isGridFull(currentGrid)) {
      setGameOver(true);
      sfx.gameOver();
      triggerShake('hard');
    } else {
      setNextTile(generateNextTile(newHighest));
      setDrawId(d => d + 1);

      // Small win: celebrate a real cascade chain, or a new high tier worth
      // noticing (tier 4+). A single routine merge stays quiet.
      const mergeCount = combo - 1;
      if (mergeCount >= 2 || bigTierHit) {
        const word = pickCheer(mergeCount, bigTierHit ? newHighest : 0);
        setFx(f => ({ ...f, cheer: { word, n: nextN() } }));
        sfx.cheer(word);
        if (!bigTierHit) sfx.stamp(); // tier wins already fired their own stab
        if (mergeCount >= 3) triggerShake('soft'); // deep chains kick the frame
      }
    }

    setIsProcessing(false);
  }, [grid, nextTile, gameOver, isProcessing, highestTier]);

  const restartGame = () => {
    epochRef.current++;
    pausedRef.current = false;
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    setPaused(false);
    setGrid(createEmptyGrid());
    setScore(0);
    setNewBest(false);
    setHighestTier(1);
    setNextTile(1);
    setGameOver(false);
    setShake(null);
    setFx(EMPTY_FX);
    setDrawId(d => d + 1);
    setIsProcessing(false);
  };

  return {
    grid,
    score,
    best,
    newBest,
    highestTier,
    nextTile,
    gameOver,
    shake,
    danger,
    fx,
    drawId,
    paused,
    togglePause,
    placeTile,
    restartGame,
  };
};
