import { dcos, dhypot, dsin } from './dmath';
import { Rng } from './rng';
import { GameMap, Mesa, MesaKind, Ramp } from './types';

// The map: a square of rolling ground with raised blocks on it. Mesas are flat-topped blocks with
// cliff sides; tall ones are climbed by their ramps (or a double jump on the low ones), and some
// carry a second, smaller mesa on top. Ledges are low enough to jump onto, pillars too tall and
// thin to climb. Past the square the ground rises into mountains. The layout comes from the run's
// rng, so a seed gives the same map everywhere, and both the engine and the renderer read heights
// from `heightAt`: what you see is where you stand.

// Half the side of the playable square.
export const MAP_HALF = 100;
// Width of a cliff: the ground climbs a mesa's whole height over this distance.
const EDGE = 0.6;
// Around the start nothing is raised, so a run begins on open ground.
const CLEAR = 16;
// Where the mountains start rising, before the edge of the square.
const RIM = MAP_HALF - 6;

const HILLS = (x: number, z: number): number =>
  dsin(x * 0.07) * dcos(z * 0.06) * 0.5 + dsin((x + z) * 0.03) * 0.35;

// Signed distance to a mesa's rounded rectangle: negative inside.
const mesaDistance = (m: Mesa, x: number, z: number): number => {
  const qx = Math.abs(x - m.x) - (m.w - m.r);
  const qz = Math.abs(z - m.z) - (m.d - m.r);
  const outside = dhypot(Math.max(qx, 0), Math.max(qz, 0));
  return outside + Math.min(Math.max(qx, qz), 0) - m.r;
};

const mesaHeight = (m: Mesa, x: number, z: number): number => {
  const d = mesaDistance(m, x, z);
  if (d <= 0) return m.h;
  if (d >= EDGE) return -Infinity;
  return m.h * (1 - d / EDGE);
};

// Past its top, a ramp runs on flat this far onto the mesa, so there's no seam at the cliff.
export const RAMP_OVERLAP = 1.2;

// A ramp climbs from (x1, z1) at h1 to (x2, z2), the edge of the mesa, at h2; its sides drop like
// cliffs.
const rampHeight = (r: Ramp, x: number, z: number): number => {
  const dx = r.x2 - r.x1;
  const dz = r.z2 - r.z1;
  const length = dhypot(dx, dz);
  const along = ((x - r.x1) * dx + (z - r.z1) * dz) / (length * length);
  if (along < 0 || along > 1 + RAMP_OVERLAP / length) return -Infinity;
  const side = Math.abs(((x - r.x1) * dz - (z - r.z1) * dx) / length) - r.width / 2;
  const h = r.h1 + (r.h2 - r.h1) * Math.min(1, along);
  if (side <= 0) return h;
  if (side >= EDGE) return -Infinity;
  return h * (1 - side / EDGE);
};

// The ground without the blocks: rolling hills, rising into mountains past the square.
export const baseHeight = (x: number, z: number): number => {
  const rim = Math.max(Math.abs(x), Math.abs(z)) - RIM;
  if (rim <= 0) return HILLS(x, z);
  // A wall within a few steps, then peaks that stop climbing.
  return HILLS(x, z) * (1 + Math.min(1, rim / 8) * 5) + Math.min(rim * rim * 0.5, 22 + rim * 0.4);
};

export const heightAt = (map: GameMap, x: number, z: number): number => {
  let h = baseHeight(x, z);
  for (let i = 0; i < map.mesas.length; i += 1) {
    const m = map.mesas[i];
    // Far from its box the mesa can't matter: skip the distance.
    if (Math.abs(x - m.x) < m.w + EDGE && Math.abs(z - m.z) < m.d + EDGE) {
      h = Math.max(h, mesaHeight(m, x, z));
    }
  }
  for (let i = 0; i < map.ramps.length; i += 1) h = Math.max(h, rampHeight(map.ramps[i], x, z));
  return h;
};

// Whether a box of half sizes (w, d) at (x, z) keeps clear of the start, the mountains and every
// block already placed, with `gap` of ground in between.
const fits = (map: GameMap, x: number, z: number, w: number, d: number, gap: number): boolean => {
  if (Math.abs(x) + w > RIM - 4 || Math.abs(z) + d > RIM - 4) return false;
  if (Math.abs(x) - w < CLEAR && Math.abs(z) - d < CLEAR) return false;
  const clearOfMesas = map.mesas.every(
    (m) => Math.abs(x - m.x) > w + m.w + gap || Math.abs(z - m.z) > d + m.d + gap
  );
  // A ramp's foot needs open ground too.
  return (
    clearOfMesas &&
    map.ramps.every((r) => {
      const rx = (r.x1 + r.x2) / 2;
      const rz = (r.z1 + r.z2) / 2;
      const rw = Math.abs(r.x1 - r.x2) / 2 + r.width / 2 + 2;
      const rd = Math.abs(r.z1 - r.z2) / 2 + r.width / 2 + 2;
      return Math.abs(x - rx) > w + rw || Math.abs(z - rz) > d + rd;
    })
  );
};

const SIDES: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

// A ramp down one side of a mesa, from its top to `base`, running outwards.
// A ramp down one side of a mesa, from its top to `base` (a height, or the ground's when
// undefined), running outwards from the middle of the side.
const rampFor = (m: Mesa, side: number, base: number | undefined, width = 5): Ramp => {
  const [sx, sz] = SIDES[side];
  const edge = { x: m.x + sx * m.w, z: m.z + sz * m.d };
  const guess = base ?? HILLS(edge.x, edge.z);
  const length = (m.h - guess) * 2.6;
  const x1 = edge.x + sx * length;
  const z1 = edge.z + sz * length;
  return { x1, z1, x2: edge.x, z2: edge.z, width, h1: base ?? HILLS(x1, z1), h2: m.h };
};

// Space in front of a side for a ramp: inside the square and off other blocks.
const rampFits = (map: GameMap, m: Mesa, side: number, length: number): boolean => {
  const [sx, sz] = SIDES[side];
  const x = m.x + sx * (m.w + length / 2);
  const z = m.z + sz * (m.d + length / 2);
  const w = sx ? length / 2 : 3;
  const d = sz ? length / 2 : 3;
  if (Math.abs(x) + w > RIM - 2 || Math.abs(z) + d > RIM - 2) return false;
  if (Math.abs(x) - w < CLEAR && Math.abs(z) - d < CLEAR) return false;
  return map.mesas.every(
    (o) => o === m || Math.abs(x - o.x) > w + o.w + 1 || Math.abs(z - o.z) > d + o.d + 1
  );
};

const tryPlace = (
  map: GameMap,
  rng: Rng,
  kind: MesaKind,
  size: () => [number, number],
  gap: number,
  attempts = 40
): Mesa | undefined => {
  for (let i = 0; i < attempts; i += 1) {
    const [w, d] = size();
    const x = (rng.next() * 2 - 1) * (RIM - 4 - w);
    const z = (rng.next() * 2 - 1) * (RIM - 4 - d);
    if (fits(map, x, z, w, d, gap)) return { kind, x, z, w, d, r: Math.min(w, d) * 0.4, h: 0 };
  }
  return undefined;
};

export const createMap = (rng: Rng): GameMap => {
  const map: GameMap = { half: MAP_HALF, mesas: [], ramps: [] };
  const between = (a: number, b: number) => a + rng.next() * (b - a);

  // Big mesas, each with one or two ramps; half of them carry a second mesa on top.
  for (let i = 0; i < 7; i += 1) {
    const m = tryPlace(map, rng, 'mesa', () => [between(9, 16), between(9, 16)], 22);
    // eslint-disable-next-line no-continue
    if (!m) continue;
    // Heights count from the ground where the block stands, so a low one is low on a hill too.
    m.h = HILLS(m.x, m.z) + (rng.next() < 0.5 ? 3.6 : 6);
    map.mesas.push(m);
    const first = Math.floor(rng.next() * 4);
    const sides = rng.next() < 0.6 ? [first, (first + 2) % 4] : [first];
    sides.forEach((side) => {
      if (rampFits(map, m, side, m.h * 2.6)) map.ramps.push(rampFor(m, side, undefined));
    });
    if (rng.next() < 0.5) {
      const top: Mesa = {
        kind: 'top',
        x: m.x + between(-0.25, 0.25) * m.w,
        z: m.z + between(-0.25, 0.25) * m.d,
        w: m.w * 0.42,
        d: m.d * 0.42,
        r: Math.min(m.w, m.d) * 0.15,
        h: m.h + 3,
      };
      map.mesas.push(top);
      // Its ramp runs down onto the lower top, on the side with the most room.
      const rooms = SIDES.map(([sx, sz]) =>
        sx ? m.w - sx * (top.x - m.x) - top.w : m.d - sz * (top.z - m.z) - top.d
      );
      const side = rooms.indexOf(Math.max(...rooms));
      const [sx, sz] = SIDES[side];
      if (rooms[side] > 3 * 2.6 + 1) map.ramps.push(rampFor(top, side, m.h, 4));
      else {
        // No room for a ramp: a step halfway, low enough to jump.
        const step: Mesa = {
          kind: 'step',
          x: top.x + sx * (top.w + 1.5),
          z: top.z + sz * (top.d + 1.5),
          w: sx ? 1.6 : 2.5,
          d: sz ? 1.6 : 2.5,
          r: 0.5,
          h: m.h + 1.5,
        };
        map.mesas.push(step);
      }
    }
  }
  // Ledges: low blocks to hop on and run over.
  for (let i = 0; i < 12; i += 1) {
    const m = tryPlace(map, rng, 'ledge', () => [between(3, 7), between(2, 5)], 6);
    if (m) {
      m.h = HILLS(m.x, m.z) + between(1.2, 1.9);
      map.mesas.push(m);
    }
  }
  // Pillars: tall and thin, to break the open ground.
  for (let i = 0; i < 10; i += 1) {
    const m = tryPlace(map, rng, 'pillar', () => [between(1, 2), between(1, 2)], 5);
    if (m) {
      m.h = HILLS(m.x, m.z) + between(4, 8);
      m.r = Math.min(m.w, m.d) * 0.9;
      map.mesas.push(m);
    }
  }
  return map;
};

// The tops worth climbing to, highest first: where the map puts its best rewards.
// A mesa with another standing on its middle doesn't count: the one on top does.
export const mesaTops = (map: GameMap): Mesa[] =>
  map.mesas
    .filter(
      (m) =>
        (m.kind === 'mesa' || m.kind === 'top') &&
        !map.mesas.some((o) => o.h > m.h && Math.abs(o.x - m.x) < o.w && Math.abs(o.z - m.z) < o.d)
    )
    .sort((a, b) => b.h - a.h);

// A free spot on the open ground (not on or against a block), or undefined after a few tries.
export const groundSpot = (
  map: GameMap,
  rng: Rng,
  from = 8,
  to = RIM - 6
): { x: number; z: number } | undefined => {
  for (let i = 0; i < 20; i += 1) {
    const angle = rng.next() * Math.PI * 2;
    const dist = from + rng.next() * (to - from);
    const x = dcos(angle) * dist;
    const z = dsin(angle) * dist;
    if (Math.abs(x) < RIM - 4 && Math.abs(z) < RIM - 4 && heightAt(map, x, z) < 1) {
      const clear = map.mesas.every((m) => mesaDistance(m, x, z) > 2.5);
      if (clear) return { x, z };
    }
  }
  return undefined;
};

// Keeps a point inside the square.
export const clampToMap = (x: number, z: number, margin = 1): { x: number; z: number } => {
  const limit = MAP_HALF - margin;
  return { x: Math.max(-limit, Math.min(limit, x)), z: Math.max(-limit, Math.min(limit, z)) };
};
