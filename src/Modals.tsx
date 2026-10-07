/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Modal, Plaque } from './ui';
import { ACHIEVEMENTS } from './achievements';
import { THEMES } from './themes';
import { Stats, Streak } from './storage';

export function AchievementsModal({ unlocked, onClose }: { unlocked: string[]; onClose: () => void }) {
  const have = new Set(unlocked);
  return (
    <Modal title={`Awards ${have.size}/${ACHIEVEMENTS.length}`} onClose={onClose}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        {ACHIEVEMENTS.map(a => {
          const got = have.has(a.id);
          return (
            <div
              key={a.id}
              className={`border-4 border-black p-3 flex items-center gap-3 ${
                got ? 'bg-yellow-400' : 'bg-white opacity-60'
              }`}
            >
              <div
                className={`shrink-0 w-10 h-10 border-2 border-black flex items-center justify-center font-black text-xl ${
                  got ? 'bg-black text-yellow-400' : 'bg-gray-300 text-black'
                }`}
              >
                {got ? '★' : '🔒'}
              </div>
              <div className="min-w-0">
                <div className="font-black uppercase tracking-tight text-sm sm:text-base leading-none">
                  {a.title}
                </div>
                <div className="text-[11px] sm:text-xs font-bold text-black/70 uppercase tracking-tight mt-1 leading-tight">
                  {a.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

export function StatsModal({ stats, streak, onClose }: { stats: Stats; streak: Streak; onClose: () => void }) {
  const avg = stats.games > 0 ? Math.round(stats.totalScore / stats.games) : 0;
  const cells: [string, React.ReactNode, boolean?][] = [
    ['Games', stats.games],
    ['Best Score', stats.bestScore, true],
    ['Top Tier', stats.highestTier],
    ['Best Chain', `×${stats.bestChain}`],
    ['Streak', streak.count > 0 ? `🔥 ${streak.count}` : '—', true],
    ['Best Streak', streak.best],
    ['Merges', stats.totalMerges],
    ['Avg Score', avg],
    ['Longest Run', stats.longestRun],
    ['Flawless', stats.cleanRuns],
  ];
  return (
    <Modal title="Stats" onClose={onClose}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        {cells.map(([label, value, hi]) => (
          <React.Fragment key={label}>
            <Plaque label={label} highlight={!!hi}>
              <span className="text-lg sm:text-2xl font-black tabular-nums tracking-tighter">{value}</span>
            </Plaque>
          </React.Fragment>
        ))}
      </div>
    </Modal>
  );
}

export function ThemesModal({
  unlocked,
  selected,
  onSelect,
  onClose,
}: {
  unlocked: string[];
  selected: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const have = new Set(unlocked);
  return (
    <Modal title="Themes" onClose={onClose}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {THEMES.map(t => {
          const got = have.has(t.id);
          const isSel = selected === t.id;
          return (
            <button
              key={t.id}
              disabled={!got}
              onClick={() => got && onSelect(t.id)}
              className={`border-4 border-black p-3 text-left transition-all ${
                isSel ? 'bg-yellow-400' : 'bg-white'
              } ${got ? 'hover:bg-gray-100' : 'opacity-60 cursor-not-allowed'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-black uppercase tracking-tight text-base sm:text-lg">{t.name}</span>
                {isSel ? (
                  <span className="text-[10px] font-black bg-black text-white px-2 py-0.5">ACTIVE</span>
                ) : got ? (
                  <span className="text-[10px] font-black border-2 border-black px-2 py-0.5">USE</span>
                ) : (
                  <span className="text-base">🔒</span>
                )}
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 8, 9].map(tier => (
                  <span
                    key={tier}
                    className={`w-6 h-6 sm:w-7 sm:h-7 border-2 border-black flex items-center justify-center text-[10px] font-black ${t.colors[tier]}`}
                  >
                    {tier}
                  </span>
                ))}
              </div>
              {!got && (
                <div className="text-[11px] font-bold text-black/70 uppercase tracking-tight mt-2">
                  {t.unlock}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
