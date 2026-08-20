/**
 * Audio and Speech Alert Service for Kitchen Display System (KDS).
 * Supports:
 * 1. Web Speech Synthesis TTS (e.g., "ออเดอร์มาแล้ว" in natural Thai voice)
 * 2. Web Audio API synthesizer chimes (works completely offline, zero latency)
 * 3. Combined Chime + Voice alerts
 */

export type SoundType = 'voice' | 'chime' | 'both';

const STORAGE_KEY_ENABLED = 'kds_sound_enabled';
const STORAGE_KEY_VOLUME = 'kds_sound_volume';
const STORAGE_KEY_TYPE = 'kds_sound_type';

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
 * Get sound alert type ('voice' | 'chime' | 'both').
 * Defaults to 'voice' as requested.
 */
export function getSoundType(): SoundType {
  if (typeof window === 'undefined') return 'voice';
  const stored = localStorage.getItem(STORAGE_KEY_TYPE);
  if (stored === 'chime' || stored === 'voice' || stored === 'both') {
    return stored;
  }
  return 'voice';
}

/**
 * Set sound alert type.
 */
export function setSoundType(type: SoundType): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_TYPE, type);
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
 * Speak Thai text alert using Web Speech Synthesis API.
 */
export function speakAlert(text = 'ออเดอร์มาแล้ว', overrideVol?: number): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (!isSoundEnabled() && overrideVol === undefined) return;

  const rawVol = overrideVol !== undefined ? overrideVol : getSoundVolume();
  const volumeFactor = Math.max(0, Math.min(1, rawVol / 100));
  if (volumeFactor <= 0) return;

  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'th-TH';
    utterance.volume = volumeFactor;
    utterance.rate = 1.0;
    utterance.pitch = 1.05;

    // Pick best available Thai voice if available
    const voices = window.speechSynthesis.getVoices();
    const thaiVoice = voices.find(
      (v) => v.lang === 'th-TH' || v.lang.replace('_', '-').startsWith('th'),
    );
    if (thaiVoice) {
      utterance.voice = thaiVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('Speech synthesis alert failed:', e);
  }
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
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);

  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = type;
  osc1.frequency.setValueAtTime(freq, startTime);

  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 2, startTime);

  const peakVol1 = 0.75 * volumeFactor;
  gain1.gain.setValueAtTime(0.0001, startTime);
  gain1.gain.linearRampToValueAtTime(peakVol1, startTime + 0.015);
  gain1.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

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
 * Play synthesizer chime for new incoming order.
 */
export function playChimeAlert(overrideVol?: number): void {
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
    { freq: 1046.5, time: 0.44, duration: 0.65 }, // C6
  ];

  notes.forEach(({ freq, time, duration }) => {
    playChimeNote(ctx, freq, now + time, duration, volumeFactor, 'triangle');
  });
}

/**
 * Main function to trigger new incoming order notification.
 * Dispatches voice speech, chime, or both depending on user settings.
 */
export function playNewOrderChime(overrideVol?: number, customText = 'ออเดอร์มาแล้ว'): void {
  if (!isSoundEnabled() && overrideVol === undefined) return;

  const type = getSoundType();

  if (type === 'voice') {
    speakAlert(customText, overrideVol);
  } else if (type === 'chime') {
    playChimeAlert(overrideVol);
  } else if (type === 'both') {
    playChimeAlert(overrideVol);
    setTimeout(() => {
      speakAlert(customText, overrideVol);
    }, 450);
  }
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
