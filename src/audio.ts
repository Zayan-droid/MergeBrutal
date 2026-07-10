/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Dry, mechanical one-shot SFX generated with the Web Audio API — no samples.
// Haptics (navigator.vibrate) ride along with each sound and share the same
// enabled flag. The preference persists in localStorage.

const STORAGE_KEY = 'brutalist-merge-sfx';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

let enabled = true;
try {
  enabled = localStorage.getItem(STORAGE_KEY) !== '0';
} catch {
  // storage unavailable — keep default ON
}

// Created lazily inside user-gesture handlers so autoplay policies never
// block it; resumed if the browser suspended it.
const ensure = (): AudioContext | null => {
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.7; // punchy but not blasting
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.3), ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
};

interface ToneOpts {
  type: OscillatorType;
  from: number; // start frequency (Hz)
  to?: number; // glide target (Hz)
  glideMs?: number;
  peak: number; // envelope peak gain
  decayMs: number;
  attackMs?: number;
  lowpass?: number; // optional lowpass cutoff (Hz)
  at?: number; // schedule offset (s)
}

const tone = (o: ToneOpts) => {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + (o.at ?? 0);
  const attack = (o.attackMs ?? 2) / 1000;
  const decay = o.decayMs / 1000;

  const osc = ctx.createOscillator();
  osc.type = o.type;
  osc.frequency.setValueAtTime(o.from, t0);
  if (o.to && o.glideMs) {
    osc.frequency.exponentialRampToValueAtTime(o.to, t0 + o.glideMs / 1000);
  }

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(o.peak, t0 + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);

  let head: AudioNode = osc;
  if (o.lowpass) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = o.lowpass;
    head.connect(filter);
    head = filter;
  }
  head.connect(gain);
  gain.connect(master);
  osc.start(t0);
  osc.stop(t0 + attack + decay + 0.05);
};

interface NoiseOpts {
  peak: number;
  decayMs: number;
  lowpass?: number;
  at?: number; // schedule offset (s)
}

const noise = (o: NoiseOpts) => {
  if (!ctx || !master || !noiseBuf) return;
  const t0 = ctx.currentTime + (o.at ?? 0);
  const decay = o.decayMs / 1000;

  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(o.peak, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);

  let head: AudioNode = src;
  if (o.lowpass) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = o.lowpass;
    head.connect(filter);
    head = filter;
  }
  head.connect(gain);
  gain.connect(master);
  src.start(t0);
  src.stop(t0 + decay + 0.05);
};

const vibrate = (pattern: number | number[]) => {
  if (!enabled) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // unsupported — ignore
  }
};

/** Placing a block: short dry tap, ~55ms. */
const place = () => {
  if (!enabled || !ensure()) return;
  tone({ type: 'triangle', from: 210, to: 150, glideMs: 40, peak: 0.2, decayMs: 50 });
  noise({ peak: 0.06, decayMs: 25, lowpass: 1800 });
  vibrate(12);
};

/**
 * Merging: dry punch pitched by resulting tier; cascade steps land slightly
 * higher and harder. A tiny combo tick is layered in for combo >= 2.
 */
const merge = (tier: number, combo: number) => {
  if (!enabled || !ensure()) return;
  const step = Math.min(combo - 1, 5);
  const f = 150 * Math.pow(1.12, tier) * (1 + 0.05 * step);
  tone({
    type: 'square',
    from: f * 1.5,
    to: f,
    glideMs: 30,
    peak: Math.min(0.22 + 0.02 * step, 0.32),
    decayMs: 110,
    lowpass: 2000,
  });
  tone({ type: 'sine', from: f / 2, peak: 0.14, decayMs: 90 });
  if (combo >= 2) {
    tone({ type: 'square', from: 1100 + 160 * step, peak: 0.05, decayMs: 30, at: 0.07 });
  }
  vibrate(Math.min(22 + 8 * step, 60));
};

/** Clicking an occupied cell: dull muted tick. */
const invalid = () => {
  if (!enabled || !ensure()) return;
  tone({ type: 'triangle', from: 90, peak: 0.11, decayMs: 40 });
  noise({ peak: 0.04, decayMs: 25, lowpass: 400 });
  vibrate(14);
};

/** Grid full: harsh low dead thud, offset a beat past the final merge. */
const gameOver = () => {
  if (!enabled || !ensure()) return;
  tone({ type: 'sawtooth', from: 110, to: 42, glideMs: 300, peak: 0.26, decayMs: 380, lowpass: 900, at: 0.12 });
  tone({ type: 'sawtooth', from: 116, to: 45, glideMs: 300, peak: 0.16, decayMs: 380, lowpass: 700, at: 0.12 });
  noise({ peak: 0.12, decayMs: 120, lowpass: 500, at: 0.12 });
  vibrate([90, 70, 180]);
};

const setEnabled = (v: boolean) => {
  enabled = v;
  try {
    localStorage.setItem(STORAGE_KEY, v ? '1' : '0');
  } catch {
    // ignore
  }
  if (v) ensure(); // warm the context inside the toggle's click gesture
};

export const sfx = {
  place,
  merge,
  invalid,
  gameOver,
  setEnabled,
  isEnabled: () => enabled,
};
