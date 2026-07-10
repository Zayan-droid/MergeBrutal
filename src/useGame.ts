import { useState, useCallback, useRef } from 'react';
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
}

const EMPTY_FX: FxState = { placed: null, merged: null, removed: null, invalid: null };

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

export const useGame = () => {
  const [grid, setGrid] = useState<GridData>(createEmptyGrid());
  const [score, setScore] = useState(0);
  const [highestTier, setHighestTier] = useState(1);
  const [nextTile, setNextTile] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shake, setShake] = useState(false);
  const [fx, setFx] = useState<FxState>(EMPTY_FX);
  const [drawId, setDrawId] = useState(0); // bumps whenever a new next tile is drawn
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false); // mirrors `paused` for the async cascade loop
  const fxCounter = useRef(0);
  const epochRef = useRef(0); // invalidates in-flight cascades on restart

  const nextN = () => ++fxCounter.current;

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
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
      setGrid(currentGrid.map(row => [...row]));
      setFx(f => ({ ...f, merged: { cell: targetKey, combo, n: nextN() }, removed: null }));
      sfx.merge(currentTier, combo);
      setScore(s => s + currentTier * 10 * connected.length * combo);
      combo++;

      if (currentTier > newHighest) {
        newHighest = currentTier;
        setHighestTier(currentTier);
      }
    }

    if (isGridFull(currentGrid)) {
      setGameOver(true);
      sfx.gameOver();
      triggerShake();
    } else {
      setNextTile(generateNextTile(newHighest));
      setDrawId(d => d + 1);
    }

    setIsProcessing(false);
  }, [grid, nextTile, gameOver, isProcessing, highestTier]);

  const restartGame = () => {
    epochRef.current++;
    pausedRef.current = false;
    setPaused(false);
    setGrid(createEmptyGrid());
    setScore(0);
    setHighestTier(1);
    setNextTile(1);
    setGameOver(false);
    setShake(false);
    setFx(EMPTY_FX);
    setDrawId(d => d + 1);
    setIsProcessing(false);
  };

  return {
    grid,
    score,
    nextTile,
    gameOver,
    shake,
    fx,
    drawId,
    paused,
    togglePause,
    placeTile,
    restartGame,
  };
};
