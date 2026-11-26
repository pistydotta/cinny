import { GameEvent } from './engine/types';

// Stadium sound, synthesized with the Web Audio API (no files): the crowd's murmur, a roar for
// goals and near misses, the ref's whistle and the thud of a kick.

const noiseBuffer = (ctx: AudioContext, seconds: number): AudioBuffer => {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buf.getChannelData(0);
  // Brown-ish noise: a murmur rather than a hiss.
  let last = 0;
  for (let i = 0; i < data.length; i += 1) {
    last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04;
    data[i] = last * 3.2;
  }
  return buf;
};

// Blasts of the whistle: one to start, two at half time, three at the end.
const WHISTLES = { start: 1, restart: 0, foul: 1, half: 2, end: 3 } as const;

export class FootballAudio {
  private ctx: AudioContext;

  private master: GainNode;

  private crowd: GainNode;

  private source: AudioBufferSourceNode;

  // The context comes from the Play click (horde's unlockAudio): made later, after the stadium
  // loads, some browsers would keep it silent.
  constructor(ctx: AudioContext, volume: number) {
    this.ctx = ctx;
    this.ctx.resume().catch(() => undefined);
    this.master = this.ctx.createGain();
    this.master.gain.value = volume;
    this.master.connect(this.ctx.destination);

    this.crowd = this.ctx.createGain();
    this.crowd.gain.value = 0.18;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 700;
    filter.Q.value = 0.6;
    this.source = this.ctx.createBufferSource();
    this.source.buffer = noiseBuffer(this.ctx, 4);
    this.source.loop = true;
    this.source.connect(filter).connect(this.crowd).connect(this.master);
    this.source.start();
  }

  setVolume(volume: number): void {
    this.master.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.1);
  }

  private roar(peak: number, seconds: number) {
    const g = this.crowd.gain;
    const t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(peak, t + 0.25);
    g.linearRampToValueAtTime(0.18, t + seconds);
  }

  private whistle(blasts: number) {
    const t0 = this.ctx.currentTime;
    for (let k = 0; k < blasts; k += 1) {
      const t = t0 + k * 0.32;
      const osc = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const g = this.ctx.createGain();
      osc.frequency.value = 2900;
      lfo.frequency.value = 38;
      lfoGain.gain.value = 120;
      lfo.connect(lfoGain).connect(osc.frequency);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.02);
      g.gain.setValueAtTime(0.12, t + 0.22);
      g.gain.linearRampToValueAtTime(0, t + 0.26);
      osc.connect(g).connect(this.master);
      osc.start(t);
      lfo.start(t);
      osc.stop(t + 0.3);
      lfo.stop(t + 0.3);
    }
  }

  private kick(power: number) {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.08);
    g.gain.setValueAtTime(Math.min(0.5, 0.12 + power * 0.015), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  play(events: GameEvent[]): void {
    events.forEach((e) => {
      if (e.type === 'kick') this.kick(e.power);
      else if (e.type === 'goal') this.roar(1.1, 5);
      else if (e.type === 'post' || e.type === 'save') this.roar(0.55, 2);
      else if (e.type === 'whistle' && e.kind !== 'restart') this.whistle(WHISTLES[e.kind]);
      // Applause for a player going off, a murmur at a card.
      else if (e.type === 'sub') this.roar(0.4, 3);
      else if (e.type === 'card') this.roar(e.color === 'red' ? 0.5 : 0.32, 2);
    });
  }

  // The context is shared with the next match, so it stays open; only our nodes stop.
  dispose(): void {
    this.source.stop();
    this.master.disconnect();
  }
}
