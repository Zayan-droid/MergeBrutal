/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrutalButton } from './ui';
import { getTierStyle } from './types';
import { Scene, Visual } from './tutorialScript';

// Illustrated panels for the "talk" cards — small, on-brand diagrams that make
// each concept concrete instead of just described.
function SceneVisual({ visual }: { visual: Visual }) {
  if (visual === 'next') {
    return (
      <div className="flex justify-center mb-1">
        <div className="border-4 border-black w-24">
          <div className="bg-yellow-400 text-black text-[10px] font-black uppercase tracking-wider text-center py-1 border-b-4 border-black">
            Next
          </div>
          <div className="bg-white p-2 flex justify-center">
            <span className="w-12 h-12 flex items-center justify-center bg-red-600 text-white border-2 border-black font-black text-2xl">
              1
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (visual === 'adjacency') {
    // center tile; orthogonal neighbours connect (✓), diagonals don't (✗).
    const cells = [
      { t: '✗', ok: false },
      { t: '✓', ok: true },
      { t: '✗', ok: false },
      { t: '✓', ok: true },
      { t: '', ok: null },
      { t: '✓', ok: true },
      { t: '✗', ok: false },
      { t: '✓', ok: true },
      { t: '✗', ok: false },
    ];
    return (
      <div className="flex justify-center mb-1">
        <div className="grid grid-cols-3 gap-1">
          {cells.map((c, i) => (
            <span
              key={i}
              className={`w-9 h-9 flex items-center justify-center border-2 border-black font-black text-base ${
                c.ok === null
                  ? 'bg-blue-600 text-white'
                  : c.ok
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-red-600'
              }`}
            >
              {c.ok === null ? '2' : c.t}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (visual === 'score') {
    return (
      <div className="mb-1">
        <div className="bg-black text-white font-black uppercase tracking-tight text-xs sm:text-base py-2 px-2 border-4 border-black">
          TIER × 10 × TILES × COMBO
        </div>
        <div className="text-black/60 font-bold uppercase text-[10px] sm:text-xs mt-1">
          e.g. tier 3 · 3 tiles · ×2 = 180
        </div>
      </div>
    );
  }

  if (visual === 'ladder') {
    return (
      <div className="mb-1">
        <div className="flex justify-center flex-wrap gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(t => (
            <span
              key={t}
              className={`w-7 h-7 flex items-center justify-center border-2 border-black font-black text-sm ${getTierStyle(t)}`}
            >
              {t}
            </span>
          ))}
        </div>
        <div className="text-black/60 font-bold uppercase text-[10px] sm:text-xs mt-1">
          1 → 9 · the black 9 is the summit
        </div>
      </div>
    );
  }

  if (visual === 'danger') {
    const fill = [1, 2, 1, 3, null, 2, 1, 1, 2];
    return (
      <div className="flex justify-center mb-1">
        <div className="relative">
          <div className="grid grid-cols-3 gap-0.5 bg-black p-0.5">
            {fill.map((v, i) => (
              <span
                key={i}
                className={`w-8 h-8 flex items-center justify-center border border-black font-black text-xs ${
                  v === null ? 'bg-white' : getTierStyle(v)
                }`}
              >
                {v ?? ''}
              </span>
            ))}
          </div>
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{ boxShadow: 'inset 0 0 0 4px #dc2626' }}
          />
        </div>
      </div>
    );
  }

  // modes
  return (
    <div className="flex flex-wrap justify-center gap-1.5 mb-1">
      {['DAILY', 'TIME ATTACK', 'ZEN', '4·6·8', 'AWARDS', 'THEMES'].map(m => (
        <span key={m} className="border-2 border-black bg-white px-2 py-1 text-[10px] font-black uppercase tracking-tight">
          {m}
        </span>
      ))}
    </div>
  );
}

export interface TutorialProps {
  scene: Scene;
  phase: 'intro' | 'outro';
  index: number;
  total: number;
  onContinue: () => void;
  onSkip: () => void;
}

export default function Tutorial({ scene, phase, index, total, onContinue, onSkip }: TutorialProps) {
  const isActIntro = scene.kind === 'act' && phase === 'intro';
  const title = phase === 'outro' ? scene.doneTitle ?? 'Nice' : scene.title;
  const lines = phase === 'outro' ? scene.doneLines ?? [] : scene.lines;

  // Act "intro": keep the board and the pointing hand visible. A compact banner
  // at the bottom gives the instruction; the player advances by doing the move.
  if (isActIntro) {
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-3 sm:bottom-5 z-40 flex justify-center px-3">
        <div className="fx-reveal bg-yellow-400 border-4 border-black px-4 py-3 sm:px-6 sm:py-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] max-w-sm w-full text-center pointer-events-auto">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-black/55">
              Step {index + 1}/{total}
            </span>
            <button onClick={onSkip} className="text-[10px] font-black uppercase tracking-widest text-black/55 underline">
              Skip
            </button>
          </div>
          <p className="text-black font-black uppercase tracking-tight text-base sm:text-xl leading-tight">{title}</p>
          {lines.map((l, i) => (
            <p key={i} className="text-black/80 font-bold uppercase tracking-tight text-[11px] sm:text-sm mt-1 leading-snug">
              {l}
            </p>
          ))}
        </div>
      </div>
    );
  }

  // Talk cards, and act "outro" (explain what just happened): centered modal.
  return (
    <div className="absolute inset-0 z-40 bg-black/80 flex items-center justify-center p-4 fx-dead">
      <div className="fx-reveal bg-white border-4 sm:border-8 border-black p-5 sm:p-7 max-w-md w-full text-center shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-black/45">
            Step {index + 1}/{total}
          </span>
          <button onClick={onSkip} className="text-[10px] font-black uppercase tracking-widest text-black/45 underline">
            Skip tutorial
          </button>
        </div>
        <h3 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter mb-3 fx-slam">{title}</h3>
        {scene.visual && phase === 'intro' && <SceneVisual visual={scene.visual} />}
        <div className="my-3 space-y-2">
          {lines.map((l, i) => (
            <p key={i} className="text-black font-bold uppercase tracking-tight text-sm sm:text-base leading-snug">
              {l}
            </p>
          ))}
        </div>
        <BrutalButton variant="yellow" onClick={onContinue} className="px-8 py-3 text-xl sm:text-2xl mt-1">
          {scene.cta ?? 'Continue'}
        </BrutalButton>
      </div>
    </div>
  );
}
