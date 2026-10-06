/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useGame, FxState } from './useGame';
import { getTierStyle, CellValue, ROWS, COLS } from './types';
import { sfx } from './audio';
import Splash from './Splash';

const Tile = ({ value }: { value: CellValue }) => {
  const isFilled = value !== null;
  const styleClass = getTierStyle(value);

  return (
    <div
      className={`
        w-full aspect-square flex items-center justify-center
        text-[clamp(1rem,6vw,2.25rem)] font-black font-mono border-2 sm:border-4 border-black select-none
        ${isFilled ? styleClass : 'bg-white hover:bg-gray-200 cursor-pointer'}
        transition-colors duration-75
      `}
    >
      {value !== null ? value : ''}
    </div>
  );
};

// A hard-bordered instrument tile for the header readout strip. The label sits
// in a solid bar above the value — a control-panel look that suits the theme.
const Stat = ({
  label,
  highlight = false,
  children,
}: {
  label: string;
  highlight?: boolean;
  children: React.ReactNode;
}) => (
  <div className="border-2 sm:border-4 border-black bg-white flex flex-col overflow-hidden">
    <div
      className={`text-[10px] sm:text-sm font-black uppercase tracking-wider text-center leading-none py-1 sm:py-1.5 border-b-2 sm:border-b-4 border-black ${
        highlight ? 'bg-yellow-400 text-black' : 'bg-black text-white'
      }`}
    >
      {label}
    </div>
    <div className="flex-1 flex items-center justify-center p-1 sm:p-1.5 min-h-[2.75rem] sm:min-h-[4rem]">
      {children}
    </div>
  </div>
);

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

export default function App() {
  const {
    grid, score, best, newBest, highestTier, nextTile, gameOver,
    shake, danger, fx, drawId, paused, togglePause, placeTile, restartGame,
  } = useGame();
  const [soundOn, setSoundOn] = useState(sfx.isEnabled());
  const [started, setStarted] = useState(false);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    sfx.setEnabled(next);
    if (next) sfx.place(); // audible confirmation + unlocks the audio context
  };

  const startGame = () => {
    sfx.place(); // user gesture — unlocks the audio context
    sfx.primeVoice(); // same gesture — unlocks voice cheers (iOS-safe)
    setStarted(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && started && !gameOver) togglePause();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started, gameOver, togglePause]);

  const shakeCls = shake ? (shake.level === 'hard' ? 'animate-shake' : 'animate-shake-soft') : '';

  return (
    <div className={`min-h-dvh bg-gray-100 flex items-center justify-center p-2 sm:p-4 font-mono select-none touch-manipulation ${shakeCls}`}>
      <div className="bg-white border-4 sm:border-8 border-black p-3 sm:p-6 max-w-3xl w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] relative">

        {/* Header / control panel */}
        <div className="mb-4 sm:mb-6 border-b-4 sm:border-b-8 border-black pb-4 sm:pb-6">
          <div className="flex justify-between items-start gap-3 mb-3 sm:mb-5">
            <div className="leading-[0.82]">
              <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter">Merge</h1>
              <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter">Brutal</h1>
              <p className="mt-1.5 text-[9px] sm:text-xs font-bold uppercase tracking-[0.35em] text-black/55">6×6 · Collapse</p>
            </div>
            <button
              onClick={togglePause}
              aria-label="Pause"
              title="Pause (Esc)"
              className="shrink-0 w-11 h-11 sm:w-14 sm:h-14 flex items-center justify-center border-2 sm:border-4 border-black text-lg sm:text-2xl font-black bg-white hover:bg-gray-200 active:bg-yellow-400 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all tracking-tighter"
            >
              II
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            <Stat label="Score">
              <span key={score} className="fx-score text-lg sm:text-3xl font-black tabular-nums tracking-tighter">{score}</span>
            </Stat>
            <Stat label="Best">
              <span key={best} className="fx-score text-lg sm:text-3xl font-black tabular-nums tracking-tighter">{best}</span>
            </Stat>
            <Stat label="Tier">
              <span
                key={highestTier}
                className={`fx-slam w-8 h-8 sm:w-11 sm:h-11 flex items-center justify-center border-2 border-black font-black text-base sm:text-2xl ${getTierStyle(highestTier)}`}
              >
                {highestTier}
              </span>
            </Stat>
            <Stat label="Next" highlight>
              <div key={drawId} className="fx-pop w-10 sm:w-14">
                <Tile value={nextTile} />
              </div>
            </Stat>
          </div>
        </div>

        {/* Game Grid */}
        <div className="flex justify-center mb-4 sm:mb-8">
          <div className="relative w-full max-w-[564px]">
            <div
              className="grid w-full gap-1 sm:gap-3 bg-black p-1 sm:p-3"
              style={{
                gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`
              }}
            >
              {grid.map((row, r) =>
                row.map((cell, c) => {
                  const key = `${r},${c}`;
                  const anim = cellFx(fx, key);
                  const punch = anim.combo !== undefined ? Math.min(1.06 + 0.02 * anim.combo, 1.14) : undefined;
                  return (
                    <div key={`${r}-${c}`} className="relative" onClick={() => placeTile(r, c)}>
                      <div
                        key={anim.k}
                        className={anim.cls}
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
                })
              )}
            </div>

            {/* New-tier flash over the whole board */}
            {fx.tierUp && (
              <div
                key={`tf-${fx.tierUp.n}`}
                aria-hidden="true"
                className="fx-tierflash pointer-events-none absolute inset-0 z-20"
              />
            )}

            {/* Danger ring: only a few cells left */}
            {danger && (
              <div
                aria-hidden="true"
                className="danger-ring pointer-events-none absolute inset-0 z-20"
              />
            )}
          </div>
        </div>

        {/* Small-win celebration stamp — brutalist, over the board, click-through */}
        {fx.cheer && (
          <div
            key={`cheer-${fx.cheer.n}`}
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 z-10 flex justify-center"
          >
            <span className="fx-cheer opacity-0 inline-block bg-yellow-400 border-4 sm:border-8 border-black text-black font-black font-mono uppercase tracking-tighter text-4xl sm:text-7xl px-4 py-2 sm:px-8 sm:py-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
              {fx.cheer.word}
            </span>
          </div>
        )}

        {/* Footer / Controls */}
        <div className="flex justify-center">
          <button
            onClick={restartGame}
            className="border-4 border-black bg-yellow-400 hover:bg-yellow-300 text-black px-6 py-2.5 text-lg sm:px-8 sm:py-3 sm:text-2xl font-black uppercase tracking-widest shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] active:translate-y-2 active:translate-x-2 transition-all"
          >
            Restart
          </button>
        </div>

        {/* Pause Menu Overlay */}
        {paused && !gameOver && (
          <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center border-4 sm:border-8 border-black z-30 p-4 sm:p-6 text-center fx-dead">
            <h2 className="text-5xl sm:text-7xl font-black uppercase tracking-tighter mb-6 sm:mb-10 fx-slam">
              Paused
            </h2>
            <div className="flex flex-col gap-3 sm:gap-4 w-full max-w-[260px] sm:max-w-xs">
              <button
                onClick={togglePause}
                className="border-4 border-black bg-yellow-400 hover:bg-yellow-300 text-black px-6 py-2.5 sm:py-3 text-lg sm:text-2xl font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1.5 active:translate-y-1.5 transition-all"
              >
                Resume
              </button>
              <button
                onClick={toggleSound}
                aria-pressed={soundOn}
                className="border-4 border-black bg-white hover:bg-gray-200 text-black px-6 py-2.5 sm:py-3 text-lg sm:text-2xl font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1.5 active:translate-y-1.5 transition-all"
              >
                Sound: {soundOn ? 'On' : 'Off'}
              </button>
              <button
                onClick={restartGame}
                className="border-4 border-black bg-white hover:bg-gray-200 text-black px-6 py-2.5 sm:py-3 text-lg sm:text-2xl font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1.5 active:translate-y-1.5 transition-all"
              >
                Restart
              </button>
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-red-600/90 flex flex-col items-center justify-center border-4 sm:border-8 border-black z-20 p-4 sm:p-6 text-center fx-dead">
            <h2 className="text-6xl sm:text-8xl font-black text-white uppercase tracking-tighter mb-4 shadow-black drop-shadow-[8px_8px_0px_rgba(0,0,0,1)] fx-slam">
              Dead
            </h2>
            <p className="text-xl sm:text-3xl text-white font-bold mb-3 bg-black px-4 py-2 border-4 border-white">
              Final Score: {score}
            </p>
            {newBest && score > 0 ? (
              <p className="fx-slam text-base sm:text-xl font-black uppercase tracking-widest text-black bg-yellow-400 px-3 py-1 border-4 border-black mb-6 sm:mb-8">
                New Best
              </p>
            ) : (
              <p className="text-base sm:text-xl font-bold text-white bg-black px-3 py-1 border-4 border-white mb-6 sm:mb-8">
                Best: {best}
              </p>
            )}
            <button
              onClick={restartGame}
              className="border-4 border-black bg-white hover:bg-gray-200 text-black px-6 py-3 text-xl sm:px-10 sm:py-4 sm:text-3xl font-black uppercase shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-2 active:translate-x-2 transition-all"
            >
              Try Again
            </button>
          </div>
        )}

      </div>

      {/* Splash Screen */}
      {!started && <Splash onPlay={startGame} />}
    </div>
  );
}
