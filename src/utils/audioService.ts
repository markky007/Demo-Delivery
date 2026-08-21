/**
 * Audio and Speech Alert Service for Kitchen Display System (KDS).
 * Supports:
 * 1. Multiple Thai Voice Alert Templates (Default, Polite, Friendly, Kitchen, Table/Queue dynamic announcements, Custom text)
 * 2. Web Speech Synthesis TTS with adjustable speed and volume
 * 3. Web Audio API synthesizer chimes (works completely offline, zero latency)
 * 4. Combined Chime + Voice alerts
 */

export type SoundType = 'voice' | 'chime' | 'both';

export type VoicePattern =
  | 'default' // ออเดอร์มาแล้ว
  | 'polite_female' // มีออเดอร์ใหม่เข้ามาค่ะ
  | 'polite_male' // มีออเดอร์ใหม่เข้ามาครับ
  | 'friendly' // ออเดอร์เข้าจ้า
  | 'kitchen' // มีรายการอาหารใหม่ในครัวค่ะ
  | 'with_table' // มีออเดอร์ใหม่ {ชื่อโต๊ะ}
  | 'with_queue' // ออเดอร์ใหม่ คิวที่ {คิว}
  | 'with_table_and_queue' // ออเดอร์ใหม่ คิวที่ {คิว} {ชื่อโต๊ะ}
  | 'custom'; // กำหนดข้อความเอง

export interface VoicePatternOption {
  value: VoicePattern;
  label: string;
  example: string;
  description: string;
}

export interface OrderSpeechContext {
  tableName?: string | undefined;
  queueNumber?: number | string | undefined;
  customerName?: string | null | undefined;
}

export const VOICE_PATTERN_OPTIONS: VoicePatternOption[] = [
  {
    value: 'default',
    label: '🏷️ ออเดอร์มาแล้ว (มาตรฐาน)',
    example: 'ออเดอร์มาแล้ว',
    description: 'สั้นกระชับ ชัดเจน',
  },
  {
    value: 'polite_female',
    label: '🌸 มีออเดอร์ใหม่เข้ามาค่ะ (สุภาพ)',
    example: 'มีออเดอร์ใหม่เข้ามาค่ะ',
    description: 'สุภาพ นุ่มนวล เป็นทางการ',
  },
  {
    value: 'polite_male',
    label: '👔 มีออเดอร์ใหม่เข้ามาครับ (สุภาพ)',
    example: 'มีออเดอร์ใหม่เข้ามาครับ',
    description: 'สุภาพ เรียบร้อย',
  },
  {
    value: 'friendly',
    label: '⚡ ออเดอร์เข้าจ้า (กันเอง)',
    example: 'ออเดอร์เข้าจ้า',
    description: 'สนุกสนาน กระฉับกระเฉง',
  },
  {
    value: 'kitchen',
    label: '🍳 มีรายการอาหารใหม่ในครัวค่ะ',
    example: 'มีรายการอาหารใหม่ในครัวค่ะ',
    description: 'เน้นแจ้งเตือนสำหรับครัวและเชฟ',
  },
  {
    value: 'with_table',
    label: '🪑 บอกชื่อโต๊ะ / สั่งกลับบ้าน',
    example: 'มีออเดอร์ใหม่ โต๊ะ 1 (หรือ สั่งกลับบ้าน)',
    description: 'พูดระบุชื่อโต๊ะหรือสั่งกลับบ้านอัตโนมัติ',
  },
  {
    value: 'with_queue',
    label: '🔢 บอกหมายเลขคิว',
    example: 'ออเดอร์ใหม่ คิวที่ 5',
    description: 'พูดระบุหมายเลขคิวออเดอร์',
  },
  {
    value: 'with_table_and_queue',
    label: '📋 บอกทั้งคิวและโต๊ะ',
    example: 'ออเดอร์ใหม่ คิวที่ 5 โต๊ะ 1',
    description: 'บอกข้อมูลครบถ้วนทั้งคิวและโต๊ะ',
  },
  {
    value: 'custom',
    label: '✏️ กำหนดข้อความพูดเอง...',
    example: 'กำหนดข้อความได้ตามต้องการ',
    description: 'พิมพ์ข้อความที่ต้องการให้ระบบพูดเองได้อิสระ',
  },
];

const STORAGE_KEY_ENABLED = 'kds_sound_enabled';
const STORAGE_KEY_VOLUME = 'kds_sound_volume';
const STORAGE_KEY_TYPE = 'kds_sound_type';
const STORAGE_KEY_VOICE_PATTERN = 'kds_sound_voice_pattern';
const STORAGE_KEY_CUSTOM_VOICE_TEXT = 'kds_sound_custom_voice_text';
const STORAGE_KEY_VOICE_SPEED = 'kds_sound_voice_speed';

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
 * Defaults to 'voice'.
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
 * Get selected voice alert pattern.
 */
export function getVoicePattern(): VoicePattern {
  if (typeof window === 'undefined') return 'default';
  const stored = localStorage.getItem(STORAGE_KEY_VOICE_PATTERN) as VoicePattern | null;
  if (
    stored &&
    [
      'default',
      'polite_female',
      'polite_male',
      'friendly',
      'kitchen',
      'with_table',
      'with_queue',
      'with_table_and_queue',
      'custom',
    ].includes(stored)
  ) {
    return stored;
  }
  return 'default';
}

/**
 * Set selected voice alert pattern.
 */
export function setVoicePattern(pattern: VoicePattern): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_VOICE_PATTERN, pattern);
}

/**
 * Get custom speech text.
 */
export function getCustomVoiceText(): string {
  if (typeof window === 'undefined') return 'ออเดอร์มาแล้ว';
  return localStorage.getItem(STORAGE_KEY_CUSTOM_VOICE_TEXT) || 'ออเดอร์มาแล้ว';
}

/**
 * Set custom speech text.
 */
export function setCustomVoiceText(text: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_CUSTOM_VOICE_TEXT, text.trim());
}

/**
 * Get speech playback speed (0.85 = ช้า, 1.0 = ปกติ, 1.2 = เร็ว).
 */
export function getVoiceSpeed(): number {
  if (typeof window === 'undefined') return 1.0;
  const stored = localStorage.getItem(STORAGE_KEY_VOICE_SPEED);
  if (stored) {
    const val = parseFloat(stored);
    if (!isNaN(val) && val >= 0.7 && val <= 1.5) return val;
  }
  return 1.0;
}

/**
 * Set speech playback speed.
 */
export function setVoiceSpeed(speed: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_VOICE_SPEED, String(speed));
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
 * Build the spoken text according to pattern and context.
 */
export function buildSpeechText(
  pattern: VoicePattern = getVoicePattern(),
  context?: OrderSpeechContext,
  customTextOverride?: string,
): string {
  if (pattern === 'custom') {
    const custom = customTextOverride !== undefined ? customTextOverride : getCustomVoiceText();
    return custom.trim() || 'ออเดอร์มาแล้ว';
  }

  const tableLabel = context?.tableName || 'โต๊ะ 1';
  const queueNum = context?.queueNumber ? String(context.queueNumber) : '1';

  switch (pattern) {
    case 'polite_female':
      return 'มีออเดอร์ใหม่เข้ามาค่ะ';
    case 'polite_male':
      return 'มีออเดอร์ใหม่เข้ามาครับ';
    case 'friendly':
      return 'ออเดอร์เข้าจ้า';
    case 'kitchen':
      return 'มีรายการอาหารใหม่ในครัวค่ะ';
    case 'with_table':
      return `มีออเดอร์ใหม่ ${tableLabel}`;
    case 'with_queue':
      return `ออเดอร์ใหม่ คิวที่ ${queueNum}`;
    case 'with_table_and_queue':
      return `ออเดอร์ใหม่ คิวที่ ${queueNum} ${tableLabel}`;
    case 'default':
    default:
      return 'ออเดอร์มาแล้ว';
  }
}

/**
 * Speak Thai text alert using Web Speech Synthesis API.
 */
export function speakAlert(
  textOrContext?: string | OrderSpeechContext,
  overrideVol?: number,
  overrideSpeed?: number,
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (!isSoundEnabled() && overrideVol === undefined) return;

  const rawVol = overrideVol !== undefined ? overrideVol : getSoundVolume();
  const volumeFactor = Math.max(0, Math.min(1, rawVol / 100));
  if (volumeFactor <= 0) return;

  const textToSpeak =
    typeof textOrContext === 'string'
      ? textOrContext
      : buildSpeechText(getVoicePattern(), textOrContext);

  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'th-TH';
    utterance.volume = volumeFactor;
    utterance.rate = overrideSpeed !== undefined ? overrideSpeed : getVoiceSpeed();
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
 * Helper to play a chime note with fundamental frequency + overtone harmonics.
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
export function playNewOrderChime(
  overrideVol?: number,
  contextOrText?: string | OrderSpeechContext,
): void {
  if (!isSoundEnabled() && overrideVol === undefined) return;

  const type = getSoundType();

  if (type === 'voice') {
    speakAlert(contextOrText, overrideVol);
  } else if (type === 'chime') {
    playChimeAlert(overrideVol);
  } else if (type === 'both') {
    playChimeAlert(overrideVol);
    setTimeout(() => {
      speakAlert(contextOrText, overrideVol);
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
