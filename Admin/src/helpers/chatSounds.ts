/**
 * Chat sound effects, generated in the browser with the Web Audio API. There are no
 * audio files: these are original sounds in the spirit of a phone's messaging app.
 */

const STORAGE_KEY = "devflow_chat_sounds";

export type SoundSettings = { messages: boolean };

const DEFAULTS: SoundSettings = { messages: true };

export const getSoundSettings = (): SoundSettings => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return DEFAULTS;
  }
};

export const saveSoundSettings = (settings: SoundSettings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Falls back to the defaults next time.
  }
};

/** A short rising "whoop", for a message leaving. */
export const scheduleSendSound = (context: BaseAudioContext, start: number) => {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(380, start);
  oscillator.frequency.exponentialRampToValueAtTime(1250, start + 0.12);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.16, start + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.17);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + 0.18);
};

/** Two soft rising notes, for a message arriving. */
export const scheduleReceiveSound = (context: BaseAudioContext, start: number) => {
  [
    { frequency: 880, at: 0 },
    { frequency: 1319, at: 0.09 },
  ].forEach(({ frequency, at }) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start + at);
    gain.gain.exponentialRampToValueAtTime(0.12, start + at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + at + 0.28);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start + at);
    oscillator.stop(start + at + 0.3);
  });
};

let sharedContext: AudioContext | null = null;

/**
 * Browsers only allow audio after the person has interacted with the page. Anything
 * scheduled before then would all play at once later, so `onlyIfRunning` drops it.
 */
const withContext = (
  play: (context: AudioContext, now: number) => void,
  onlyIfRunning = false,
) => {
  try {
    if (typeof AudioContext === "undefined") return;
    if (!sharedContext) sharedContext = new AudioContext();
    if (sharedContext.state === "closed") return;
    if (sharedContext.state === "suspended") {
      sharedContext.resume().catch(() => {});
      if (onlyIfRunning) return;
    }
    play(sharedContext, sharedContext.currentTime + 0.001);
  } catch {
    // A sound effect must never get in the way of the chat.
  }
};

export const playSendSound = () => {
  if (getSoundSettings().messages) withContext(scheduleSendSound);
};

export const playReceiveSound = () => {
  if (getSoundSettings().messages) withContext(scheduleReceiveSound, true);
};
