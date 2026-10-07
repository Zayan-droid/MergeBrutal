/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useGame, FxState } from './useGame';
import { getTierStyle, CellValue } from './types';
import { sfx } from './audio';
import Splash from './Splash';
import Home from './Home';
import Tutorial from './Tutorial';
import { AchievementsModal, StatsModal, ThemesModal } from './Modals';
import { BrutalButton, Plaque } from './ui';
import {
  recordRun,
  touchStreak,
  liveStreak,
  getDaily,
  setDaily as saveDaily,
  getUnlockedAchievements,
  addUnlockedAchievements,
  getUnlockedThemes,
  addUnlockedThemes,
  hasSeenTutorial,
  markTutorialSeen,
  setSelectedTheme,
  getStats,
  Streak,
  DailyResult,
} from './storage';
import { evaluate, achievementById, Achievement } from './achievements';
import { THEMES, applyTheme, applySavedTheme } from './themes';
import { goalForRun } from './goals';
import { shareResult } from './share';
import { todayKey } from './rng';
import { findMergeHint } from './gameLogic';
import { buildTutorialGrid, TUTORIAL_TARGET, TUTORIAL_NEXT } from './tutorialBoard';

const Tile = ({ value }: { value: CellValue }) => {
  const isFilled = value !== null;
  const styleClass = getTierStyle(value);

  return (
    <div
      className={`
        w-full aspect-square flex items-center justify-center
        text-[clamp(0.8rem,5vw,2.25rem)] font-black font-mono border-2 sm:border-4 border-black select-none
        ${isFilled ? styleClass : 'bg-white hover:bg-gray-200 cursor-pointer'}
        transition-colors duration-75
      `}
    >
      {value !== null ? value : ''}
    </div>
  );
};

interface CellAnim {
  n: number;
  k: string; // remount key — changes retrigger the CSS animation
  cls: string;
  combo?: number;
}

// Resolve which one-shot animation (if any) a cell currently owns.
// Nonces increase monotonically, so the highest one is the latest event.
const cellFx = (fx: FxState, key: string): CellAnim => {
  const candidates: CellAnim[] = [];
  if (fx.placed && fx.placed.cell === key) {
    candidates.push({ n: fx.placed.n, k: `p${fx.placed.n}`, cls: 'fx-pop' });
  }
  if (fx.merged && fx.merged.cell === key) {
    candidates.push({ n: fx.merged.n, k: `m${fx.merged.n}`, cls: 'fx-merge', combo: fx.merged.combo });
  }
  if (fx.removed && fx.removed.cells.includes(key)) {
    candidates.push({ n: fx.removed.n, k: `r${fx.removed.n}`, cls: 'fx-remove' });
  }
  if (fx.invalid && fx.invalid.cell === key) {
    candidates.push({ n: fx.invalid.n, k: `i${fx.invalid.n}`, cls: 'fx-invalid' });
  }
  if (candidates.length === 0) return { n: -1, k: 'still', cls: '' };
  return candidates.reduce((a, b) => (b.n > a.n ? b : a));
};

type Screen = 'splash' | 'home' | 'game';
type ModalId = null | 'awards' | 'stats' | 'themes';

export default function App() {
  const game = useGame();
  const {
    rows, cols, mode, grid, score, best, newBest, highestTier, nextTile,
    merges, bestChain, gameOver, summary, timeLeft, runIndex,
    shake, danger, fx, drawId, paused, togglePause, placeTile, startRun, restartGame,
  } = game;

  const [screen, setScreen] = useState<Screen>('splash');
  const [soundOn, setSoundOn] = useState(sfx.isEnabled());
  const [boardSize, setBoardSize] = useState(6);
  const [tutorialStep, setTutorialStep] = useState<0 | 1 | null>(null);
  const [themeId, setThemeId] = useState('brutal');
  const [streak, setStreak] = useState<Streak>(() => liveStreak());
  const [daily, setDaily] = useState<DailyResult | null>(() => getDaily());
  const [unlocked, setUnlocked] = useState<string[]>(() => getUnlockedAchievements());
  const [unlockedThemes, setUnlockedThemes] = useState<string[]>(() => getUnlockedThemes());
  const [newAwards, setNewAwards] = useState<Achievement[]>([]);
  const [modal, setModal] = useState<ModalId>(null);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const processedSummary = useRef<unknown>(null);

  // Apply the saved (unlocked) theme once on load.
  useEffect(() => {
    setThemeId(applySavedTheme());
  }, []);

  // --- Run launchers ---------------------------------------------------------
  const play = () => { setTutorialStep(null); startRun({ mode: 'endless', rows: boardSize, cols: boardSize }); setScreen('game'); };
  const playDaily = () => { setTutorialStep(null); startRun({ mode: 'daily', seed: todayKey(), rows: 6, cols: 6 }); setScreen('game'); };
  const playTimeAttack = () => { setTutorialStep(null); startRun({ mode: 'timeattack', timed: 90, rows: boardSize, cols: boardSize }); setScreen('game'); };
  const playZen = () => { setTutorialStep(null); startRun({ mode: 'zen', rows: boardSize, cols: boardSize }); setScreen('game'); };
  const playTutorial = () => {
    setTutorialStep(0);
    startRun({ mode: 'endless', rows: 6, cols: 6, initialGrid: buildTutorialGrid(), initialNext: TUTORIAL_NEXT });
    setScreen('game');
  };

  const goHome = () => {
    setStreak(liveStreak());
    setDaily(getDaily());
    setScreen('home');
  };

  const startFromSplash = () => {
    sfx.place(); // user gesture — unlocks the audio context
    sfx.primeVoice(); // same gesture — unlocks voice cheers (iOS-safe)
    if (!hasSeenTutorial()) playTutorial();
    else goHome();
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    sfx.setEnabled(next);
    if (next) sfx.place();
  };

  const selectTheme = (id: string) => {
    setSelectedTheme(id);
    applyTheme(id);
    setThemeId(id);
  };

  // --- Tutorial progression --------------------------------------------------
  useEffect(() => {
    if (tutorialStep === 0 && merges > 0) setTutorialStep(1);
  }, [tutorialStep, merges]);

  const finishTutorial = () => {
    markTutorialSeen();
    setTutorialStep(null);
  };

  // --- Meta-progression on death --------------------------------------------
  useEffect(() => {
    if (!summary) return;
    if (processedSummary.current === summary) return; // guard StrictMode / re-runs
    processedSummary.current = summary;

    const stats = recordRun(summary);
    const str = touchStreak();
    setStreak(str);

    if (summary.mode === 'daily') {
      const dr: DailyResult = {
        date: todayKey(),
        score: summary.score,
        tier: summary.highestTier,
        bestChain: summary.bestChain,
      };
      saveDaily(dr);
      setDaily(dr);
    }

    const satisfied = evaluate({ run: summary, stats, streak: str.count });
    const have = new Set(getUnlockedAchievements());
    const fresh = satisfied.filter(id => !have.has(id));
    if (fresh.length) {
      addUnlockedAchievements(fresh);
      setUnlocked(getUnlockedAchievements());
      const themeIds = THEMES.filter(t => t.via && fresh.includes(t.via)).map(t => t.id);
      if (themeIds.length) {
        addUnlockedThemes(themeIds);
        setUnlockedThemes(getUnlockedThemes());
      }
      setNewAwards(fresh.map(id => achievementById(id)).filter((a): a is Achievement => !!a));
      sfx.tierUp(7); // a bright stab for the unlock
    } else {
      setNewAwards([]);
    }
  }, [summary]);

  // Esc pauses only while in a live game.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && screen === 'game' && !gameOver && !tutorialStep) togglePause();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, gameOver, tutorialStep, togglePause]);

  // --- Derived view state ----------------------------------------------------
  const filledCount = useMemo(
    () => grid.reduce((a, row) => a + row.reduce((b, c) => b + (c !== null ? 1 : 0), 0), 0),
    [grid],
  );
  // First-session "aha": if a new player hasn't merged yet, glow a completing cell.
  const ahaActive = tutorialStep === null && !gameOver && merges === 0 && filledCount >= 5;
  const hint = tutorialStep === 0 ? TUTORIAL_TARGET : ahaActive ? findMergeHint(grid, nextTile) : null;
  const hintKey = hint ? `${hint.r},${hint.c}` : null;

  const goal = goalForRun(runIndex);
  const goalProgress = goal.progress({ score, highestTier, bestChain, merges });
  const goalDone = goalProgress >= goal.target;
  const goalPct = Math.min(100, Math.round((goalProgress / goal.target) * 100));

  const onCell = (r: number, c: number) => {
    if (tutorialStep === 1) return; // board locked behind the explainer
    if (tutorialStep === 0) {
      if (r === TUTORIAL_TARGET.r && c === TUTORIAL_TARGET.c) placeTile(r, c);
      else sfx.invalid();
      return;
    }
    placeTile(r, c);
  };

  const onShare = async () => {
    if (!summary) return;
    const r = await shareResult(summary, streak.count);
    setShareMsg(r === 'shared' ? 'SHARED!' : r === 'copied' ? 'COPIED!' : 'COPY FAILED');
    window.setTimeout(() => setShareMsg(null), 2200);
  };

  const shakeCls = shake ? (shake.level === 'hard' ? 'animate-shake' : 'animate-shake-soft') : '';
  const lowTime = timeLeft !== null && timeLeft <= 10;

  // Game-over launch-pad framing, per mode.
  const deadly = mode === 'endless' || mode === 'daily';
  const headline = mode === 'timeattack' ? "TIME!" : mode === 'zen' ? 'BOARD FULL' : 'DEAD';
  const nextTierTarget = highestTier >= 9 ? null : highestTier + 1;

  if (screen === 'home') {
    return (
      <>
        <Home
          best={best}
          streakCount={streak.count}
          daily={daily}
          soundOn={soundOn}
          boardSize={boardSize}
          onBoardSize={setBoardSize}
          onPlay={play}
          onDaily={playDaily}
          onTimeAttack={playTimeAttack}
          onZen={playZen}
          onAchievements={() => setModal('awards')}
          onStats={() => setModal('stats')}
          onThemes={() => setModal('themes')}
          onToggleSound={toggleSound}
        />
        {modal === 'awards' && <AchievementsModal unlocked={unlocked} onClose={() => setModal(null)} />}
        {modal === 'stats' && <StatsModal stats={getStats()} streak={streak} onClose={() => setModal(null)} />}
        {modal === 'themes' && (
          <ThemesModal unlocked={unlockedThemes} selected={themeId} onSelect={selectTheme} onClose={() => setModal(null)} />
        )}
      </>
    );
  }

  return (
    <div className={`min-h-dvh bg-gray-100 flex items-center justify-center p-2 sm:p-4 font-mono select-none touch-manipulation ${shakeCls}`}>
      <div className="bg-white border-4 sm:border-8 border-black p-3 sm:p-6 max-w-3xl w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] relative">

        {/* Header / control panel */}
        <div className="mb-3 sm:mb-5 border-b-4 sm:border-b-8 border-black pb-3 sm:pb-5">
          <div className="flex justify-between items-start gap-3 mb-3 sm:mb-4">
            <div className="leading-[0.82]">
              <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter">Merge</h1>
              <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter">Brutal</h1>
              <p className="mt-1.5 text-[9px] sm:text-xs font-bold uppercase tracking-[0.3em] text-black/55">
                {mode === 'daily' ? `Daily · ${todayKey()}` : mode === 'timeattack' ? 'Time Attack' : mode === 'zen' ? 'Zen' : `${rows}×${cols} · Collapse`}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              {streak.count > 0 && (
                <div className="hidden sm:flex flex-col items-center justify-center border-4 border-black bg-yellow-400 px-3 text-black" title={`${streak.count}-day streak`}>
                  <span className="text-xl font-black leading-none">🔥{streak.count}</span>
                </div>
              )}
              <button
                onClick={togglePause}
                aria-label="Pause"
                title="Pause (Esc)"
                className="w-11 h-11 sm:w-14 sm:h-14 flex items-center justify-center border-2 sm:border-4 border-black text-lg sm:text-2xl font-black bg-white hover:bg-gray-200 active:bg-yellow-400 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all tracking-tighter"
              >
                II
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            <Plaque label={mode === 'timeattack' ? 'Time' : 'Score'} highlight={mode === 'timeattack'}>
              {mode === 'timeattack' ? (
                <span className={`text-lg sm:text-3xl font-black tabular-nums tracking-tighter ${lowTime ? 'text-red-600' : ''}`}>
                  {timeLeft}s
                </span>
              ) : (
                <span key={score} className="fx-score text-lg sm:text-3xl font-black tabular-nums tracking-tighter">{score}</span>
              )}
            </Plaque>
            <Plaque label={mode === 'timeattack' ? 'Score' : 'Best'}>
              <span key={mode === 'timeattack' ? score : best} className="fx-score text-lg sm:text-3xl font-black tabular-nums tracking-tighter">
                {mode === 'timeattack' ? score : best}
              </span>
            </Plaque>
            <Plaque label="Tier">
              <span
                key={highestTier}
                className={`fx-slam w-8 h-8 sm:w-11 sm:h-11 flex items-center justify-center border-2 border-black font-black text-base sm:text-2xl ${getTierStyle(highestTier)}`}
              >
                {highestTier}
              </span>
            </Plaque>
            <Plaque label="Next" highlight>
              <div key={drawId} className="fx-pop w-10 sm:w-14">
                <Tile value={nextTile} />
              </div>
            </Plaque>
          </div>

          {/* Session goal */}
          <div className="mt-3 border-2 sm:border-4 border-black flex items-stretch overflow-hidden">
            <div className="bg-black text-white text-[10px] sm:text-xs font-black uppercase tracking-wider px-2 flex items-center">
              Goal
            </div>
            <div className="relative flex-1 bg-white">
              <div
                className={`absolute inset-y-0 left-0 ${goalDone ? 'bg-green-500' : 'bg-yellow-400'} transition-[width] duration-200`}
                style={{ width: `${goalPct}%` }}
              />
              <div className="relative px-2 py-1 flex items-center justify-between">
                <span className="font-black uppercase text-[11px] sm:text-sm tracking-tight">{goal.label}</span>
                <span className="font-black tabular-nums text-[11px] sm:text-sm">
                  {goalDone ? '✓ DONE' : `${Math.min(Math.floor(goalProgress), goal.target)}/${goal.target}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Game Grid */}
        <div className="flex justify-center mb-4 sm:mb-6">
          <div className="relative w-full max-w-[564px]">
            <div
              className="grid w-full gap-1 sm:gap-3 bg-black p-1 sm:p-3"
              style={{
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
              }}
            >
              {grid.map((row, r) =>
                row.map((cell, c) => {
                  const key = `${r},${c}`;
                  const anim = cellFx(fx, key);
                  const punch = anim.combo !== undefined ? Math.min(1.06 + 0.02 * anim.combo, 1.14) : undefined;
                  const isHint = hintKey === key && cell === null;
                  return (
                    <div key={`${r}-${c}`} className="relative" onClick={() => onCell(r, c)}>
                      <div
                        key={anim.k}
                        className={`${anim.cls} ${isHint ? 'tut-hint' : ''}`}
                        style={punch !== undefined ? ({ '--fx-punch': punch } as React.CSSProperties) : undefined}
                      >
                        <Tile value={cell} />
                      </div>
                      {anim.combo !== undefined && anim.combo >= 2 && (
                        <span
                          key={`chip-${anim.k}`}
                          className="fx-combo absolute -top-2 -right-2 sm:-top-3 sm:-right-3 z-20 bg-yellow-400 border-2 sm:border-[3px] border-black px-1 sm:px-1.5 text-xs sm:text-base font-black text-black pointer-events-none opacity-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        >
                          ×{anim.combo}
                        </span>
                      )}
                      {fx.score && fx.score.cell === key && (
                        <span
                          key={`sf-${fx.score.n}`}
                          aria-hidden="true"
                          className="fx-score-float absolute left-1/2 -top-1 z-30 whitespace-nowrap bg-black text-white font-black font-mono text-[10px] sm:text-sm px-1 sm:px-1.5 border border-white opacity-0"
                        >
                          +{fx.score.amount}
                        </span>
                      )}
                    </div>
                  );
                }),
              )}
            </div>

            {fx.tierUp && (
              <div key={`tf-${fx.tierUp.n}`} aria-hidden="true" className="fx-tierflash pointer-events-none absolute inset-0 z-20" />
            )}
            {danger && <div aria-hidden="true" className="danger-ring pointer-events-none absolute inset-0 z-20" />}
          </div>
        </div>

        {/* Small-win celebration stamp */}
        {fx.cheer && (
          <div key={`cheer-${fx.cheer.n}`} aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 z-10 flex justify-center">
            <span className="fx-cheer opacity-0 inline-block bg-yellow-400 border-4 sm:border-8 border-black text-black font-black font-mono uppercase tracking-tighter text-4xl sm:text-7xl px-4 py-2 sm:px-8 sm:py-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
              {fx.cheer.word}
            </span>
          </div>
        )}

        {/* Footer / Controls */}
        <div className="flex justify-center gap-3">
          <BrutalButton variant="white" onClick={goHome} className="px-5 py-2.5 text-base sm:text-xl">
            Menu
          </BrutalButton>
          <BrutalButton variant="yellow" onClick={restartGame} className="px-6 py-2.5 text-lg sm:text-2xl">
            Restart
          </BrutalButton>
        </div>

        {/* Tutorial coach */}
        {tutorialStep !== null && <Tutorial step={tutorialStep} onDone={finishTutorial} />}

        {/* Pause Menu Overlay */}
        {paused && !gameOver && (
          <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center border-4 sm:border-8 border-black z-30 p-4 sm:p-6 text-center fx-dead">
            <h2 className="text-5xl sm:text-7xl font-black uppercase tracking-tighter mb-6 sm:mb-10 fx-slam">Paused</h2>
            <div className="flex flex-col gap-3 sm:gap-4 w-full max-w-[260px] sm:max-w-xs">
              <BrutalButton variant="yellow" onClick={togglePause} className="px-6 py-3 text-lg sm:text-2xl">Resume</BrutalButton>
              <BrutalButton variant="white" onClick={toggleSound} aria-pressed={soundOn} className="px-6 py-3 text-lg sm:text-2xl">Sound: {soundOn ? 'On' : 'Off'}</BrutalButton>
              <BrutalButton variant="white" onClick={restartGame} className="px-6 py-3 text-lg sm:text-2xl">Restart</BrutalButton>
              <BrutalButton variant="white" onClick={goHome} className="px-6 py-3 text-lg sm:text-2xl">Menu</BrutalButton>
            </div>
          </div>
        )}

        {/* Game Over / launch pad */}
        {gameOver && (
          <div className={`absolute inset-0 ${deadly ? 'bg-red-600/90' : 'bg-black/90'} flex flex-col items-center justify-center border-4 sm:border-8 border-black z-20 p-4 sm:p-6 text-center fx-dead overflow-y-auto`}>
            <h2 className="text-5xl sm:text-8xl font-black text-white uppercase tracking-tighter mb-3 drop-shadow-[6px_6px_0px_rgba(0,0,0,1)] fx-slam">
              {headline}
            </h2>
            <p className="text-lg sm:text-2xl text-white font-bold mb-2 bg-black px-4 py-2 border-4 border-white">
              Score: {score}
            </p>

            {newBest && score > 0 ? (
              <p className="fx-slam text-base sm:text-xl font-black uppercase tracking-widest text-black bg-yellow-400 px-3 py-1 border-4 border-black mb-3">
                New Best!
              </p>
            ) : (
              <p className="text-sm sm:text-lg font-bold text-white bg-black px-3 py-1 border-2 border-white mb-3">
                Best {best}{best > score ? ` · ${best - score} to beat` : ''}
              </p>
            )}

            {/* Forward-looking target — frame the loss as a running start. */}
            <p className="text-xs sm:text-base font-black uppercase tracking-tight text-white mb-3">
              {nextTierTarget
                ? `Reached tier ${highestTier} — next: reach tier ${nextTierTarget}`
                : `Max tier reached — chase the high score`}
            </p>

            {/* Newly unlocked awards */}
            {newAwards.length > 0 && (
              <div className="mb-3 flex flex-col gap-1 items-center">
                {newAwards.slice(0, 3).map(a => (
                  <span key={a.id} className="fx-slam text-[11px] sm:text-sm font-black uppercase tracking-tight text-black bg-yellow-400 px-2 py-1 border-2 border-black">
                    ★ Unlocked: {a.title}
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2 sm:gap-3 justify-center mt-1">
              <BrutalButton variant="white" onClick={restartGame} className="px-5 py-3 text-base sm:text-2xl">
                Play Again
              </BrutalButton>
              <BrutalButton variant="black" onClick={onShare} className="px-5 py-3 text-base sm:text-2xl">
                {shareMsg ?? 'Share'}
              </BrutalButton>
              <BrutalButton variant="white" onClick={goHome} className="px-5 py-3 text-base sm:text-2xl">
                Menu
              </BrutalButton>
            </div>
          </div>
        )}
      </div>

      {/* Modals reachable from pause-era too (future), currently from home */}
      {modal === 'awards' && <AchievementsModal unlocked={unlocked} onClose={() => setModal(null)} />}
      {modal === 'stats' && <StatsModal stats={getStats()} streak={streak} onClose={() => setModal(null)} />}
      {modal === 'themes' && (
        <ThemesModal unlocked={unlockedThemes} selected={themeId} onSelect={selectTheme} onClose={() => setModal(null)} />
      )}

      {/* Splash Screen */}
      {screen === 'splash' && <Splash onPlay={startFromSplash} />}
    </div>
  );
}
