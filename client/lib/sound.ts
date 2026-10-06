// chime01 = low, chime02 = mid, chime03 = high
const SOUND_FILES = {
  low: "/audio/chime01.mp3",
  mid: "/audio/chime02.mp3",
  high: "/audio/chime03.mp3",
} as const;

type Pitch = keyof typeof SOUND_FILES;

type SoundPreset = {
  pitch: Pitch;
  volume: number;
  // >1 = higher and shorter, <1 = lower and longer
  rate?: number;
};

export const SOUNDS = {
  button: { pitch: "high", volume: 0.15, rate: 1.5 },
  chat: { pitch: "mid", volume: 0.25, rate: 1.25 },
  playerJoined: { pitch: "mid", volume: 0.4 },
  question: { pitch: "mid", volume: 0.6 },
  rightAnswer: { pitch: "high", volume: 0.6 },
  wrongAnswer: { pitch: "low", volume: 0.7 },
  gameStart: { pitch: "low", volume: 0.6, rate: 0.9 },
  info: { pitch: "high", volume: 0.3, rate: 0.85 },
} satisfies Record<string, SoundPreset>;

export type SoundName = keyof typeof SOUNDS;

const cache = new Map<Pitch, HTMLAudioElement>();

const getBase = (pitch: Pitch) => {
  let audio = cache.get(pitch);
  if (!audio) {
    audio = new Audio(SOUND_FILES[pitch]);
    audio.preload = "auto";
    cache.set(pitch, audio);
  }
  return audio;
};

export function preloadSounds() {
  if (typeof window === "undefined") return;
  (Object.keys(SOUND_FILES) as Pitch[]).forEach(getBase);
}

export function playSound(name: SoundName) {
  if (typeof window === "undefined") return;

  const preset: SoundPreset = SOUNDS[name];
  // clone so the same sound can overlap itself
  const audio = getBase(preset.pitch).cloneNode() as HTMLAudioElement;
  audio.volume = preset.volume;
  audio.playbackRate = preset.rate ?? 1;
  audio.preservesPitch = false;

  // browsers block audio before the first user interaction - ignore that
  audio.play().catch(() => {});
}
