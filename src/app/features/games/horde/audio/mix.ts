// The rules of the game's sound that don't need a speaker, so they can be tested.

// In a call the game plays this much quieter: a horde shouldn't drown a friend's voice.
export const CALL_VOLUME = 0.2;

export const effectiveVolume = (volume: number, muted: boolean, inCall: boolean): number => {
  if (muted) return 0;
  const clamped = Math.min(1, Math.max(0, volume));
  return inCall ? clamped * CALL_VOLUME : clamped;
};

// How many copies of each sound may start in a short window. Two hundred hits a second would be
// noise; a few of them read as a fight.
export class VoiceLimiter {
  private starts = new Map<string, number[]>();

  allow(name: string, now: number, max: number, window: number): boolean {
    const recent = (this.starts.get(name) ?? []).filter((t) => now - t < window);
    if (recent.length >= max) {
      this.starts.set(name, recent);
      return false;
    }
    recent.push(now);
    this.starts.set(name, recent);
    return true;
  }
}

// Gems picked up in a row climb in pitch, one semitone each, up to an octave; a pause starts the
// climb over. The sound that makes collecting feel good.
export const STREAK_GAP = 0.7;
export const STREAK_TOP = 12;

// Answers, for a gem picked up at `now`, the pitch to play it at as a rate over the base note.
export const createGemStreak = () => {
  let count = 0;
  let last = -Infinity;
  return (now: number): number => {
    count = now - last > STREAK_GAP ? 0 : Math.min(STREAK_TOP, count + 1);
    last = now;
    return 2 ** (count / 12);
  };
};
