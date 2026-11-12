import * as THREE from 'three';
import { MAP_HALF, RAMP_OVERLAP, baseHeight } from '../engine/terrain';
import { GameMap, Mesa, Ramp } from '../engine/types';

// The map drawn from the same layout the engine stands on: the rolling ground and mountains as one
// height grid, and each mesa and ramp as its own solid, so cliffs come out straight and sharp
// (a grid would saw them). The blocks go a little into the ground, under the hills.

const BURY = -2.5;
// Where the visible cliff stands: a little into the engine's slope, where the hero stops.
const LIP = 0.25;

const hash = (a: number, b: number): number => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const paint = (
  geometry: THREE.BufferGeometry,
  color: (y: number, up: number, i: number) => THREE.Color
) => {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  flat.computeVertexNormals();
  const { position, normal } = flat.attributes;
  const colors = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i += 1) {
    const c = color(position.getY(i), normal.getY(i), Math.floor(i / 3));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  flat.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return flat;
};

const GRASS = new THREE.Color(0x56763c);
const TOP_GRASS = new THREE.Color(0x67864a);
const DIRT = new THREE.Color(0x86663f);
const ROCK = new THREE.Color(0x9a7f62);
const ROCK_DARK = new THREE.Color(0x7a6150);
const MOUNTAIN = new THREE.Color(0x4a4250);
const SNOWY = new THREE.Color(0x8a8296);
const work = new THREE.Color();

// Rock sides in layers, darker every other band, with a grass lip at the top.
const cliffColor = (top: number) => (y: number, up: number, face: number) => {
  if (up > 0.7) return work.copy(TOP_GRASS).multiplyScalar(0.92 + hash(face, top) * 0.16);
  if (y > top - 0.35) return work.copy(GRASS);
  const band = Math.floor(y / 1.1) % 2 === 0;
  return work.copy(band ? ROCK : ROCK_DARK).multiplyScalar(0.9 + hash(face, Math.floor(y)) * 0.2);
};

const mesaGeometry = (m: Mesa): THREE.BufferGeometry => {
  const w = m.w + LIP;
  const d = m.d + LIP;
  const r = Math.min(m.r + LIP, w, d);
  const shape = new THREE.Shape();
  shape.moveTo(-w + r, -d);
  shape.lineTo(w - r, -d);
  shape.quadraticCurveTo(w, -d, w, -d + r);
  shape.lineTo(w, d - r);
  shape.quadraticCurveTo(w, d, w - r, d);
  shape.lineTo(-w + r, d);
  shape.quadraticCurveTo(-w, d, -w, d - r);
  shape.lineTo(-w, -d + r);
  shape.quadraticCurveTo(-w, -d, -w + r, -d);
  const height = m.h - BURY;
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
    curveSegments: 3,
    steps: Math.max(1, Math.round(height / 1.1)),
  });
  // Extruded along z: stand it up, top at m.h.
  geometry.rotateX(-Math.PI / 2).translate(m.x, BURY, m.z);
  return paint(geometry, cliffColor(m.h));
};

const rampGeometry = (r: Ramp): THREE.BufferGeometry => {
  const dx = r.x2 - r.x1;
  const dz = r.z2 - r.z1;
  const length = Math.hypot(dx, dz);
  const sx = (-dz / length) * (r.width / 2 + LIP);
  const sz = (dx / length) * (r.width / 2 + LIP);
  // The top end goes on onto the mesa, as the engine's ramp does.
  const x2 = r.x2 + (dx / length) * RAMP_OVERLAP;
  const z2 = r.z2 + (dz / length) * RAMP_OVERLAP;
  // Corners: a, b at the bottom end, c, d at the top end; each with a top and a buried point.
  const top = [
    [r.x1 + sx, r.h1, r.z1 + sz],
    [r.x1 - sx, r.h1, r.z1 - sz],
    [x2 - sx, r.h2, z2 - sz],
    [x2 + sx, r.h2, z2 + sz],
  ];
  const low = top.map(([x, , z]) => [x, BURY, z]);
  const quads = [
    [top[0], top[1], top[2], top[3]],
    [low[0], top[0], top[3], low[3]],
    [low[2], top[2], top[1], low[1]],
    [low[3], top[3], top[2], low[2]],
  ];
  const points: number[] = [];
  // Counter-clockwise seen from outside, so every face looks out.
  quads.forEach(([a, b, c, d]) => points.push(...a, ...c, ...b, ...a, ...d, ...c));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  // The ramp's path is dirt with planks across; its sides are rock.
  return paint(geometry, (y, up, face) => {
    if (up > 0.5) return work.copy(DIRT).multiplyScalar(face % 4 < 2 ? 1 : 0.85);
    return work.copy(ROCK_DARK).multiplyScalar(0.9 + hash(face, 3) * 0.2);
  });
};

const groundGeometry = (): THREE.BufferGeometry => {
  const size = MAP_HALF * 2 + 90;
  const cells = 150;
  const geometry = new THREE.PlaneGeometry(size, size, cells, cells).rotateX(-Math.PI / 2);
  const { position } = geometry.attributes;
  const colors = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const y = baseHeight(x, z);
    position.setY(i, y);
    const patch = hash(Math.floor(x / 9), Math.floor(z / 9));
    const c = work.copy(GRASS).lerp(DIRT, patch > 0.64 ? 0.7 : hash(x, z) * 0.25);
    // The mountains: rock in layers like the cliffs, grass at their foot, pale up high.
    const rim = Math.max(Math.abs(x), Math.abs(z)) - (MAP_HALF - 6);
    if (rim > 1.5) {
      const band = Math.floor(y / 2.2) % 2 === 0;
      c.copy(band ? ROCK : ROCK_DARK)
        .lerp(MOUNTAIN, 0.12)
        .lerp(SNOWY, Math.min(1, Math.max(0, (y - 28) / 20)));
    }
    c.multiplyScalar(0.86 + hash(z, x) * 0.28);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
};

export const buildTerrain = (map: GameMap, grain: THREE.Texture) => {
  const group = new THREE.Group();
  const ground = groundGeometry();
  const blocks = [...map.mesas.map(mesaGeometry), ...map.ramps.map(rampGeometry)];
  const groundMaterial = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
    map: grain,
  });
  const blockMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  group.add(new THREE.Mesh(ground, groundMaterial));
  blocks.forEach((g) => group.add(new THREE.Mesh(g, blockMaterial)));
  return { group, disposables: [ground, ...blocks, groundMaterial, blockMaterial] };
};
