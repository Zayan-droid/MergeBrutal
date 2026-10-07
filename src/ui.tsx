/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

// Shared brutalist controls: hard black borders, offset drop-shadow that
// collapses on press, mono/black type. One source of truth so every screen
// (home, pause, game over, modals) stays visually identical.

type Variant = 'yellow' | 'white' | 'black';

const VARIANT: Record<Variant, string> = {
  yellow: 'bg-yellow-400 hover:bg-yellow-300 text-black',
  white: 'bg-white hover:bg-gray-200 text-black',
  black: 'bg-black hover:bg-neutral-800 text-white',
};

export const BrutalButton = ({
  children,
  onClick,
  variant = 'white',
  disabled = false,
  className = '',
  ...rest
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: Variant;
  disabled?: boolean;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`border-4 border-black ${VARIANT[variant]} font-black uppercase tracking-widest
      shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1.5 active:translate-y-1.5
      transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:active:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
      ${className}`}
    {...rest}
  >
    {children}
  </button>
);

// A hard-bordered plaque: solid label bar over a value cell. Used for stats
// and readouts across the game.
export const Plaque = ({
  label,
  highlight = false,
  children,
  className = '',
}: {
  label: string;
  highlight?: boolean;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`border-2 sm:border-4 border-black bg-white flex flex-col overflow-hidden ${className}`}>
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

// Full-screen brutalist modal shell with a hard border and a close bar.
export const Modal = ({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) => (
  <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 sm:p-6 font-mono">
    <div className="bg-white border-4 sm:border-8 border-black w-full max-w-2xl max-h-[88vh] flex flex-col shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex items-center justify-between border-b-4 sm:border-b-8 border-black bg-black text-white px-4 py-3">
        <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tighter">{title}</h2>
        <button
          onClick={onClose}
          aria-label="Close"
          className="shrink-0 w-10 h-10 flex items-center justify-center border-2 border-white text-xl font-black bg-black hover:bg-white hover:text-black transition-colors"
        >
          ✕
        </button>
      </div>
      <div className="overflow-y-auto p-4 sm:p-6">{children}</div>
    </div>
  </div>
);
