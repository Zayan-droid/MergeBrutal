/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';

// Full-screen intro: looping background video, a frosted block hiding the
// AI watermark in the bottom-right corner, and the title + play button
// stamping in after a 3 second hold.
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

      {/* Frosted block over the AI watermark in the bottom-right corner */}
      <div className="absolute bottom-0 right-0 w-[30%] max-w-[220px] h-[15%] max-h-[190px] backdrop-blur-2xl bg-white/30" />

      {revealed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 sm:gap-10 p-4">
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
