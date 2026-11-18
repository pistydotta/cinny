import { dcos, dsin } from './dmath';
import { Rng } from './rng';
import { GameMap } from './types';

// The map: one big piece of generated land, like a world made from a seed. Layered noise decides
// how high each place is; the heights are then pressed into a few flat levels (a hollow, the
// plain, a plateau and a high plateau) with cliffs between them, and in some stretches the step
// between two levels is spread out into a slope, which is how the levels are climbed. Past the
// square the ground rises into mountains. The layout comes from the run's rng, so a seed gives the
// same map everywhere. Heights live on a grid of CELL-sized squares, each cut into two triangles,
// and both the engine and the renderer read that same surface: what you see is where you stand.

// Half the side of the playable square.
export const MAP_HALF = 200;
// The side of a square of the height grid.
export const CELL = 2;
// The grid goes on past the square, over the mountains.
export const GRID_HALF = MAP_HALF + 30;
// Points along one side of the grid.
export const GRID_SIZE = (GRID_HALF * 2) / CELL + 1;
// Where the mountains start rising, before the edge of the square.
const RIM = MAP_HALF - 6;
// The height between one level and the next.
export const LEVEL = 6.5;
// Ground steeper than this (rise over run) is a wall: it stops the hero unless already above it.
// Ground falling away as steeply under a walking hero is an edge to fall from.
export const WALL_SLOPE = 1.1;
// The hero never starts in a hole or against a cliff: around the start the land is the plain.
const START_FLAT = 14;
const START_FADE = 44;

// A number from 0 to 1 for a point of the lattice, from whole-number operations only, so every
// browser and the server agree to the last bit.
/* eslint-disable no-bitwise */
const lattice = (ix: number, iz: number): number => {
  let h = (Math.imul(ix, 374761393) + Math.imul(iz, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
/* eslint-enable no-bitwise */

const ease = (t: number): number => t * t * (3 - 2 * t);

// 0 below `a`, 1 above `b`, eased in between.
const smooth = (a: number, b: number, v: number): number => {
  if (v <= a) return 0;
  if (v >= b) return 1;
  return ease((v - a) / (b - a));
};

// Smooth noise from 0 to 1: the lattice's numbers, blended across each square.
const noise = (x: number, z: number): number => {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const tx = ease(x - ix);
  const tz = ease(z - iz);
  const a = lattice(ix, iz);
  const b = lattice(ix + 1, iz);
  const c = lattice(ix, iz + 1);
  const d = lattice(ix + 1, iz + 1);
  return a + (b - a) * tx + (c - a + (a - b - c + d) * tx) * tz;
};

// Where the noise passes each of these, the land steps up a level.
const STEPS = [0.39, 0.53, 0.64];
// The plain's place in the noise, between the hollow's step and the plateau's.
const PLAIN = 0.46;

// Half the width of the strip of ground a step between two levels takes: as a cliff (a little
// over a square of the grid, so its face comes out straight and not in saw teeth) and as a slope.
const CLIFF = 2.3;
const SLOPE = 13;

// Where a point is in the noise that shapes the land: low numbers are the hollows, high ones the
// plateaus. Broad shapes first, then smaller ones: the big ones decide where the highlands are.
const relief = (map: GameMap, x: number, z: number): number => {
  const u = x + map.ox;
  const v = z + map.oz;
  const e =
    noise(u / 76, v / 76) * 0.56 +
    noise(u / 33 + 40, v / 33 + 40) * 0.3 +
    noise(u / 14 + 90, v / 14 + 90) * 0.14;
  return PLAIN + (e - PLAIN) * smooth(START_FLAT, START_FADE, Math.sqrt(x * x + z * z));
};

// The height the generator gives a point, before it is put on the grid.
const landHeight = (map: GameMap, x: number, z: number): number => {
  const u = x + map.ox;
  const v = z + map.oz;
  const e = relief(map, x, z);
  // How fast the relief changes here, so a step is as wide on the ground wherever it falls.
  const dx = relief(map, x + 1, z) - e;
  const dz = relief(map, x, z + 1) - e;
  const change = Math.sqrt(dx * dx + dz * dz);
  // How much of a slope this stretch is: 0 keeps the steps as cliffs, 1 spreads them out.
  const slope = map.soft ? 1 : smooth(0.45, 0.6, noise(u / 41 + 300, v / 41 + 300));
  const width = Math.max(0.003, change * (CLIFF + (SLOPE - CLIFF) * slope));
  let h = -LEVEL * 0.7;
  h += LEVEL * 0.7 * smooth(STEPS[0] - width, STEPS[0] + width, e);
  h += LEVEL * smooth(STEPS[1] - width, STEPS[1] + width, e);
  h += LEVEL * smooth(STEPS[2] - width, STEPS[2] + width, e);
  // The ground is never quite flat.
  h += (noise(u / 25 + 700, v / 25 + 700) - 0.5) * 1.5 + (noise(u / 9 + 500, v / 9 + 500) - 0.5);
  const rim = Math.max(Math.abs(x), Math.abs(z)) - RIM;
  if (rim <= 0) return h;
  // A wall within a few steps, then peaks that stop climbing.
  const peaks = 1 + (noise(u / 12 + 900, v / 12 + 900) - 0.5) * Math.min(1, rim / 8) * 1.2;
  return h + Math.min(rim * rim * 0.5, 22 + rim * 0.4) * peaks;
};

// Something standing on the land that the hero can't walk through: a tree, a boulder or a fallen
// log. `size` is how tall it is drawn, `r` the circle it blocks, `top` the height up to which it
// blocks (a jump clears a boulder, never a tree), `variant` which model and `turn` how it faces.
export type ObstacleKind = 'tree' | 'rock' | 'log';
export type Obstacle = {
  kind: ObstacleKind;
  variant: number;
  x: number;
  z: number;
  r: number;
  size: number;
  top: number;
  turn: number;
};

// The side of the squares obstacles are filed under, to find the ones near a point.
const BUCKET = 8;
const BUCKETS = Math.ceil((GRID_HALF * 2) / BUCKET);
const bucketOf = (x: number, z: number): number =>
  Math.floor((z + GRID_HALF) / BUCKET) * BUCKETS + Math.floor((x + GRID_HALF) / BUCKET);

type Land = {
  obstacles: Obstacle[];
  // The obstacles in each square of BUCKET by BUCKET.
  buckets: Obstacle[][];
  // Heights at the grid's points, row by row along x.
  heights: Float64Array;
  // 1 where the hero can walk to from the start and back.
  open: Uint8Array;
  // How many points of the square are open, and how many the hero could fall into and not leave.
  openCount: number;
  traps: number;
};

const nodeAt = (ix: number, iz: number): number => iz * GRID_SIZE + ix;
const coordOf = (i: number): number => i * CELL - GRID_HALF;

// The points the hero can reach from the start, walking (never up a wall), and of those the ones
// it can walk back from.
const survey = (heights: Float64Array): Pick<Land, 'open' | 'openCount' | 'traps'> => {
  const inside = (i: number) => Math.abs(coordOf(i)) <= MAP_HALF - 2;
  const flood = (back: boolean): Uint8Array => {
    const seen = new Uint8Array(GRID_SIZE * GRID_SIZE);
    const middle = (GRID_SIZE - 1) / 2;
    const queue = [nodeAt(middle, middle)];
    seen[queue[0]] = 1;
    for (let at = 0; at < queue.length; at += 1) {
      const node = queue[at];
      const ix = node % GRID_SIZE;
      const iz = (node - ix) / GRID_SIZE;
      for (let side = 0; side < 4; side += 1) {
        const nx = ix + (side === 0 ? 1 : 0) - (side === 1 ? 1 : 0);
        const nz = iz + (side === 2 ? 1 : 0) - (side === 3 ? 1 : 0);
        const next = nodeAt(nx, nz);
        if (inside(nx) && inside(nz) && !seen[next]) {
          // Forwards the climb is from here to there; backwards, from there to here.
          const rise = back ? heights[node] - heights[next] : heights[next] - heights[node];
          if (rise / CELL < WALL_SLOPE * 0.85) {
            seen[next] = 1;
            queue.push(next);
          }
        }
      }
    }
    return seen;
  };
  const out = flood(false);
  const home = flood(true);
  let openCount = 0;
  let traps = 0;
  for (let i = 0; i < out.length; i += 1) {
    if (out[i] && !home[i]) traps += 1;
    if (out[i] && home[i]) openCount += 1;
    else out[i] = 0;
  }
  return { open: out, openCount, traps };
};

// Whether the ground around (x, z) is open to the hero and close to level, `reach` grid points
// each way.
const levelAround = (
  land: Pick<Land, 'heights' | 'open'>,
  x: number,
  z: number,
  reach: number
): boolean => {
  const ix = Math.round((x + GRID_HALF) / CELL);
  const iz = Math.round((z + GRID_HALF) / CELL);
  const h = land.heights[nodeAt(ix, iz)];
  for (let dz = -reach; dz <= reach; dz += 1) {
    for (let dx = -reach; dx <= reach; dx += 1) {
      const node = nodeAt(ix + dx, iz + dz);
      if (!land.open[node] || Math.abs(land.heights[node] - h) > 0.9) return false;
    }
  }
  return true;
};

// Whether a circle of radius `r` at (x, z) keeps `gap` away from every obstacle.
const clearOf = (buckets: Obstacle[][], x: number, z: number, r: number, gap: number): boolean => {
  const reach = Math.ceil((r + gap + 3) / BUCKET);
  const bx = Math.floor((x + GRID_HALF) / BUCKET);
  const bz = Math.floor((z + GRID_HALF) / BUCKET);
  for (let dz = -reach; dz <= reach; dz += 1) {
    for (let dx = -reach; dx <= reach; dx += 1) {
      const near = buckets[(bz + dz) * BUCKETS + bx + dx];
      if (near) {
        for (let i = 0; i < near.length; i += 1) {
          const o = near[i];
          const ox = o.x - x;
          const oz = o.z - z;
          const min = o.r + r + gap;
          if (ox * ox + oz * oz < min * min) return false;
        }
      }
    }
  }
  return true;
};

// The land's trees, boulders and logs: groves where one noise is high, on level ground the hero
// can reach, never near the start and always with room to walk between two of them. They come
// from the map's own numbers, not from the run's rng, so a saved map grows the same forest.
const plant = (
  map: GameMap,
  land: Pick<Land, 'heights' | 'open'>
): Pick<Land, 'obstacles' | 'buckets'> => {
  const obstacles: Obstacle[] = [];
  const buckets: Obstacle[][] = [];
  /* eslint-disable no-bitwise */
  let state = (Math.imul(map.ox + 1, 73856093) ^ Math.imul(map.oz + 1, 19349663)) | 0;
  const next = (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) | 0;
    return (state >>> 0) / 4294967296;
  };
  /* eslint-enable no-bitwise */
  const span = RIM - 6;
  for (let i = 0; i < 3200; i += 1) {
    const x = (next() * 2 - 1) * span;
    const z = (next() * 2 - 1) * span;
    const roll = next();
    const grow = next();
    const turn = next() * 6.2831853;
    const variant = Math.floor(next() * 4);
    const grove = noise((x + map.ox) / 34 + 1300, (z + map.oz) / 34 + 1300);
    let kind: ObstacleKind = 'tree';
    if (roll < 0.14) kind = 'rock';
    else if (roll < 0.19) kind = 'log';
    // Trees keep to the groves; boulders and logs lie anywhere.
    const wanted = kind !== 'tree' || grove > 0.5 || roll > 0.93;
    let size = 7.5 + grow * 4.5;
    let r = variant === 1 ? size * 0.11 : Math.max(0.55, size * 0.06);
    if (kind === 'rock') {
      size = 1.5 + grow * grow * 2.4;
      r = size * 0.62;
    } else if (kind === 'log') {
      size = 0.9 + grow * 0.5;
      r = size * 1.05;
    }
    if (
      wanted &&
      x * x + z * z > START_FLAT * START_FLAT &&
      levelAround(land, x, z, kind === 'tree' ? 1 : 2) &&
      clearOf(buckets, x, z, r, 3.2)
    ) {
      const ground =
        land.heights[
          nodeAt(Math.round((x + GRID_HALF) / CELL), Math.round((z + GRID_HALF) / CELL))
        ];
      const top = kind === 'tree' ? 1e9 : ground + size * 0.8;
      const obstacle: Obstacle = { kind, variant, x, z, r, size, top, turn };
      obstacles.push(obstacle);
      const at = bucketOf(x, z);
      if (!buckets[at]) buckets[at] = [];
      buckets[at].push(obstacle);
    }
  }
  return { obstacles, buckets };
};

const build = (map: GameMap): Land => {
  const heights = new Float64Array(GRID_SIZE * GRID_SIZE);
  for (let iz = 0; iz < GRID_SIZE; iz += 1) {
    for (let ix = 0; ix < GRID_SIZE; ix += 1) {
      heights[nodeAt(ix, iz)] = landHeight(map, coordOf(ix), coordOf(iz));
    }
  }
  const ground = { heights, ...survey(heights) };
  return { ...ground, ...plant(map, ground) };
};

// The grid of a map is worked out once and kept while the map object lives. A run loaded from a
// save has only the map's numbers, and its grid is made again from them.
const lands = new WeakMap<GameMap, Land>();
const landOf = (map: GameMap): Land => {
  let land = lands.get(map);
  if (!land) {
    land = build(map);
    lands.set(map, land);
  }
  return land;
};

// Each square of the grid is two triangles, cut along the diagonal whose ends are closer in
// height, so a cliff running across the grid has a straight face instead of saw teeth. True when
// the cut joins the corners at (ix + 1, iz) and (ix, iz + 1), false for the other diagonal.
export const cutAcross = (h00: number, h10: number, h01: number, h11: number): boolean =>
  Math.abs(h10 - h01) < Math.abs(h00 - h11);

// The heights at the grid's points, for drawing the very surface the engine stands things on.
export const gridHeights = (map: GameMap): Float64Array => landOf(map).heights;

export const heightAt = (map: GameMap, x: number, z: number): number => {
  const { heights } = landOf(map);
  const last = GRID_SIZE - 1;
  const fx = Math.max(0, Math.min(last - 1e-9, (x + GRID_HALF) / CELL));
  const fz = Math.max(0, Math.min(last - 1e-9, (z + GRID_HALF) / CELL));
  const ix = Math.floor(fx);
  const iz = Math.floor(fz);
  const tx = fx - ix;
  const tz = fz - iz;
  const at = nodeAt(ix, iz);
  const h00 = heights[at];
  const h10 = heights[at + 1];
  const h01 = heights[at + GRID_SIZE];
  const h11 = heights[at + GRID_SIZE + 1];
  if (cutAcross(h00, h10, h01, h11)) {
    if (tx + tz <= 1) return h00 + (h10 - h00) * tx + (h01 - h00) * tz;
    return h11 + (h01 - h11) * (1 - tx) + (h10 - h11) * (1 - tz);
  }
  if (tx >= tz) return h00 + (h10 - h00) * tx + (h11 - h10) * tz;
  return h00 + (h11 - h01) * tx + (h01 - h00) * tz;
};

// How much of the square has to be within the hero's reach for a layout to be kept.
const OPEN_ENOUGH = 0.8;
const TRIES = 20;

export const createMap = (rng: Rng): GameMap => {
  const playable = ((MAP_HALF - 2) / CELL) * 2 + 1;
  let best: GameMap | undefined;
  let bestOpen = -1;
  for (let i = 0; i < TRIES; i += 1) {
    const map: GameMap = {
      half: MAP_HALF,
      ox: Math.floor(rng.next() * 100000),
      oz: Math.floor(rng.next() * 100000),
      soft: false,
    };
    const land = landOf(map);
    // A layout is good when nowhere traps the hero and most of the square can be walked to.
    if (land.traps === 0) {
      if (land.openCount >= playable * playable * OPEN_ENOUGH) return map;
      if (land.openCount > bestOpen) {
        best = map;
        bestOpen = land.openCount;
      }
    }
  }
  // No layout without a trap: the same kind of land with every cliff turned into a slope.
  return best ?? { half: MAP_HALF, ox: Math.floor(rng.next() * 100000), oz: 0, soft: true };
};

// Whether the ground around (x, z) is open to the hero, close to level and clear of obstacles.
const standable = (map: GameMap, x: number, z: number, reach: number): boolean => {
  const land = landOf(map);
  return levelAround(land, x, z, reach) && clearOf(land.buckets, x, z, 0, 4.5);
};

// The trees, boulders and logs of a map, for drawing them where the engine has them.
export const obstaclesOf = (map: GameMap): Obstacle[] => landOf(map).obstacles;

// Where a circle of `radius` at (x, z), with its feet at `y`, ends up after being pushed out of
// the obstacles it overlaps, and the direction it was pushed in; undefined when it touches none.
export const pushOut = (
  map: GameMap,
  x: number,
  z: number,
  y: number,
  radius: number
): { x: number; z: number; nx: number; nz: number } | undefined => {
  const { buckets } = landOf(map);
  const bx = Math.floor((x + GRID_HALF) / BUCKET);
  const bz = Math.floor((z + GRID_HALF) / BUCKET);
  let out: { x: number; z: number; nx: number; nz: number } | undefined;
  let px = x;
  let pz = z;
  for (let dz = -1; dz <= 1; dz += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const near = buckets[(bz + dz) * BUCKETS + bx + dx];
      if (near) {
        for (let i = 0; i < near.length; i += 1) {
          const o = near[i];
          const ox = px - o.x;
          const oz = pz - o.z;
          const min = o.r + radius;
          const d2 = ox * ox + oz * oz;
          if (y < o.top && d2 < min * min) {
            const d = Math.sqrt(d2);
            // Dead on its middle there is no way out to prefer: east.
            const nx = d > 1e-6 ? ox / d : 1;
            const nz = d > 1e-6 ? oz / d : 0;
            px = o.x + nx * min;
            pz = o.z + nz * min;
            out = { x: px, z: pz, nx, nz };
          }
        }
      }
    }
  }
  return out;
};

// The high places worth climbing to, highest first and far from each other: where the map puts
// its best rewards.
export const highSpots = (map: GameMap, count = 8): { x: number; z: number }[] => {
  const { heights } = landOf(map);
  const nodes: number[] = [];
  const first = Math.ceil((GRID_HALF - RIM + 8) / CELL);
  for (let iz = first; iz < GRID_SIZE - first; iz += 2) {
    for (let ix = first; ix < GRID_SIZE - first; ix += 2) {
      const x = coordOf(ix);
      const z = coordOf(iz);
      if (heights[nodeAt(ix, iz)] > LEVEL * 0.7 && x * x + z * z > 40 * 40) {
        if (standable(map, x, z, 2)) nodes.push(nodeAt(ix, iz));
      }
    }
  }
  // Highest first; the grid's own order settles ties, so the result is the same everywhere.
  nodes.sort((a, b) => heights[b] - heights[a] || a - b);
  const spots: { x: number; z: number }[] = [];
  for (let i = 0; i < nodes.length && spots.length < count; i += 1) {
    const x = coordOf(nodes[i] % GRID_SIZE);
    const z = coordOf(Math.floor(nodes[i] / GRID_SIZE));
    if (spots.every((s) => Math.abs(s.x - x) + Math.abs(s.z - z) > 60)) spots.push({ x, z });
  }
  return spots;
};

// A free spot of level ground the hero can walk to, or undefined after a few tries.
export const groundSpot = (
  map: GameMap,
  rng: Rng,
  from = 8,
  to = RIM - 6
): { x: number; z: number } | undefined => {
  for (let i = 0; i < 30; i += 1) {
    const angle = rng.next() * Math.PI * 2;
    const dist = from + rng.next() * (to - from);
    const x = dcos(angle) * dist;
    const z = dsin(angle) * dist;
    if (Math.abs(x) < RIM - 4 && Math.abs(z) < RIM - 4 && standable(map, x, z, 1)) return { x, z };
  }
  return undefined;
};

// Keeps a point inside the square.
export const clampToMap = (x: number, z: number, margin = 1): { x: number; z: number } => {
  const limit = MAP_HALF - margin;
  return { x: Math.max(-limit, Math.min(limit, x)), z: Math.max(-limit, Math.min(limit, z)) };
};

// Seen from above, for tests and tools: the level of each point of the square, and what is open.
export const landSurvey = (map: GameMap): { openShare: number; traps: number } => {
  const land = landOf(map);
  const playable = ((MAP_HALF - 2) / CELL) * 2 + 1;
  return { openShare: land.openCount / (playable * playable), traps: land.traps };
};
