/**
 * Tiny, low-volume UI sounds generated locally with Web Audio. No audio asset is
 * downloaded and playback failures (silent mode, browser policy) are ignored.
 */
export type NotificationSound = "patient" | "exam" | "success" | "encouragement";

let audioContext: AudioContext | undefined;

type Note = { frequency: number; start: number; duration: number; type?: OscillatorType };

const SOUNDS: Record<NotificationSound, Note[]> = {
  // A calm answer from the patient.
  patient: [{ frequency: 523.25, start: 0, duration: 0.07 }, { frequency: 659.25, start: 0.09, duration: 0.09 }],
  // A brief clinical "sparkle" when a result has arrived.
  exam: [{ frequency: 783.99, start: 0, duration: 0.06 }, { frequency: 1046.5, start: 0.07, duration: 0.1 }],
  // Warm upward arpeggio for a strong score.
  success: [{ frequency: 523.25, start: 0, duration: 0.08 }, { frequency: 659.25, start: 0.08, duration: 0.08 }, { frequency: 783.99, start: 0.16, duration: 0.15 }],
  // A soft, non-punitive cue inviting the learner to review and try again.
  encouragement: [{ frequency: 440, start: 0, duration: 0.12, type: "sine" }, { frequency: 392, start: 0.12, duration: 0.16, type: "sine" }],
};

export function playNotificationSound(sound: NotificationSound) {
  if (typeof window === "undefined") return;
  try {
    audioContext ??= new AudioContext();
    const context = audioContext;
    if (context.state === "suspended") void context.resume();
    const now = context.currentTime;

    SOUNDS[sound].forEach((note) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = note.type ?? "sine";
      oscillator.frequency.setValueAtTime(note.frequency, now + note.start);
      gain.gain.setValueAtTime(0.0001, now + note.start);
      gain.gain.exponentialRampToValueAtTime(0.028, now + note.start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now + note.start);
      oscillator.stop(now + note.start + note.duration + 0.02);
    });
  } catch {
    // Sound is an enhancement only; Kymia must remain fully usable without it.
  }
}
