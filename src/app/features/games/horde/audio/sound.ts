import { GameEvent } from '../engine/types';
import { VoiceLimiter, createGemStreak } from './mix';

// The game's sounds, made with the Web Audio API: oscillators and noise with short envelopes,
// nothing to download. Like the renderer, it only listens to the engine's events.
//
// The AudioContext comes from the click on "Start run" (browsers only let sound play after a
// click), and a run that ends closes nothing: the context is reused by the next run.

type Wave = OscillatorType;

export class HordeAudio {
  private master: GainNode;

  private noiseBuffer: AudioBuffer;

  private limiter = new VoiceLimiter();

  private streak = createGemStreak();

  constructor(private ctx: AudioContext, volume: number) {
    this.master = ctx.createGain();
    this.master.gain.value = volume;
    this.master.connect(ctx.destination);
    // One second of white noise, played from random points for every noisy sound.
    this.noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  }

  setVolume(volume: number) {
    this.master.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.03);
  }

  dispose() {
    this.master.disconnect();
  }

  private get now(): number {
    return this.ctx.currentTime;
  }

  // A note that slides from `from` to `to` Hz and fades out over `length` seconds.
  private tone(
    from: number,
    to: number,
    length: number,
    gain: number,
    wave: Wave = 'sine',
    delay = 0
  ) {
    const start = this.now + delay;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + length);
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(gain, start + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(env).connect(this.master);
    osc.start(start);
    osc.stop(start + length + 0.02);
  }

  // A burst of filtered noise: hits, explosions, whooshes.
  private noise(
    length: number,
    gain: number,
    filter: BiquadFilterType,
    from: number,
    to = from,
    delay = 0
  ) {
    const start = this.now + delay;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const shape = this.ctx.createBiquadFilter();
    shape.type = filter;
    shape.frequency.setValueAtTime(from, start);
    shape.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + length);
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(gain, start + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, start + length);
    source.connect(shape).connect(env).connect(this.master);
    source.start(start, Math.random() * 0.5, length + 0.05);
  }

  private allow(name: string, max: number, window: number): boolean {
    return this.limiter.allow(name, this.now, max, window);
  }

  // A little random pitch, so a hundred copies of one sound don't drone.
  private static vary(freq: number, spread = 0.08): number {
    return freq * (1 + (Math.random() - 0.5) * spread * 2);
  }

  handle(events: GameEvent[]) {
    for (let i = 0; i < events.length; i += 1) this.play(events[i]);
  }

  private play(event: GameEvent) {
    const { vary } = HordeAudio;
    switch (event.type) {
      case 'hit':
        if (event.crit) {
          if (this.allow('crit', 3, 0.08)) this.tone(vary(1400), 500, 0.07, 0.07, 'square');
        } else if (this.allow('hit', 4, 0.06)) {
          this.noise(0.04, 0.09, 'highpass', vary(2400, 0.2));
        }
        break;
      case 'kill':
        if (event.kind === 'boss' || event.elite) {
          this.noise(0.6, 0.5, 'lowpass', 1200, 80);
          this.tone(140, 35, 0.7, 0.45, 'sine');
        } else if (this.allow('kill', 5, 0.08)) {
          this.noise(0.08, 0.14, 'lowpass', vary(900, 0.2), 200);
          this.tone(vary(240), 70, 0.09, 0.08, 'triangle');
        }
        break;
      case 'pickup':
        if (event.kind === 'xp') {
          if (this.allow('gem', 6, 0.05)) {
            this.tone(660 * this.streak(this.now), 900, 0.08, 0.05, 'sine');
          }
        } else if (event.kind === 'gold') {
          if (this.allow('gold', 3, 0.06)) {
            this.tone(1320, 1320, 0.05, 0.05, 'triangle');
            this.tone(1760, 1760, 0.09, 0.05, 'triangle', 0.05);
          }
        } else if (event.kind === 'heart') {
          this.tone(440, 880, 0.25, 0.12, 'sine');
        } else if (event.kind === 'chest') {
          [523, 659, 784, 1046, 1318].forEach((f, n) =>
            this.tone(f, f, 0.18, 0.1, 'triangle', n * 0.07)
          );
        } else if (event.kind === 'magnet') {
          this.tone(300, 1200, 0.35, 0.1, 'sine');
        }
        break;
      case 'levelup':
        [523, 659, 784, 1046].forEach((f, n) => this.tone(f, f, 0.22, 0.12, 'triangle', n * 0.08));
        break;
      case 'shrine':
        this.tone(880, 880, 0.9, 0.12, 'sine');
        this.tone(1320, 1320, 0.9, 0.08, 'sine', 0.05);
        break;
      case 'hurt':
        if (this.allow('hurt', 2, 0.15)) {
          this.tone(220, 90, 0.18, 0.18, 'sawtooth');
          this.noise(0.12, 0.15, 'lowpass', 1500, 300);
        }
        break;
      case 'evade':
        if (this.allow('evade', 2, 0.15)) this.noise(0.15, 0.1, 'bandpass', 600, 3000);
        break;
      case 'shieldBreak':
        this.tone(1800, 300, 0.3, 0.12, 'triangle');
        break;
      case 'blast':
        if (this.allow('blast', 3, 0.1)) {
          this.noise(0.4, 0.28, 'lowpass', 1100, 90);
          this.tone(110, 35, 0.4, 0.22, 'sine');
        }
        break;
      case 'nova':
        if (this.allow('nova', 2, 0.1)) this.tone(260, 900, 0.25, 0.12, 'sine');
        break;
      case 'bolt':
        if (this.allow('bolt', 3, 0.1)) {
          this.noise(0.16, 0.16, 'highpass', 3500, 1200);
          this.tone(vary(1600), 300, 0.12, 0.06, 'square');
        }
        break;
      case 'dash':
        this.noise(0.14, 0.14, 'bandpass', 500, 2500);
        break;
      case 'jump':
        this.tone(event.air ? 500 : 320, event.air ? 1000 : 620, 0.09, 0.06, 'sine');
        break;
      case 'land':
        if (event.speed > 9) this.noise(0.08, 0.1, 'lowpass', 500, 120);
        break;
      case 'powerup':
        [660, 880, 1100, 1320].forEach((f, n) =>
          this.tone(f, f * 1.05, 0.12, 0.1, 'square', n * 0.05)
        );
        if (event.kind === 'bomb') {
          this.noise(0.9, 0.5, 'lowpass', 1500, 60);
          this.tone(90, 30, 0.9, 0.4, 'sine');
        }
        break;
      case 'ability':
        this.noise(0.35, 0.25, 'bandpass', 300, 2500);
        this.tone(220, 880, 0.3, 0.14, 'sawtooth');
        break;
      case 'chest':
        // More notes for a bigger chest.
        [523, 659, 784, 1046, 1318, 1568, 2093]
          .slice(0, 2 + event.count)
          .forEach((f, n) => this.tone(f, f, 0.2, 0.11, 'triangle', n * 0.09));
        break;
      case 'evolve':
        [392, 523, 659, 784, 1046].forEach((f, n) =>
          this.tone(f, f * 1.01, 0.4, 0.13, 'square', n * 0.1)
        );
        this.noise(0.8, 0.2, 'highpass', 2000, 6000, 0.4);
        break;
      case 'explode':
        if (this.allow('explode', 3, 0.1)) {
          this.noise(0.3, 0.22, 'lowpass', 900, 80);
          this.tone(130, 45, 0.3, 0.16, 'sine');
        }
        break;
      case 'horde':
        // An alarm: two notes going back and forth.
        [0, 0.2, 0.4].forEach((d) => {
          this.tone(660, 660, 0.12, 0.1, 'square', d);
          this.tone(520, 520, 0.12, 0.1, 'square', d + 0.1);
        });
        break;
      case 'bossPhase':
        this.tone(90, 60, 1.2, 0.25, 'sawtooth');
        this.noise(0.6, 0.3, 'lowpass', 600, 60);
        break;
      case 'shrineDone':
        if (event.ok)
          [659, 784, 1046].forEach((f, n) => this.tone(f, f, 0.2, 0.1, 'triangle', n * 0.08));
        else this.tone(330, 220, 0.4, 0.1, 'triangle');
        break;
      case 'boss':
        // A low horn with a beat in it, and a drum.
        this.tone(110, 98, 1.6, 0.2, 'sawtooth');
        this.tone(116, 103, 1.6, 0.16, 'sawtooth');
        [0, 0.35, 0.7].forEach((d) => this.noise(0.25, 0.3, 'lowpass', 300, 60, d));
        break;
      default:
        break;
    }
  }

  // An offer opens: a sparkle for rare ones, a chord for epic ones.
  offer(rarity: 'rare' | 'epic' | 'evolve' | undefined) {
    if (!rarity) return;
    const notes = rarity === 'rare' ? [880, 1320] : [784, 988, 1318, 1568];
    notes.forEach((f, n) => this.tone(f, f, 0.3, 0.09, 'sine', n * 0.06));
  }

  // The end of a run: a fanfare or a fall.
  end(won: boolean) {
    const notes = won ? [523, 659, 784, 1046, 784, 1046] : [392, 349, 311, 262];
    notes.forEach((f, n) =>
      this.tone(f, f, won ? 0.25 : 0.35, 0.14, 'triangle', n * (won ? 0.11 : 0.2))
    );
  }
}
