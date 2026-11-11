import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CharacterId, EnemyKind } from '../engine/types';

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

const LOOKS: Record<CharacterId, { body: number; trim: number; skin: number; cape: number }> = {
  guardian: { body: 0x8d99a8, trim: 0x3d5a80, skin: 0xe2b48c, cape: 0x2f4a6e },
  pyro: { body: 0xc2452d, trim: 0xf2a33a, skin: 0xe2b48c, cape: 0x6a1f18 },
  ranger: { body: 0x4d7a3a, trim: 0x8a6a3a, skin: 0xd9a57a, cape: 0x2e4a24 },
};

export type PlayerModel = {
  root: THREE.Group;
  legL: THREE.Mesh;
  legR: THREE.Mesh;
  armL: THREE.Mesh;
  armR: THREE.Mesh;
  body: THREE.Group;
};

export const playerModel = (character: CharacterId, material: THREE.Material): PlayerModel => {
  const look = LOOKS[character];
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const add = (geometry: THREE.BufferGeometry, parent: THREE.Object3D, y = 0, x = 0) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, 0);
    parent.add(mesh);
    return mesh;
  };
  const hat =
    character === 'pyro'
      ? cone(0.34, 0.6, 5, look.trim, { at: [0, 1.95, 0] })
      : box(0.5, 0.16, 0.5, look.trim, { at: [0, 1.75, 0] });
  add(
    merge([
      box(0.62, 0.7, 0.4, look.body, { at: [0, 1.05, 0] }),
      box(0.66, 0.12, 0.44, look.trim, { at: [0, 0.76, 0] }),
      box(0.42, 0.4, 0.4, look.skin, { at: [0, 1.5, 0] }),
      hat,
      box(0.6, 0.8, 0.08, look.cape, { at: [0, 0.95, -0.26], rot: [0.15, 0, 0] }),
    ]),
    body
  );
  // Limbs hang from their top end, so rotating one swings it.
  const limb = (w: number, h: number, color: number) => box(w, h, w, color, { at: [0, -h / 2, 0] });
  return {
    root,
    body,
    legL: add(limb(0.22, 0.7, look.trim), root, 0.7, -0.17),
    legR: add(limb(0.22, 0.7, look.trim), root, 0.7, 0.17),
    armL: add(limb(0.18, 0.6, look.body), body, 1.36, -0.42),
    armR: add(limb(0.18, 0.6, look.body), body, 1.36, 0.42),
  };
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
