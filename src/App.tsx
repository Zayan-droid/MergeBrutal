/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useGame, FxState } from './useGame';
import { getTierStyle, CellValue, ROWS, COLS } from './types';
import { sfx } from './audio';

const Tile = ({ value, isNext = false }: { value: CellValue; isNext?: boolean }) => {
  const isFilled = value !== null;
  const styleClass = getTierStyle(value);

  return (
    <div
      className={`
        w-full aspect-square flex items-center justify-center
        text-[clamp(1rem,6vw,2.25rem)] font-black font-mono border-2 sm:border-4 border-black select-none
        ${isFilled ? styleClass : 'bg-white hover:bg-gray-200 cursor-pointer'}
        ${isNext ? 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]' : ''}
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

export default function App() {
  const { grid, score, nextTile, gameOver, shake, fx, drawId, placeTile, restartGame } = useGame();
  const [soundOn, setSoundOn] = useState(sfx.isEnabled());

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    sfx.setEnabled(next);
    if (next) sfx.place(); // audible confirmation + unlocks the audio context
  };

  return (
    <div className={`min-h-dvh bg-gray-100 flex items-center justify-center p-2 sm:p-4 font-mono select-none touch-manipulation ${shake ? 'animate-shake' : ''}`}>
      <div className="bg-white border-4 sm:border-8 border-black p-3 sm:p-6 max-w-3xl w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] relative">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-8 border-b-4 sm:border-b-8 border-black pb-4 sm:pb-6 gap-3 sm:gap-6">
          <div className="flex gap-2 sm:block">
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter">Merge</h1>
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter">Brutal</h1>
          </div>

          <div className="flex gap-4 sm:gap-10">
            <div className="flex flex-col items-center">
              <span className="text-sm sm:text-xl font-bold uppercase mb-1 sm:mb-2 border-b-2 sm:border-b-4 border-black">Score</span>
              <span key={score} className="text-2xl sm:text-4xl font-black inline-block fx-score">{score}</span>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-sm sm:text-xl font-bold uppercase mb-1 sm:mb-2 border-b-2 sm:border-b-4 border-black">Next</span>
              <div key={drawId} className="fx-pop w-12 sm:w-20">
                <Tile value={nextTile} isNext />
              </div>
            </div>

            <button
              onClick={toggleSound}
              aria-pressed={soundOn}
              title="Toggle sound & haptics"
              className="flex flex-col items-center cursor-pointer"
            >
              <span className="text-sm sm:text-xl font-bold uppercase mb-1 sm:mb-2 border-b-2 sm:border-b-4 border-black">Sound</span>
              <span
                className={`w-12 h-12 sm:w-20 sm:h-20 flex items-center justify-center border-2 sm:border-4 border-black text-sm sm:text-xl font-black uppercase ${
                  soundOn ? 'bg-white hover:bg-gray-200' : 'bg-black text-white'
                }`}
              >
                {soundOn ? 'On' : 'Off'}
              </span>
            </button>
          </div>
        </div>

        {/* Game Grid */}
        <div className="flex justify-center mb-4 sm:mb-8">
          <div
            className="grid w-full max-w-[564px] gap-1 sm:gap-3 bg-black p-1 sm:p-3"
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
                        className="fx-combo absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 z-10 bg-white border-2 border-black px-0.5 sm:px-1 text-[10px] sm:text-xs font-black text-black pointer-events-none opacity-0"
                      >
                        ×{anim.combo}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer / Controls */}
        <div className="flex justify-center">
          <button
            onClick={restartGame}
            className="border-4 border-black bg-yellow-400 hover:bg-yellow-300 text-black px-6 py-2.5 text-lg sm:px-8 sm:py-3 sm:text-2xl font-black uppercase tracking-widest shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] active:translate-y-2 active:translate-x-2 transition-all"
          >
            Restart
          </button>
        </div>

        {/* Game Over Overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-red-600/90 flex flex-col items-center justify-center border-4 sm:border-8 border-black z-20 p-4 sm:p-6 text-center fx-dead">
            <h2 className="text-6xl sm:text-8xl font-black text-white uppercase tracking-tighter mb-4 shadow-black drop-shadow-[8px_8px_0px_rgba(0,0,0,1)] fx-slam">
              Dead
            </h2>
            <p className="text-xl sm:text-3xl text-white font-bold mb-6 sm:mb-8 bg-black px-4 py-2 border-4 border-white">
              Final Score: {score}
            </p>
            <button
              onClick={restartGame}
              className="border-4 border-black bg-white hover:bg-gray-200 text-black px-6 py-3 text-xl sm:px-10 sm:py-4 sm:text-3xl font-black uppercase shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-2 active:translate-x-2 transition-all"
            >
              Try Again
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
