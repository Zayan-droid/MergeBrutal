/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';

// Decorative game tiles scattered around the splash edges. The green "4"
// is sized and pinned so it always covers the AI watermark that sits at
// ~76-97% width / ~88-93% height on tall screens (wide screens crop the
// watermark out of the object-cover frame entirely).
const DECOR_TILES = [
  { label: '1', cls: 'w-14 sm:w-24 top-[7%] left-[5%] -rotate-6 bg-red-600 text-white text-2xl sm:text-4xl' },
  { label: '2', cls: 'w-12 sm:w-20 top-[13%] right-[7%] rotate-6 bg-blue-600 text-white text-xl sm:text-3xl' },
  { label: '3', cls: 'w-14 sm:w-24 bottom-[12%] left-[6%] rotate-3 bg-yellow-400 text-black text-2xl sm:text-4xl' },
  { label: '4', cls: 'w-[26%] max-w-[140px] bottom-[5%] right-0 -rotate-3 bg-green-600 text-white text-3xl sm:text-5xl' },
] as const;

// Full-screen intro: looping background video, game tiles on the edges
// (one hiding the AI watermark), and the title + play button stamping in
// after a 3 second hold.
export default function Splash({ onPlay }: { onPlay: () => void }) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 overflow-hidden font-mono select-none">
      <video
        src="/splash.mp4"
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Game tiles on the edges; the green 4 covers the AI watermark */}
      {DECOR_TILES.map(t => (
        <div
          key={t.label}
          aria-hidden="true"
          className={`absolute aspect-square border-4 border-black flex items-center justify-center font-black font-mono shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${t.cls}`}
        >
          {t.label}
        </div>
      ))}

      {revealed && (
        <div className="fx-veil absolute inset-0 flex flex-col items-center justify-center gap-6 sm:gap-10 p-4">
          <div className="fx-reveal bg-white border-4 sm:border-8 border-black px-8 py-5 sm:px-12 sm:py-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] text-center">
            <h1 className="text-5xl sm:text-7xl font-black uppercase tracking-tighter leading-none">Merge</h1>
            <h1 className="text-5xl sm:text-7xl font-black uppercase tracking-tighter leading-none">Brutal</h1>
          </div>
          <button
            onClick={onPlay}
            className="fx-reveal-btn border-4 border-black bg-yellow-400 hover:bg-yellow-300 text-black px-10 py-3 sm:px-14 sm:py-4 text-2xl sm:text-3xl font-black uppercase tracking-widest shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-2 active:translate-x-2 transition-all cursor-pointer"
          >
            Play
          </button>
        </div>
      )}
    </div>
  );
}
