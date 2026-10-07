/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrutalButton, Plaque } from './ui';
import { DailyResult } from './storage';

export interface HomeProps {
  best: number;
  streakCount: number;
  daily: DailyResult | null;
  soundOn: boolean;
  boardSize: number;
  onBoardSize: (n: number) => void;
  onPlay: () => void;
  onDaily: () => void;
  onTimeAttack: () => void;
  onZen: () => void;
  onAchievements: () => void;
  onStats: () => void;
  onThemes: () => void;
  onToggleSound: () => void;
  onTutorial: () => void;
}

const SIZES = [4, 6, 8];

export default function Home(p: HomeProps) {
  return (
    <div className="min-h-dvh bg-gray-100 flex items-center justify-center p-2 sm:p-4 font-mono select-none">
      <div className="bg-white border-4 sm:border-8 border-black p-4 sm:p-7 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]">
        <div className="leading-[0.82] mb-4 sm:mb-6">
          <h1 className="text-5xl sm:text-7xl font-black uppercase tracking-tighter">Merge</h1>
          <h1 className="text-5xl sm:text-7xl font-black uppercase tracking-tighter">Brutal</h1>
          <p className="mt-2 text-[9px] sm:text-xs font-bold uppercase tracking-[0.35em] text-black/55">
            6×6 · Collapse
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-5">
          <Plaque label="Best">
            <span className="text-xl sm:text-3xl font-black tabular-nums tracking-tighter">{p.best}</span>
          </Plaque>
          <Plaque label="Streak" highlight={p.streakCount > 0}>
            <span className="text-xl sm:text-3xl font-black tabular-nums tracking-tighter">
              {p.streakCount > 0 ? `🔥 ${p.streakCount}` : '—'}
            </span>
          </Plaque>
        </div>

        <BrutalButton
          variant="yellow"
          onClick={p.onPlay}
          className="w-full px-6 py-4 text-3xl sm:text-4xl mb-3"
        >
          Play
        </BrutalButton>

        <BrutalButton
          variant="black"
          onClick={p.onDaily}
          className="w-full px-5 py-3 text-lg sm:text-2xl mb-3 flex items-center justify-between gap-3"
        >
          <span>Daily</span>
          <span
            className={`text-[10px] sm:text-xs px-2 py-1 border-2 ${
              p.daily
                ? 'bg-white text-black border-white'
                : 'bg-yellow-400 text-black border-black animate-pulse'
            }`}
          >
            {p.daily ? `DONE · ${p.daily.score}` : 'NEW'}
          </span>
        </BrutalButton>

        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3">
          <BrutalButton variant="white" onClick={p.onTimeAttack} className="px-3 py-3 text-sm sm:text-lg">
            Time<br className="sm:hidden" /> Attack
          </BrutalButton>
          <BrutalButton variant="white" onClick={p.onZen} className="px-3 py-3 text-sm sm:text-lg">
            Zen
          </BrutalButton>
        </div>

        <div className="border-4 border-black mb-4 sm:mb-5">
          <div className="bg-black text-white text-[10px] sm:text-xs font-black uppercase tracking-wider text-center py-1">
            Board Size
          </div>
          <div className="grid grid-cols-3">
            {SIZES.map(n => (
              <button
                key={n}
                onClick={() => p.onBoardSize(n)}
                className={`py-2 text-base sm:text-xl font-black border-black border-l first:border-l-0 transition-colors ${
                  p.boardSize === n ? 'bg-yellow-400 text-black' : 'bg-white text-black hover:bg-gray-200'
                }`}
              >
                {n}×{n}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <BrutalButton variant="white" onClick={p.onAchievements} className="px-3 py-2.5 text-xs sm:text-base">
            Awards
          </BrutalButton>
          <BrutalButton variant="white" onClick={p.onStats} className="px-3 py-2.5 text-xs sm:text-base">
            Stats
          </BrutalButton>
          <BrutalButton variant="white" onClick={p.onThemes} className="px-3 py-2.5 text-xs sm:text-base">
            Themes
          </BrutalButton>
          <BrutalButton
            variant="white"
            onClick={p.onToggleSound}
            aria-pressed={p.soundOn}
            className="px-3 py-2.5 text-xs sm:text-base"
          >
            Sound: {p.soundOn ? 'On' : 'Off'}
          </BrutalButton>
        </div>

        <BrutalButton
          variant="white"
          onClick={p.onTutorial}
          className="w-full mt-2 sm:mt-3 px-3 py-2.5 text-xs sm:text-base"
        >
          How to Play
        </BrutalButton>
      </div>
    </div>
  );
}
