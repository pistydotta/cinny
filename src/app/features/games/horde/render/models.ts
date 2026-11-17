import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { EnemyKind } from '../engine/types';

// Every model is a handful of boxes and cones with flat colors per vertex, built in code: the
// low-poly look of an old console, and nothing to download. Feet stand on y = 0, front is +z.
// Enemies get a dark outline and two frames of a walk; their themes are placeholders.

const paint = (geometry: THREE.BufferGeometry, color: number): THREE.BufferGeometry => {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  const { count } = flat.attributes.position;
  const c = new THREE.Color(color);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    // A little darker towards the feet, so shapes read without any texture.
    const shade = 0.78 + 0.22 * Math.min(1, Math.max(0, flat.attributes.position.getY(i) + 0.5));
    colors[i * 3] = c.r * shade;
    colors[i * 3 + 1] = c.g * shade;
    colors[i * 3 + 2] = c.b * shade;
  }
  flat.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  flat.deleteAttribute('uv');
  return flat;
};

type Place = { at?: [number, number, number]; rot?: [number, number, number] };

const place = (geometry: THREE.BufferGeometry, { at, rot }: Place): THREE.BufferGeometry => {
  if (rot)
    geometry.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rot)));
  if (at) geometry.translate(...at);
  return geometry;
};

export const box = (
  w: number,
  h: number,
  d: number,
  color: number,
  where: Place = {}
): THREE.BufferGeometry => place(paint(new THREE.BoxGeometry(w, h, d), color), where);

export const cone = (
  radius: number,
  height: number,
  sides: number,
  color: number,
  where: Place = {}
): THREE.BufferGeometry =>
  place(paint(new THREE.ConeGeometry(radius, height, sides), color), where);

export const ball = (radius: number, color: number, where: Place = {}): THREE.BufferGeometry =>
  place(paint(new THREE.IcosahedronGeometry(radius, 0), color), where);

export const merge = (parts: THREE.BufferGeometry[]): THREE.BufferGeometry => {
  const merged = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  merged.computeVertexNormals();
  return merged;
};

const EYE = 0xffd23a;
const BONE = 0xe8dcc0;
const OUTLINE = 0x15111c;

// A dark shell around a part, a little bigger and inside out, so only its far side is drawn:
// the outline that keeps a shape readable in the middle of a crowd, with no second draw call.
const hull = (part: THREE.BufferGeometry, thick: number): THREE.BufferGeometry => {
  const shell = part.clone();
  shell.computeBoundingBox();
  const bounds = shell.boundingBox as THREE.Box3;
  const center = bounds.getCenter(new THREE.Vector3());
  const half = bounds.getSize(new THREE.Vector3()).multiplyScalar(0.5);
  const grow = (h: number) => (h + thick) / Math.max(h, 0.001);
  const gx = grow(half.x);
  const gy = grow(half.y);
  const gz = grow(half.z);
  const { position } = shell.attributes;
  const c = new THREE.Color(OUTLINE);
  const colors = new Float32Array(position.count * 3);
  const xyz = position.array as Float32Array;
  for (let i = 0; i < position.count; i += 1) {
    xyz[i * 3] = center.x + (xyz[i * 3] - center.x) * gx;
    xyz[i * 3 + 1] = center.y + (xyz[i * 3 + 1] - center.y) * gy;
    xyz[i * 3 + 2] = center.z + (xyz[i * 3 + 2] - center.z) * gz;
    colors.set([c.r, c.g, c.b], i * 3);
  }
  // Swapping two corners of every triangle turns it to face inwards.
  for (let i = 0; i < position.count; i += 3) {
    for (let k = 0; k < 3; k += 1) {
      const a = (i + 1) * 3 + k;
      const b = (i + 2) * 3 + k;
      const kept = xyz[a];
      xyz[a] = xyz[b];
      xyz[b] = kept;
    }
  }
  shell.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return shell;
};

// A model: `body` parts get the outline, `details` (eyes, glows) don't.
const figure = (
  body: THREE.BufferGeometry[],
  details: THREE.BufferGeometry[] = [],
  thick = 0.045
): THREE.BufferGeometry => merge([...body.map((part) => hull(part, thick)), ...body, ...details]);

// An arm or a leg hanging from `pivot`: `swing` turns it forwards (+z), `roll` sideways. `tip`
// is a fist or a foot at its end: [size, color].
const limb = (
  w: number,
  h: number,
  d: number,
  color: number,
  pivot: [number, number, number],
  swing: number,
  roll?: number,
  tip?: [number, number]
): THREE.BufferGeometry[] => {
  const turn = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-swing, 0, roll ?? 0));
  const parts = [paint(new THREE.BoxGeometry(w, h, d), color).translate(0, -h / 2, 0)];
  if (tip)
    parts.push(paint(new THREE.BoxGeometry(tip[0], tip[0], tip[0]), tip[1]).translate(0, -h, 0));
  return parts.map((part) => part.applyMatrix4(turn).translate(...pivot));
};

const eyes = (x: number, y: number, z: number, size: number, color = EYE) => [
  box(size, size * 0.75, 0.04, color, { at: [-x, y, z] }),
  box(size, size * 0.75, 0.04, color, { at: [x, y, z] }),
];

// The two frames of a walk. Things that only stand there have one.
export const ENEMY_FRAMES = 2;

// `frame` is one of the two steps of the walk: legs and arms swap sides between them, and the
// scene shows each enemy in one or the other as time passes.
export const enemyGeometry = (kind: EnemyKind, frame = 0): THREE.BufferGeometry => {
  const s = frame === 0 ? 1 : -1;
  switch (kind) {
    case 'charger':
      // A low, heavy beast with its head down and horns forward: it runs at you in a line.
      return figure(
        [
          box(1.0, 0.8, 1.35, 0x7a5a3a, { at: [0, 0.88, 0] }),
          box(0.8, 0.3, 0.65, 0x64482c, { at: [0, 1.36, 0.2] }),
          box(0.62, 0.52, 0.55, 0x8c6a46, { at: [0, 0.92, 0.86], rot: [0.25, 0, 0] }),
          box(0.36, 0.26, 0.22, 0x5a4028, { at: [0, 0.72, 1.18] }),
          cone(0.1, 0.6, 4, BONE, { at: [-0.34, 1.22, 1.12], rot: [Math.PI / 2.6, 0, 0.25] }),
          cone(0.1, 0.6, 4, BONE, { at: [0.34, 1.22, 1.12], rot: [Math.PI / 2.6, 0, -0.25] }),
          ...limb(0.24, 0.52, 0.24, 0x4d3824, [-0.34, 0.52, 0.45], 0.55 * s),
          ...limb(0.24, 0.52, 0.24, 0x4d3824, [0.34, 0.52, 0.45], -0.55 * s),
          ...limb(0.24, 0.52, 0.24, 0x4d3824, [-0.34, 0.52, -0.45], -0.55 * s),
          ...limb(0.24, 0.52, 0.24, 0x4d3824, [0.34, 0.52, -0.45], 0.55 * s),
          ...limb(0.08, 0.42, 0.08, 0x4d3824, [0, 1.2, -0.68], -0.6, 0.35 * s),
        ],
        eyes(0.18, 1.06, 1.15, 0.09, 0xff3a2a)
      );
    case 'bomber':
      // A walking bomb with its arms up and a lit fuse.
      return figure(
        [
          ball(0.5, 0x2b2b30, { at: [0, 0.82, 0] }),
          box(0.26, 0.12, 0.26, 0x55555e, { at: [0, 1.32, 0] }),
          box(0.08, 0.28, 0.08, 0x8a6a3a, { at: [0.04, 1.5, 0], rot: [0, 0, -0.3] }),
          ...limb(0.14, 0.4, 0.16, 0x1c1c20, [-0.2, 0.42, 0], 0.7 * s),
          ...limb(0.14, 0.4, 0.16, 0x1c1c20, [0.2, 0.42, 0], -0.7 * s),
          ...limb(0.1, 0.42, 0.1, 0x1c1c20, [-0.46, 0.95, 0], 0, -2.4 - 0.3 * s),
          ...limb(0.1, 0.42, 0.1, 0x1c1c20, [0.46, 0.95, 0], 0, 2.4 - 0.3 * s),
        ],
        [
          // The spark flickers between the two frames.
          frame === 0
            ? cone(0.12, 0.28, 4, 0xff5a2a, { at: [0.1, 1.72, 0] })
            : ball(0.15, 0xffd23a, { at: [0.1, 1.7, 0] }),
          ...eyes(0.14, 0.92, 0.47, 0.1, 0xff3a2a),
        ]
      );
    case 'shield':
      // A soldier behind a big riot shield: hit it from behind or with an area.
      return figure(
        [
          ...limb(0.24, 0.54, 0.26, 0x2e3a46, [-0.2, 0.54, -0.1], 0.4 * s),
          ...limb(0.24, 0.54, 0.26, 0x2e3a46, [0.2, 0.54, -0.1], -0.4 * s),
          box(0.72, 0.9, 0.46, 0x4a5a6a, { at: [0, 0.98, -0.1] }),
          box(0.42, 0.4, 0.42, 0xd8b090, { at: [0, 1.62, -0.1] }),
          box(0.52, 0.22, 0.52, 0x2e3a46, { at: [0, 1.84, -0.1] }),
          box(1.3, 1.6, 0.12, 0x9ab0c8, { at: [0, 1.0 + 0.03 * s, 0.45] }),
          ...limb(0.16, 0.56, 0.16, 0x4a5a6a, [0.46, 1.36, -0.1], -0.35 * s, 0.1, [0.2, 0x1c1c20]),
        ],
        [
          box(1.1, 0.12, 0.05, 0x3a4a5a, { at: [0, 1.4 + 0.03 * s, 0.52] }),
          box(1.3, 0.1, 0.05, 0x3a4a5a, { at: [0, 0.32 + 0.03 * s, 0.52] }),
        ]
      );
    case 'summoner':
      // A tall hooded caller with a staff and a glowing orb, keeping its distance.
      return figure(
        [
          cone(0.62, 1.7, 6, 0x4a2a6a, { at: [0, 0.85, 0] }),
          box(0.72, 0.3, 0.42, 0x3a2056, { at: [0, 1.56, 0] }),
          ball(0.33, 0x6a3a8a, { at: [0, 1.96, 0] }),
          box(0.07, 2.1, 0.07, 0x6a4a2e, { at: [0.62, 1.1, 0.3] }),
          ...limb(0.14, 0.62, 0.14, 0x4a2a6a, [0.42, 1.62, 0.05], 1.0, 0.3),
          ...limb(0.14, 0.62, 0.14, 0x4a2a6a, [-0.42, 1.62, 0.05], 0, -2.2 - 0.3 * s),
        ],
        [
          box(0.3, 0.24, 0.05, 0x120a1c, { at: [0, 1.94, 0.28] }),
          ...eyes(0.08, 1.96, 0.31, 0.07, 0x8ae6ff),
          ball(0.2 + 0.04 * s, 0x8ae6ff, { at: [0.62, 2.3 + 0.05 * s, 0.3] }),
        ]
      );
    case 'swarm':
      // Tiny and winged: the wings beat between the two frames.
      return figure(
        [
          box(0.34, 0.26, 0.42, 0x8a9a3a, { at: [0, 0.38, 0] }),
          box(0.26, 0.2, 0.2, 0xa8b850, { at: [0, 0.42, 0.28] }),
          box(0.44, 0.04, 0.26, 0xc8d870, { at: [-0.34, 0.5, -0.02], rot: [0, 0, -0.5 * s] }),
          box(0.44, 0.04, 0.26, 0xc8d870, { at: [0.34, 0.5, -0.02], rot: [0, 0, 0.5 * s] }),
        ],
        eyes(0.07, 0.44, 0.39, 0.06, 0xff3a2a),
        0.03
      );
    case 'barrel':
      return figure(
        [box(0.9, 1.1, 0.9, 0xb03a2a, { at: [0, 0.55, 0] })],
        [
          box(0.96, 0.12, 0.96, 0x3a3a40, { at: [0, 0.3, 0] }),
          box(0.96, 0.12, 0.96, 0x3a3a40, { at: [0, 0.85, 0] }),
          box(0.4, 0.3, 0.06, 0xf2c230, { at: [0, 0.6, 0.47] }),
        ]
      );
    case 'pot':
      return figure([
        ball(0.45, 0xa8683a, { at: [0, 0.45, 0] }),
        box(0.3, 0.2, 0.3, 0x8a5430, { at: [0, 0.9, 0] }),
        box(0.36, 0.06, 0.36, 0x6a4024, { at: [0, 1.0, 0] }),
      ]);
    case 'runner':
      // Thin, bent forward, arms trailing behind: fast and fragile.
      return figure(
        [
          ...limb(0.13, 0.5, 0.14, 0x4a2468, [-0.12, 0.5, 0], 0.8 * s),
          ...limb(0.13, 0.5, 0.14, 0x4a2468, [0.12, 0.5, 0], -0.8 * s),
          box(0.4, 0.56, 0.3, 0x7a3fa8, { at: [0, 0.74, 0.12], rot: [0.5, 0, 0] }),
          box(0.36, 0.34, 0.36, 0x9a5fd0, { at: [0, 1.1, 0.34] }),
          cone(0.08, 0.34, 4, 0x4a2468, { at: [-0.15, 1.38, 0.28], rot: [-0.4, 0, 0.3] }),
          cone(0.08, 0.34, 4, 0x4a2468, { at: [0.15, 1.38, 0.28], rot: [-0.4, 0, -0.3] }),
          ...limb(0.1, 0.5, 0.1, 0x9a5fd0, [-0.26, 0.94, 0.2], -1.1 + 0.25 * s),
          ...limb(0.1, 0.5, 0.1, 0x9a5fd0, [0.26, 0.94, 0.2], -1.1 - 0.25 * s),
        ],
        eyes(0.09, 1.12, 0.53, 0.08)
      );
    case 'brute':
      // Wide and heavy: a small head sunk between the shoulders and fists near the ground.
      return figure(
        [
          ...limb(0.52, 0.62, 0.55, 0x4d1d15, [-0.42, 0.62, 0], 0.3 * s),
          ...limb(0.52, 0.62, 0.55, 0x4d1d15, [0.42, 0.62, 0], -0.3 * s),
          box(1.6, 1.25, 1.05, 0x8a3b2c, { at: [0, 1.27, 0.05], rot: [0.12, 0, 0] }),
          box(1.05, 0.5, 0.2, 0xa85040, { at: [0, 1.05, 0.6] }),
          box(0.62, 0.5, 0.58, 0xa85040, { at: [0, 2.02, 0.3] }),
          cone(0.14, 0.6, 4, BONE, { at: [-0.4, 2.4, 0.25], rot: [0, 0, 0.6] }),
          cone(0.14, 0.6, 4, BONE, { at: [0.4, 2.4, 0.25], rot: [0, 0, -0.6] }),
          ...limb(0.5, 1.15, 0.5, 0x6e2c20, [-1.05, 1.78, 0.1], -0.35 * s, -0.12, [0.62, 0x4d1d15]),
          ...limb(0.5, 1.15, 0.5, 0x6e2c20, [1.05, 1.78, 0.1], 0.35 * s, 0.12, [0.62, 0x4d1d15]),
        ],
        [
          ...eyes(0.15, 2.07, 0.6, 0.12),
          cone(0.06, 0.2, 4, BONE, { at: [-0.18, 1.88, 0.62] }),
          cone(0.06, 0.2, 4, BONE, { at: [0.18, 1.88, 0.62] }),
        ]
      );
    case 'spitter':
      // Round and hunched, spines on its back and a snout that spits; its throat swells.
      return figure(
        [
          ...limb(0.2, 0.52, 0.22, 0x2a5f47, [-0.22, 0.52, 0], 0.45 * s),
          ...limb(0.2, 0.52, 0.22, 0x2a5f47, [0.22, 0.52, 0], -0.45 * s),
          ball(0.58, 0x3f8f6a, { at: [0, 1.02, 0] }),
          cone(0.22, 0.55, 5, 0xb8f25a, { at: [0, 1.08, 0.6], rot: [Math.PI / 2, 0, 0] }),
          ball(0.25 + 0.05 * s, 0xb8f25a, { at: [0, 0.74, 0.38] }),
          cone(0.1, 0.42, 4, 0x2a5f47, { at: [-0.32, 1.52, -0.1], rot: [-0.3, 0, 0.4] }),
          cone(0.1, 0.42, 4, 0x2a5f47, { at: [0.32, 1.52, -0.1], rot: [-0.3, 0, -0.4] }),
          cone(0.1, 0.42, 4, 0x2a5f47, { at: [0, 1.62, -0.25], rot: [-0.5, 0, 0] }),
          cone(0.1, 0.42, 4, 0x2a5f47, { at: [0, 1.3, -0.55], rot: [-1.1, 0, 0] }),
          ...limb(0.12, 0.4, 0.12, 0x2a5f47, [-0.5, 1.0, 0.2], 0.9 + 0.2 * s),
          ...limb(0.12, 0.4, 0.12, 0x2a5f47, [0.5, 1.0, 0.2], 0.9 - 0.2 * s),
        ],
        eyes(0.22, 1.3, 0.46, 0.1)
      );
    case 'boss':
      return figure(
        [
          ...limb(0.95, 1.25, 0.95, 0x2a1622, [-0.78, 1.25, 0], 0.3 * s),
          ...limb(0.95, 1.25, 0.95, 0x2a1622, [0.78, 1.25, 0], -0.3 * s),
          box(2.2, 0.6, 1.5, 0x2a1622, { at: [0, 1.45, 0] }),
          box(2.7, 2.0, 1.8, 0x3a2030, { at: [0, 2.65, 0.05], rot: [0.08, 0, 0] }),
          box(3.6, 0.8, 1.5, 0x5a2a40, { at: [0, 3.55, 0] }),
          cone(0.26, 0.85, 4, BONE, { at: [-1.6, 4.3, 0] }),
          cone(0.26, 0.85, 4, BONE, { at: [1.6, 4.3, 0] }),
          box(1.1, 1.0, 1.0, 0x6d3350, { at: [0, 4.35, 0.35] }),
          box(0.9, 0.3, 0.5, 0x4a2038, { at: [0, 3.92, 0.62] }),
          cone(0.28, 1.3, 4, BONE, { at: [-0.75, 5.1, 0.3], rot: [0, 0, 0.55] }),
          cone(0.28, 1.3, 4, BONE, { at: [0.75, 5.1, 0.3], rot: [0, 0, -0.55] }),
          ...limb(0.85, 2.2, 0.85, 0x2a1622, [-2.05, 3.55, 0.2], -0.3 * s, -0.1, [1.15, 0x4a2038]),
          ...limb(0.85, 2.2, 0.85, 0x2a1622, [2.05, 3.55, 0.2], 0.3 * s, 0.1, [1.15, 0x4a2038]),
        ],
        [
          ...eyes(0.27, 4.45, 0.87, 0.26, 0xff5a2a),
          box(0.9, 0.5, 0.1, 0xff8a2a, { at: [0, 2.6, 1.02] }),
          cone(0.08, 0.26, 4, BONE, { at: [-0.25, 4.1, 0.88] }),
          cone(0.08, 0.26, 4, BONE, { at: [0, 4.1, 0.88] }),
          cone(0.08, 0.26, 4, BONE, { at: [0.25, 4.1, 0.88] }),
        ],
        0.09
      );
    default:
      // The common walker: hunched, arms stretched out in front.
      return figure(
        [
          ...limb(0.26, 0.56, 0.28, 0x3d4a5a, [-0.19, 0.56, 0], 0.45 * s),
          ...limb(0.26, 0.56, 0.28, 0x3d4a5a, [0.19, 0.56, 0], -0.45 * s),
          box(0.72, 0.76, 0.42, 0x6f7a4e, { at: [0, 0.92, 0.05], rot: [0.18, 0, 0] }),
          box(0.5, 0.46, 0.46, 0x9bb57e, { at: [0, 1.52, 0.17] }),
          ...limb(0.18, 0.62, 0.18, 0x9bb57e, [-0.46, 1.22, 0.1], 1.35 + 0.18 * s),
          ...limb(0.18, 0.62, 0.18, 0x9bb57e, [0.46, 1.22, 0.1], 1.2 - 0.18 * s),
        ],
        [...eyes(0.12, 1.57, 0.41, 0.1), box(0.26, 0.07, 0.04, 0x2a3320, { at: [0, 1.38, 0.41] })]
      );
  }
};
