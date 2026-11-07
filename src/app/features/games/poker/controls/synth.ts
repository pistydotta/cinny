import type { PokerSound } from './soundEvents';

// Synthesized table sounds: marimba for turn/win, wood knocks for check, a bouncing chip, a card tick
// and a soft gust for fold. A short room reverb keeps them from sounding like bare beeps.

type Bus = { context: AudioContext; dry: AudioNode; room: AudioNode };

function cleanup(source: AudioScheduledSourceNode, ...nodes: AudioNode[]) {
  source.addEventListener('ended', () => {
    source.disconnect();
    nodes.forEach((node) => node.disconnect());
  });
}

function route(bus: Bus, node: AudioNode) {
  node.connect(bus.dry);
  node.connect(bus.room);
}

function partial(
  bus: Bus,
  frequency: number,
  start: number,
  decay: number,
  level: number,
  drop = 1
) {
  const { context } = bus;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.setValueAtTime(frequency * drop, start);
  if (drop !== 1) oscillator.frequency.exponentialRampToValueAtTime(frequency, start + 0.012);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(level, start + 0.0015);
  gain.gain.exponentialRampToValueAtTime(0.0005, start + decay);
  oscillator.connect(gain);
  route(bus, gain);
  oscillator.start(start);
  oscillator.stop(start + decay + 0.02);
  cleanup(oscillator, gain);
}

type NoiseOptions = { attack?: number; sweep?: number; type?: BiquadFilterType; smooth?: boolean };

function noise(
  bus: Bus,
  start: number,
  decay: number,
  level: number,
  frequency: number,
  q: number,
  { attack = 0.0005, sweep, type = 'bandpass', smooth = false }: NoiseOptions = {}
) {
  const { context } = bus;
  const length = Math.ceil(context.sampleRate * (attack + decay + 0.02));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    last = smooth ? 0.6 * last + 0.4 * white : white;
    data[i] = last;
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(frequency, start);
  if (sweep) filter.frequency.exponentialRampToValueAtTime(sweep, start + attack + decay);
  const gain = context.createGain();
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(level, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0005, start + attack + decay);
  source.connect(filter);
  filter.connect(gain);
  route(bus, gain);
  source.start(start);
  cleanup(source, filter, gain);
}

function marimba(bus: Bus, frequency: number, start: number, decay: number, level: number) {
  partial(bus, frequency, start, decay, level, 1.01);
  partial(bus, frequency * 4, start, decay * 0.3, level / 2, 1.01);
  partial(bus, frequency * 9.9, start, decay * 0.12, level / 3, 1.01);
  noise(bus, start, 0.008, 0.06, frequency * 3, 1.2);
}

function knock(bus: Bus, start: number, level: number) {
  noise(bus, start, 0.012, 0.35 * level, 1400, 1);
  partial(bus, 115, start, 0.13, 0.5 * level, 1.12);
  partial(bus, 260, start, 0.07, 0.22 * level, 1.08);
  partial(bus, 430, start, 0.04, 0.1 * level, 1.05);
  noise(bus, start, 0.07, 0.25 * level, 320, 1.5);
}

// Smoothed noise in three bands, with no tonal partials: those made the chips sound metallic.
function clack(bus: Bus, start: number, level: number) {
  const p = 0.95 * (1 + (Math.random() - 0.5) * 0.15);
  noise(bus, start, 0.012, 0.9 * level, 1700 * p, 1.4, { smooth: true });
  noise(bus, start, 0.03, 0.6 * level, 700 * p, 1.1, { smooth: true });
  noise(bus, start, 0.05, 0.35 * level, 260, 1, { smooth: true, type: 'lowpass' });
}

const SOUNDS: Record<PokerSound, (bus: Bus, t: number) => void> = {
  turn: (bus, t) => {
    marimba(bus, 392, t, 0.45, 0.13);
    marimba(bus, 523, t + 0.13, 0.45, 0.12);
  },
  deal: (bus, t) => noise(bus, t, 0.04, 0.1, 3500, 1.2),
  // A chip tossed onto the table, bouncing a few times.
  chips: (bus, t) =>
    [0, 0.14, 0.24, 0.31, 0.36].forEach((offset, i) => clack(bus, t + offset, 1.2 * 0.6 ** i)),
  check: (bus, t) => {
    knock(bus, t, 1.1);
    knock(bus, t + 0.3, 0.9);
  },
  fold: (bus, t) => noise(bus, t, 0.35, 0.05, 900, 0.8, { attack: 0.12, sweep: 2600 }),
  win: (bus, t) =>
    [392, 494, 587, 784].forEach((frequency, i) => marimba(bus, frequency, t + i * 0.1, 0.6, 0.11)),
};

const rooms = new WeakMap<AudioContext, ConvolverNode>();

function roomFor(context: AudioContext, output: AudioNode) {
  let room = rooms.get(context);
  if (!room) {
    room = context.createConvolver();
    const length = Math.floor(context.sampleRate * 0.3);
    const impulse = context.createBuffer(2, length, context.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 4;
    }
    room.buffer = impulse;
    const wet = context.createGain();
    wet.gain.value = 0.2;
    room.connect(wet);
    wet.connect(output);
    rooms.set(context, room);
  }
  return room;
}

export function playPokerSound(context: AudioContext, output: AudioNode, sound: PokerSound) {
  const bus = { context, dry: output, room: roomFor(context, output) };
  SOUNDS[sound](bus, context.currentTime + 0.01);
}
