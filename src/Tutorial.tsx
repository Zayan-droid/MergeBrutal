/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrutalButton } from './ui';

// The first-run coach. Step 0 sits at the bottom so it never covers the glowing
// target cell near the top of the board; step 1 is a centered card the player
// dismisses to begin free play. Teach by doing — one tap shows the whole loop.
export default function Tutorial({ step, onDone }: { step: 0 | 1; onDone: () => void }) {
  if (step === 0) {
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-4 sm:bottom-6 z-40 flex justify-center px-3">
        <div className="fx-reveal bg-yellow-400 border-4 border-black px-4 py-3 sm:px-6 sm:py-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] max-w-sm text-center">
          <p className="text-black font-black uppercase tracking-tight text-base sm:text-xl leading-tight">
            Tap the glowing cell
          </p>
          <p className="text-black/70 font-bold uppercase tracking-tight text-[10px] sm:text-xs mt-1">
            Drop your NEXT tile — 3 in a line collapse
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-40 bg-black/80 flex items-center justify-center p-4 fx-dead">
      <div className="fx-reveal bg-white border-4 sm:border-8 border-black p-5 sm:p-8 max-w-md text-center shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
        <h3 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter mb-3 fx-slam">
          Cascade!
        </h3>
        <p className="text-black font-bold uppercase tracking-tight text-sm sm:text-lg leading-snug mb-2">
          A merge that makes a new group merges again — chains multiply your score.
        </p>
        <p className="text-black/70 font-bold uppercase tracking-tight text-xs sm:text-sm leading-snug mb-5">
          Fill all 36 cells and you're dead. Go as deep as you can.
        </p>
        <BrutalButton variant="yellow" onClick={onDone} className="px-8 py-3 text-xl sm:text-2xl">
          Got it
        </BrutalButton>
      </div>
    </div>
  );
}
