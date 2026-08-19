/**
 * Web Audio API synthesizer for Kitchen Display System (KDS).
 * Generates crisp, zero-latency chimes for incoming orders and completion.
 * Does not depend on external audio assets, works completely offline.
 */

const STORAGE_KEY_ENABLED = 'kds_sound_enabled';
const STORAGE_KEY_VOLUME = 'kds_sound_volume';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Check if kitchen sound alerts are enabled.
 * Defaults to true.
 */
export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(STORAGE_KEY_ENABLED);
  return stored === null ? true : stored === 'true';
}

/**
 * Toggle or set sound alerts enabled state.
 */
export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_ENABLED, String(enabled));
}

/**
 * Get current sound volume (0 - 100).
 * Defaults to 90%.
 */
export function getSoundVolume(): number {
  if (typeof window === 'undefined') return 90;
  const stored = localStorage.getItem(STORAGE_KEY_VOLUME);
  if (stored === null) return 90;
  const parsed = parseInt(stored, 10);
  return isNaN(parsed) ? 90 : Math.max(0, Math.min(100, parsed));
}

/**
 * Set sound volume (0 - 100).
 */
export function setSoundVolume(volume: number): void {
  if (typeof window === 'undefined') return;
  const clamped = Math.max(0, Math.min(100, Math.round(volume)));
  localStorage.setItem(STORAGE_KEY_VOLUME, String(clamped));
}

/**
 * Helper to play a chime note with fundamental frequency + overtone harmonics
 * for rich, piercing clarity that cuts through kitchen noise.
 */
function playChimeNote(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  volumeFactor: number,
  type: OscillatorType = 'triangle',
): void {
  // Master Gain for this note
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);

  // Fundamental Oscillator
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = type;
  osc1.frequency.setValueAtTime(freq, startTime);

  // Secondary Harmonic (Octave / Overtone for bell-like presence)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 2, startTime);

  // Primary tone envelope (Punchy attack + rich decay)
  const peakVol1 = 0.75 * volumeFactor;
  gain1.gain.setValueAtTime(0.0001, startTime);
  gain1.gain.linearRampToValueAtTime(peakVol1, startTime + 0.015);
  gain1.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  // Overtone envelope (Slight sparkle on hit)
  const peakVol2 = 0.25 * volumeFactor;
  gain2.gain.setValueAtTime(0.0001, startTime);
  gain2.gain.linearRampToValueAtTime(peakVol2, startTime + 0.01);
  gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.7);

  osc1.connect(gain1);
  gain1.connect(masterGain);

  osc2.connect(gain2);
  gain2.connect(masterGain);

  osc1.start(startTime);
  osc1.stop(startTime + duration);
  osc2.start(startTime);
  osc2.stop(startTime + duration);
}

/**
 * Play a loud, distinct 4-note melodic chime for incoming new orders (C5 -> E5 -> G5 -> C6).
 * Piercing and audible in busy kitchen environments.
 */
export function playNewOrderChime(overrideVol?: number): void {
  if (!isSoundEnabled() && overrideVol === undefined) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const rawVol = overrideVol !== undefined ? overrideVol : getSoundVolume();
  const volumeFactor = Math.max(0, Math.min(1, rawVol / 100));
  if (volumeFactor <= 0) return;

  const now = ctx.currentTime;
  const notes = [
    { freq: 523.25, time: 0.0, duration: 0.22 }, // C5
    { freq: 659.25, time: 0.14, duration: 0.22 }, // E5
    { freq: 783.99, time: 0.28, duration: 0.24 }, // G5
    { freq: 1046.5, time: 0.44, duration: 0.65 }, // C6 (long resonant tail)
  ];

  notes.forEach(({ freq, time, duration }) => {
    playChimeNote(ctx, freq, now + time, duration, volumeFactor, 'triangle');
  });
}

/**
 * Play a quick positive chime when an order is completed/prepared (E5 -> A5).
 */
export function playStatusDoneChime(overrideVol?: number): void {
  if (!isSoundEnabled() && overrideVol === undefined) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const rawVol = overrideVol !== undefined ? overrideVol : getSoundVolume();
  const volumeFactor = Math.max(0, Math.min(1, rawVol / 100));
  if (volumeFactor <= 0) return;

  const now = ctx.currentTime;
  const notes = [
    { freq: 659.25, time: 0.0, duration: 0.15 }, // E5
    { freq: 880.0, time: 0.12, duration: 0.45 }, // A5
  ];

  notes.forEach(({ freq, time, duration }) => {
    playChimeNote(ctx, freq, now + time, duration, volumeFactor, 'sine');
  });
}

