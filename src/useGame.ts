import { useState, useCallback, useEffect, useRef } from 'react';
import { GridData, ROWS, COLS } from './types';
import { createEmptyGrid, generateNextTile, getConnected, isGridFull, countEmpty } from './gameLogic';
import { sfx } from './audio';
import { Rand, seededRand } from './rng';
import { getBest, setBest as persistBest, Mode, RunSummary } from './storage';

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

export interface RunConfig {
  mode: Mode;
  rows?: number;
  cols?: number;
  seed?: string; // daily: seeds the tile RNG
  timed?: number; // time attack: seconds on the clock
  initialGrid?: GridData; // tutorial: pre-seeded board
  initialNext?: number; // tutorial: forced first NEXT tile
  practice?: boolean; // tutorial: don't let scores touch the saved best
}

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

// Escalating callouts for small wins — spoken and stamped on the board.
// Longer cascade chains and higher tiers reach deeper into the list.
const CHEER_WORDS = ['NICE', 'GREAT', 'AWESOME', 'SUPERB', 'BRUTAL', 'UNREAL'];

const pickCheer = (mergeCount: number, tierReached: number): string => {
  let level = Math.max(mergeCount - 2, 0); // 2 merges → NICE, 3 → GREAT, …
  if (tierReached >= 4) level = Math.max(level, tierReached - 3); // tier 4 → GREAT, 5 → AWESOME, …
  return CHEER_WORDS[Math.min(level, CHEER_WORDS.length - 1)];
};

const dangerThreshold = (rows: number, cols: number): number => {
  const total = rows * cols;
  return total <= 16 ? 2 : total <= 36 ? 4 : 6;
};

export const useGame = () => {
  const [rows, setRows] = useState(ROWS);
  const [cols, setCols] = useState(COLS);
  const [mode, setMode] = useState<Mode>('endless');
  const [grid, setGrid] = useState<GridData>(() => createEmptyGrid());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(getBest);
  const [newBest, setNewBest] = useState(false); // this run beat the stored best
  const [highestTier, setHighestTier] = useState(1);
  const [nextTile, setNextTile] = useState(1);
  const [merges, setMerges] = useState(0); // merges this run (for goals)
  const [bestChain, setBestChain] = useState(0); // deepest cascade this run (for goals)
  const [gameOver, setGameOver] = useState(false);
  const [summary, setSummary] = useState<RunSummary | null>(null); // set once per death
  const [timeLeft, setTimeLeft] = useState<number | null>(null); // time attack clock
  const [runIndex, setRunIndex] = useState(0); // bumps each run — rotates the goal
  const [isProcessing, setIsProcessing] = useState(false);
  const [shake, setShake] = useState<{ level: ShakeLevel; n: number } | null>(null);
  const [fx, setFx] = useState<FxState>(EMPTY_FX);
  const [drawId, setDrawId] = useState(0); // bumps whenever a new next tile is drawn
  const [paused, setPaused] = useState(false);

  const pausedRef = useRef(false); // mirrors `paused` for the async cascade loop
  const fxCounter = useRef(0);
  const epochRef = useRef(0); // invalidates in-flight cascades on restart
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rngRef = useRef<Rand>(Math.random);
  const modeRef = useRef<Mode>('endless');
  const practiceRef = useRef(false);
  const lastConfigRef = useRef<RunConfig>({ mode: 'endless' });

  // Authoritative run counters live in refs so finishRun (which may fire from the
  // timer, outside React's render) always reads current values.
  const scoreRef = useRef(0);
  const tierRef = useRef(1);
  const mergesRef = useRef(0);
  const chainRef = useRef(0);
  const placeRef = useRef(0);
  const invalidRef = useRef(0);
  const startTimeRef = useRef(0);

  const nextN = () => ++fxCounter.current;

  // The board is "in danger" once only a few cells remain — the frame goes to a
  // warning state before it fills. Zen mode stays calm (no warning, no death
  // drama), though the board can still fill.
  const empty = countEmpty(grid);
  const danger = !gameOver && mode !== 'zen' && empty > 0 && empty <= dangerThreshold(rows, cols);

  // Track the best score live so the header updates the moment it's beaten, and
  // persist it immediately so a huge run isn't lost if the player leaves without
  // dying (recordRun also saves it on game over). Practice (tutorial) runs are
  // excluded so they never inflate a real player's best.
  useEffect(() => {
    if (!practiceRef.current && score > best) {
      setBest(score);
      setNewBest(true);
      persistBest(score);
    }
  }, [score, best]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const triggerShake = useCallback((level: ShakeLevel) => {
    setShake({ level, n: ++fxCounter.current });
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    shakeTimer.current = setTimeout(() => setShake(null), level === 'hard' ? 520 : 400);
  }, []);

  const finishRun = useCallback(() => {
    clearTimer();
    setGameOver(true);
    setSummary({
      mode: modeRef.current,
      score: scoreRef.current,
      highestTier: tierRef.current,
      bestChain: chainRef.current,
      merges: mergesRef.current,
      placements: placeRef.current,
      invalidTaps: invalidRef.current,
      durationMs: Date.now() - startTimeRef.current,
    });
    sfx.gameOver();
    if (modeRef.current !== 'zen') triggerShake('hard');
  }, [clearTimer, triggerShake]);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setInterval(() => {
      if (pausedRef.current) return;
      setTimeLeft(t => {
        if (t === null) return t;
        if (t <= 1) {
          clearTimer();
          finishRun();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [clearTimer, finishRun]);

  const togglePause = useCallback(() => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  }, []);

  const startRun = useCallback(
    (cfg: RunConfig) => {
      epochRef.current++;
      clearTimer();
      pausedRef.current = false;
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
      lastConfigRef.current = cfg;

      const r = cfg.rows ?? ROWS;
      const c = cfg.cols ?? COLS;
      modeRef.current = cfg.mode;
      practiceRef.current = !!cfg.practice;
      rngRef.current = cfg.seed ? seededRand(cfg.seed) : Math.random;

      const grid0 = cfg.initialGrid ? cfg.initialGrid.map(row => [...row]) : createEmptyGrid(r, c);
      let hi = 1;
      for (const row of grid0) for (const v of row) if (v && v > hi) hi = v;
      const first = cfg.initialNext ?? generateNextTile(hi, rngRef.current);

      scoreRef.current = 0;
      tierRef.current = hi;
      mergesRef.current = 0;
      chainRef.current = 0;
      placeRef.current = 0;
      invalidRef.current = 0;
      startTimeRef.current = Date.now();

      setRows(r);
      setCols(c);
      setMode(cfg.mode);
      setGrid(grid0);
      setScore(0);
      setNewBest(false);
      setHighestTier(hi);
      setNextTile(first);
      setMerges(0);
      setBestChain(0);
      setGameOver(false);
      setSummary(null);
      setShake(null);
      setFx(EMPTY_FX);
      setPaused(false);
      setIsProcessing(false);
      setDrawId(d => d + 1);
      setRunIndex(i => i + 1);
      setTimeLeft(cfg.mode === 'timeattack' ? cfg.timed ?? 90 : null);
      if (cfg.mode === 'timeattack') startTimer();
    },
    [clearTimer, startTimer],
  );

  const placeTile = useCallback(
    async (r: number, c: number) => {
      if (gameOver || isProcessing || pausedRef.current) return;
      if (grid[r][c] !== null) {
        invalidRef.current++;
        setFx(f => ({ ...f, invalid: { cell: `${r},${c}`, n: nextN() } }));
        sfx.invalid();
        return;
      }

      setIsProcessing(true);
      const epoch = epochRef.current;
      const targetKey = `${r},${c}`;
      const currentGrid = grid.map(row => [...row]);
      currentGrid[r][c] = nextTile;
      placeRef.current++;
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
        scoreRef.current += gained;
        setScore(s => s + gained);
        mergesRef.current++;
        setMerges(m => m + 1);
        combo++;

        if (currentTier > newHighest) {
          newHighest = currentTier;
          tierRef.current = currentTier;
          setHighestTier(currentTier);
          if (currentTier >= 4) {
            bigTierHit = true;
            sfx.tierUp(currentTier);
            setFx(f => ({ ...f, tierUp: { tier: currentTier, n: nextN() } }));
          }
        }
      }

      const mergeCount = combo - 1;
      if (mergeCount > chainRef.current) {
        chainRef.current = mergeCount;
        setBestChain(mergeCount);
      }

      if (isGridFull(currentGrid)) {
        finishRun();
      } else {
        setNextTile(generateNextTile(newHighest, rngRef.current));
        setDrawId(d => d + 1);

        // Small win: celebrate a real cascade chain, or a new high tier worth
        // noticing (tier 4+). A single routine merge stays quiet.
        if (mergeCount >= 2 || bigTierHit) {
          const word = pickCheer(mergeCount, bigTierHit ? newHighest : 0);
          setFx(f => ({ ...f, cheer: { word, n: nextN() } }));
          sfx.cheer(word);
          if (!bigTierHit) sfx.stamp(); // tier wins already fired their own stab
          if (mergeCount >= 3) triggerShake('soft'); // deep chains kick the frame
        }
      }

      setIsProcessing(false);
    },
    [grid, nextTile, gameOver, isProcessing, highestTier, finishRun, triggerShake],
  );

  const restartGame = useCallback(() => {
    startRun(lastConfigRef.current);
  }, [startRun]);

  // Clear any running timer on unmount.
  useEffect(() => clearTimer, [clearTimer]);

  return {
    rows,
    cols,
    mode,
    grid,
    score,
    best,
    newBest,
    highestTier,
    nextTile,
    merges,
    bestChain,
    gameOver,
    summary,
    timeLeft,
    runIndex,
    isProcessing,
    shake,
    danger,
    fx,
    drawId,
    paused,
    togglePause,
    placeTile,
    startRun,
    restartGame,
  };
};
