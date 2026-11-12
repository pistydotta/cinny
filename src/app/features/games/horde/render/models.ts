import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { EnemyKind } from '../engine/types';

// Every model is a handful of boxes and cones with flat colors per vertex, built in code: the
// low-poly look of an old console, and nothing to download. Feet stand on y = 0, front is +z.

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

export const enemyGeometry = (kind: EnemyKind): THREE.BufferGeometry => {
  switch (kind) {
    case 'charger':
      // A low, heavy body with a horn: it runs at you in a straight line.
      return merge([
        box(1.0, 0.8, 1.3, 0x7a5a3a, { at: [0, 0.75, 0] }),
        box(0.6, 0.5, 0.5, 0x8c6a46, { at: [0, 0.95, 0.75] }),
        cone(0.14, 0.6, 4, 0xe8dcc0, { at: [0, 1.1, 1.15], rot: [Math.PI / 2.4, 0, 0] }),
        box(0.25, 0.4, 0.25, 0x4d3824, { at: [-0.35, 0.2, 0.4] }),
        box(0.25, 0.4, 0.25, 0x4d3824, { at: [0.35, 0.2, 0.4] }),
        box(0.25, 0.4, 0.25, 0x4d3824, { at: [-0.35, 0.2, -0.4] }),
        box(0.25, 0.4, 0.25, 0x4d3824, { at: [0.35, 0.2, -0.4] }),
        box(0.08, 0.06, 0.04, EYE, { at: [-0.15, 1.05, 1.01] }),
        box(0.08, 0.06, 0.04, EYE, { at: [0.15, 1.05, 1.01] }),
      ]);
    case 'bomber':
      // A walking bomb with a lit fuse.
      return merge([
        ball(0.5, 0x2b2b30, { at: [0, 0.75, 0] }),
        box(0.12, 0.3, 0.12, 0x8a6a3a, { at: [0, 1.35, 0] }),
        cone(0.1, 0.22, 4, 0xff5a2a, { at: [0, 1.6, 0] }),
        box(0.14, 0.35, 0.14, 0x1c1c20, { at: [-0.2, 0.15, 0] }),
        box(0.14, 0.35, 0.14, 0x1c1c20, { at: [0.2, 0.15, 0] }),
        box(0.1, 0.08, 0.04, 0xff3a2a, { at: [-0.13, 0.85, 0.47] }),
        box(0.1, 0.08, 0.04, 0xff3a2a, { at: [0.13, 0.85, 0.47] }),
      ]);
    case 'shield':
      // A soldier behind a big riot shield: hit it from behind or with an area.
      return merge([
        box(0.7, 0.9, 0.45, 0x4a5a6a, { at: [0, 0.95, -0.1] }),
        box(0.45, 0.42, 0.42, 0x6a7a8a, { at: [0, 1.6, -0.1] }),
        box(1.3, 1.6, 0.12, 0x9ab0c8, { at: [0, 1.0, 0.45] }),
        box(1.1, 0.12, 0.14, 0x3a4a5a, { at: [0, 1.4, 0.46] }),
        box(0.24, 0.5, 0.26, 0x2e3a46, { at: [-0.2, 0.25, -0.1] }),
        box(0.24, 0.5, 0.26, 0x2e3a46, { at: [0.2, 0.25, -0.1] }),
      ]);
    case 'summoner':
      // A robed caller with a glowing orb, keeping its distance.
      return merge([
        cone(0.6, 1.8, 6, 0x4a2a6a, { at: [0, 0.9, 0] }),
        ball(0.3, 0x6a3a8a, { at: [0, 1.95, 0] }),
        ball(0.22, 0x8ae6ff, { at: [0.45, 2.1, 0.3] }),
        box(0.08, 0.06, 0.04, EYE, { at: [-0.1, 2.0, 0.28] }),
        box(0.08, 0.06, 0.04, EYE, { at: [0.1, 2.0, 0.28] }),
      ]);
    case 'swarm':
      return merge([
        box(0.34, 0.24, 0.42, 0x8a9a3a, { at: [0, 0.3, 0] }),
        box(0.5, 0.04, 0.2, 0xc8d870, { at: [0, 0.45, -0.05] }),
        box(0.06, 0.05, 0.04, 0xff3a2a, { at: [-0.07, 0.36, 0.22] }),
        box(0.06, 0.05, 0.04, 0xff3a2a, { at: [0.07, 0.36, 0.22] }),
      ]);
    case 'barrel':
      return merge([
        box(0.9, 1.1, 0.9, 0xb03a2a, { at: [0, 0.55, 0] }),
        box(0.96, 0.12, 0.96, 0x3a3a40, { at: [0, 0.3, 0] }),
        box(0.96, 0.12, 0.96, 0x3a3a40, { at: [0, 0.85, 0] }),
        box(0.4, 0.3, 0.06, 0xf2c230, { at: [0, 0.6, 0.47] }),
      ]);
    case 'pot':
      return merge([
        ball(0.45, 0xa8683a, { at: [0, 0.45, 0] }),
        box(0.3, 0.2, 0.3, 0x8a5430, { at: [0, 0.9, 0] }),
        box(0.36, 0.06, 0.36, 0x6a4024, { at: [0, 1.0, 0] }),
      ]);
    case 'runner':
      return merge([
        box(0.42, 0.6, 0.34, 0x7a3fa8, { at: [0, 0.62, 0.05], rot: [0.35, 0, 0] }),
        box(0.36, 0.34, 0.36, 0x9a5fd0, { at: [0, 1.05, 0.22] }),
        cone(0.08, 0.3, 4, 0x4a2468, { at: [-0.14, 1.34, 0.2] }),
        cone(0.08, 0.3, 4, 0x4a2468, { at: [0.14, 1.34, 0.2] }),
        box(0.12, 0.4, 0.12, 0x4a2468, { at: [-0.13, 0.2, 0] }),
        box(0.12, 0.4, 0.12, 0x4a2468, { at: [0.13, 0.2, 0] }),
        box(0.08, 0.06, 0.04, EYE, { at: [-0.09, 1.08, 0.41] }),
        box(0.08, 0.06, 0.04, EYE, { at: [0.09, 1.08, 0.41] }),
      ]);
    case 'brute':
      return merge([
        box(1.5, 1.3, 1.0, 0x8a3b2c, { at: [0, 1.15, 0] }),
        box(0.6, 0.5, 0.55, 0xa85040, { at: [0, 2.0, 0.2] }),
        cone(0.14, 0.55, 4, 0xe8dcc0, { at: [-0.36, 2.35, 0.2], rot: [0, 0, 0.5] }),
        cone(0.14, 0.55, 4, 0xe8dcc0, { at: [0.36, 2.35, 0.2], rot: [0, 0, -0.5] }),
        box(0.48, 1.1, 0.48, 0x6e2c20, { at: [-1.0, 1.0, 0.15] }),
        box(0.48, 1.1, 0.48, 0x6e2c20, { at: [1.0, 1.0, 0.15] }),
        box(0.5, 0.5, 0.5, 0x4d1d15, { at: [-0.4, 0.25, 0] }),
        box(0.5, 0.5, 0.5, 0x4d1d15, { at: [0.4, 0.25, 0] }),
        box(0.12, 0.08, 0.04, EYE, { at: [-0.15, 2.05, 0.48] }),
        box(0.12, 0.08, 0.04, EYE, { at: [0.15, 2.05, 0.48] }),
      ]);
    case 'spitter':
      return merge([
        ball(0.55, 0x3f8f6a, { at: [0, 1.0, 0] }),
        box(0.22, 0.6, 0.22, 0x2a5f47, { at: [0, 0.3, 0] }),
        cone(0.2, 0.5, 5, 0xb8f25a, { at: [0, 1.05, 0.55], rot: [Math.PI / 2, 0, 0] }),
        cone(0.1, 0.4, 4, 0x2a5f47, { at: [-0.35, 1.5, 0] }),
        cone(0.1, 0.4, 4, 0x2a5f47, { at: [0.35, 1.5, 0] }),
        cone(0.1, 0.4, 4, 0x2a5f47, { at: [0, 1.6, -0.2] }),
      ]);
    case 'boss':
      return merge([
        box(2.6, 2.4, 1.8, 0x3a2030, { at: [0, 2.3, 0] }),
        box(3.4, 0.8, 1.4, 0x5a2a40, { at: [0, 3.4, 0] }),
        box(1.1, 1.0, 1.0, 0x6d3350, { at: [0, 4.2, 0.3] }),
        cone(0.28, 1.3, 4, 0xf0e2c0, { at: [-0.75, 5.0, 0.3], rot: [0, 0, 0.55] }),
        cone(0.28, 1.3, 4, 0xf0e2c0, { at: [0.75, 5.0, 0.3], rot: [0, 0, -0.55] }),
        box(0.8, 2.2, 0.8, 0x2a1622, { at: [-1.9, 2.0, 0.2] }),
        box(0.8, 2.2, 0.8, 0x2a1622, { at: [1.9, 2.0, 0.2] }),
        box(0.9, 1.1, 0.9, 0x2a1622, { at: [-0.75, 0.55, 0] }),
        box(0.9, 1.1, 0.9, 0x2a1622, { at: [0.75, 0.55, 0] }),
        box(0.26, 0.16, 0.06, 0xff5a2a, { at: [-0.27, 4.3, 0.82] }),
        box(0.26, 0.16, 0.06, 0xff5a2a, { at: [0.27, 4.3, 0.82] }),
        box(0.9, 0.5, 0.1, 0xff8a2a, { at: [0, 2.6, 0.92] }),
      ]);
    default:
      return merge([
        box(0.7, 0.8, 0.45, 0x6f8a58, { at: [0, 0.85, 0] }),
        box(0.48, 0.44, 0.44, 0x9bb57e, { at: [0, 1.5, 0.05] }),
        box(0.18, 0.2, 0.7, 0x6f8a58, { at: [-0.44, 1.05, 0.3] }),
        box(0.18, 0.2, 0.7, 0x6f8a58, { at: [0.44, 1.05, 0.3] }),
        box(0.24, 0.46, 0.26, 0x4d6040, { at: [-0.19, 0.23, 0] }),
        box(0.24, 0.46, 0.26, 0x4d6040, { at: [0.19, 0.23, 0] }),
        box(0.1, 0.08, 0.04, EYE, { at: [-0.12, 1.55, 0.28] }),
        box(0.1, 0.08, 0.04, EYE, { at: [0.12, 1.55, 0.28] }),
      ]);
  }
};

// A small noisy texture, drawn once and sampled without filtering: the grain of an old console.
export const grainTexture = (): THREE.Texture => {
  const size = 32;
  const data = new Uint8Array(size * size * 4);
  let seed = 1234567;
  for (let i = 0; i < size * size; i += 1) {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    const v = 205 + Math.floor((seed / 4294967296) * 50);
    data.set([v, v, v, 255], i * 4);
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
};
