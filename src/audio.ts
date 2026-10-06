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
    // Signal chain: every voice -> master gain -> compressor -> out. Deep
    // cascades stack several punches within a few hundred ms; the compressor
    // glues them and stops the sum from crackling, so hits stay tight and hard
    // instead of smearing into distortion.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -15;
    comp.knee.value = 6;
    comp.ratio.value = 6;
    comp.attack.value = 0.002;
    comp.release.value = 0.13;
    master = ctx.createGain();
    master.gain.value = 0.75; // punchy but not blasting
    master.connect(comp);
    comp.connect(ctx.destination);
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

// --- Voice cheers -----------------------------------------------------------
// Spoken "small win" callouts (AWESOME, BRUTAL, …) using the browser's built-in
// speech synthesis — no audio files, same generated-everything approach as the
// SFX. Shares the `enabled` flag, so muting silences cheers too.

const hasSpeech =
  typeof window !== 'undefined' &&
  'speechSynthesis' in window &&
  typeof SpeechSynthesisUtterance !== 'undefined';

let voices: SpeechSynthesisVoice[] = [];
const loadVoices = () => {
  if (!hasSpeech) return;
  try {
    voices = window.speechSynthesis.getVoices();
  } catch {
    voices = [];
  }
};
if (hasSpeech) {
  loadVoices();
  try {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  } catch {
    // ignore
  }
}

// Prefer an English voice; fall back to whatever the platform offers.
const pickVoice = (): SpeechSynthesisVoice | null => {
  if (!voices.length) loadVoices();
  return voices.find(v => /^en\b|^en[-_]/i.test(v.lang)) ?? voices[0] ?? null;
};

let voicePrimed = false;
// Speak a silent utterance inside a user gesture so later cheers (fired from
// async cascade timers) aren't blocked by autoplay policies, notably on iOS.
const primeVoice = () => {
  if (voicePrimed || !enabled || !hasSpeech) return;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    window.speechSynthesis.speak(u);
    voicePrimed = true;
  } catch {
    // ignore
  }
};

/** Spoken celebration callout. No-op when muted or unsupported. */
const cheer = (word: string) => {
  if (!enabled || !hasSpeech) return;
  try {
    window.speechSynthesis.cancel(); // never stack cheers
    const u = new SpeechSynthesisUtterance(word);
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = 1.08; // crisp, a touch quick
    u.pitch = 0.92; // dropped a hair — reads as emphatic, not chirpy
    u.volume = 1;
    window.speechSynthesis.speak(u);
  } catch {
    // speech unsupported — ignore
  }
};

/** Placing a block: tight mechanical set-down with a crisp attack click. */
const place = () => {
  if (!enabled || !ensure()) return;
  tone({ type: 'triangle', from: 220, to: 140, glideMs: 32, peak: 0.22, decayMs: 46 });
  tone({ type: 'square', from: 820, peak: 0.035, decayMs: 13, lowpass: 3200 }); // top click = definition
  noise({ peak: 0.05, decayMs: 19, lowpass: 2000 });
  vibrate(9); // one crisp tap
};

/**
 * Merging: dry square punch pitched by resulting tier, with a short sub thump
 * for weight and a hard attack click. The chain step (combo depth) brightens
 * the top end and stacks a ping from the 2nd link on, so cascades audibly
 * climb. Haptic sharpens with depth and adds a second knock once it's deep.
 */
const merge = (tier: number, combo: number) => {
  if (!enabled || !ensure()) return;
  const step = Math.min(combo - 1, 6);
  const f = 150 * Math.pow(1.12, tier) * (1 + 0.045 * step);
  tone({
    type: 'square',
    from: f * 1.5,
    to: f,
    glideMs: 28,
    peak: Math.min(0.2 + 0.018 * step, 0.3),
    decayMs: 115,
    lowpass: 2200,
  });
  tone({ type: 'sine', from: f / 2, to: f / 2.4, glideMs: 60, peak: 0.16, decayMs: 100 }); // chest weight
  noise({ peak: 0.05 + 0.01 * step, decayMs: 18, lowpass: 2600 + 500 * step }); // attack crack
  if (combo >= 2) {
    tone({ type: 'square', from: 1050 + 150 * step, peak: 0.05, decayMs: 28, at: 0.065 }); // combo ping
  }
  if (step >= 2) vibrate([Math.min(18 + 6 * step, 48), 22, 14]);
  else vibrate(Math.min(16 + 6 * step, 40));
};

/** Clicking an occupied cell: dead muted thunk with a stuttered "no" buzz. */
const invalid = () => {
  if (!enabled || !ensure()) return;
  tone({ type: 'triangle', from: 84, peak: 0.1, decayMs: 44, lowpass: 500 });
  noise({ peak: 0.035, decayMs: 22, lowpass: 360 });
  vibrate([14, 34, 10]); // double stutter — never mistaken for a clean place
};

/** Rubber-stamp slam under the win callout: hard broadband knock + wood thump. */
const stamp = () => {
  if (!enabled || !ensure()) return;
  noise({ peak: 0.16, decayMs: 38, lowpass: 2200 });
  tone({ type: 'triangle', from: 150, to: 70, glideMs: 55, peak: 0.2, decayMs: 90, lowpass: 1200 });
  vibrate([20, 26, 42]); // soft-then-firm, like a press
};

/** New highest tier reached: a hard two-note ascending stab, pitched by tier. */
const tierUp = (tier: number) => {
  if (!enabled || !ensure()) return;
  const base = 240 * Math.pow(1.06, tier);
  tone({ type: 'square', from: base, peak: 0.15, decayMs: 85, lowpass: 2600 });
  tone({ type: 'square', from: base * 1.5, peak: 0.15, decayMs: 120, lowpass: 2800, at: 0.1 });
  vibrate([12, 22, 18]);
};

/** Grid full: harsh low dead thud with an opening crack, a beat past the merge. */
const gameOver = () => {
  if (!enabled || !ensure()) return;
  tone({ type: 'sawtooth', from: 110, to: 40, glideMs: 320, peak: 0.26, decayMs: 420, lowpass: 900, at: 0.12 });
  tone({ type: 'sawtooth', from: 116, to: 43, glideMs: 320, peak: 0.16, decayMs: 420, lowpass: 700, at: 0.12 });
  noise({ peak: 0.14, decayMs: 140, lowpass: 480, at: 0.12 });
  noise({ peak: 0.08, decayMs: 55, lowpass: 1600, at: 0.12 }); // dry crack on impact
  vibrate([90, 60, 150, 60, 220]);
};

const setEnabled = (v: boolean) => {
  enabled = v;
  try {
    localStorage.setItem(STORAGE_KEY, v ? '1' : '0');
  } catch {
    // ignore
  }
  if (v) {
    ensure(); // warm the context inside the toggle's click gesture
    primeVoice();
  } else if (hasSpeech) {
    try {
      window.speechSynthesis.cancel(); // cut any cheer mid-word
    } catch {
      // ignore
    }
  }
};

export const sfx = {
  place,
  merge,
  invalid,
  gameOver,
  stamp,
  tierUp,
  cheer,
  primeVoice,
  setEnabled,
  isEnabled: () => enabled,
};
