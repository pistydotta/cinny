import * as THREE from 'three';
import { PickupKind } from '../engine/types';
import { ball, box, cone, figure, paint } from './models';

// What lies on the ground to pick up. Each kind has its own shape, so it reads at a glance even
// in the low resolution: experience is a crystal, gold a coin that spins, health a heart, an
// elite's chest a little chest under a beam of light. Models are centred on y = 0; the scene
// floats them over the ground. Experience is white here and tinted per gem by its value.
//
// Their light is painted into the colors (`bake`) and drawn unlit, so drops keep their colors
// at night and in the fog, where the player still has to find them.

const GOLD = 0xffc83a;
const GOLD_DARK = 0xb97a10;
const GOLD_LIGHT = 0xfff0a0;

const LIGHT = new THREE.Vector3(-0.45, 0.8, 0.55).normalize();

const bake = (geometry: THREE.BufferGeometry): THREE.BufferGeometry => {
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const color = geometry.attributes.color as THREE.BufferAttribute;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 3) {
    a.fromBufferAttribute(position, i);
    b.fromBufferAttribute(position, i + 1).sub(a);
    c.fromBufferAttribute(position, i + 2).sub(a);
    const light = 0.62 + 0.5 * Math.max(0, b.cross(c).normalize().dot(LIGHT));
    for (let k = i; k < i + 3; k += 1) {
      color.setXYZ(
        k,
        Math.min(1, color.getX(k) * light),
        Math.min(1, color.getY(k) * light),
        Math.min(1, color.getZ(k) * light)
      );
    }
  }
  return geometry;
};

const cylinder = (
  radius: number,
  depth: number,
  sides: number,
  color: number,
  at: [number, number, number] = [0, 0, 0]
): THREE.BufferGeometry =>
  // Lying on its side, a face towards +z.
  paint(new THREE.CylinderGeometry(radius, radius, depth, sides), color)
    .rotateX(Math.PI / 2)
    .translate(...at);

// A pixel drawing turned into blocks, one row per string, `X` filled: the heart is drawn this
// way so it keeps the same chunky outline as the icons.
const blocks = (rows: string[], size: number, depth: number, color: number) => {
  const parts: THREE.BufferGeometry[] = [];
  const width = rows[0].length;
  rows.forEach((row, r) => {
    const y = ((rows.length - 1) / 2 - r) * size;
    let start = -1;
    for (let c = 0; c <= width; c += 1) {
      const filled = row[c] === 'X';
      if (filled && start < 0) start = c;
      if (!filled && start >= 0) {
        const x = ((start + c - 1) / 2 - (width - 1) / 2) * size;
        parts.push(box((c - start) * size, size, depth, color, { at: [x, y, 0] }));
        start = -1;
      }
    }
  });
  return parts;
};

const crystal = () =>
  figure(
    [
      cone(0.2, 0.34, 6, 0xffffff, { at: [0, 0.17, 0] }),
      cone(0.2, 0.3, 6, 0x9a9a9a, { at: [0, -0.15, 0], rot: [Math.PI, 0, 0] }),
    ],
    [box(0.05, 0.16, 0.05, 0xffffff, { at: [0.08, 0.12, 0.13] })],
    0.035
  );

const coin = () =>
  figure(
    [cylinder(0.34, 0.09, 14, GOLD_DARK)],
    [
      cylinder(0.27, 0.11, 14, GOLD),
      // A diamond stamped on both faces, with a glint.
      box(0.17, 0.17, 0.14, GOLD_LIGHT, { rot: [0, 0, Math.PI / 4] }),
      box(0.05, 0.14, 0.12, 0xffffff, { at: [-0.16, 0.08, 0], rot: [0, 0, -0.5] }),
    ],
    0.035
  );

const heart = () =>
  figure(
    blocks(['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'], 0.1, 0.2, 0xff2a4a),
    [
      box(0.1, 0.1, 0.22, 0xffc2cc, { at: [-0.2, 0.15, 0] }),
      box(0.1, 0.1, 0.22, 0xff7a8c, { at: [-0.1, 0.05, 0] }),
    ],
    0.035
  );

const chest = () =>
  figure(
    [
      box(0.74, 0.4, 0.5, 0x6e3a18, { at: [0, -0.1, 0] }),
      box(0.78, 0.2, 0.54, 0x8f4e22, { at: [0, 0.2, 0] }),
      box(0.12, 0.62, 0.56, GOLD, { at: [-0.24, 0, 0] }),
      box(0.12, 0.62, 0.56, GOLD, { at: [0.24, 0, 0] }),
    ],
    [box(0.14, 0.16, 0.06, GOLD_LIGHT, { at: [0, 0.04, 0.28] })],
    0.04
  );

const magnet = () =>
  figure(
    [
      box(0.14, 0.4, 0.16, 0xe8283a, { at: [-0.17, 0.02, 0] }),
      box(0.14, 0.4, 0.16, 0xe8283a, { at: [0.17, 0.02, 0] }),
      box(0.48, 0.14, 0.16, 0xe8283a, { at: [0, 0.22, 0] }),
      box(0.14, 0.12, 0.16, 0xdfe6ee, { at: [-0.17, -0.22, 0] }),
      box(0.14, 0.12, 0.16, 0xdfe6ee, { at: [0.17, -0.22, 0] }),
    ],
    [],
    0.035
  );

const bomb = () =>
  figure(
    [
      ball(0.28, 0x2b2b33, { at: [0, -0.05, 0] }),
      box(0.14, 0.1, 0.14, 0x70707a, { at: [0, 0.25, 0] }),
      box(0.04, 0.16, 0.04, 0xc8a070, { at: [0.04, 0.36, 0], rot: [0, 0, -0.5] }),
    ],
    [ball(0.07, 0xffc02a, { at: [0.1, 0.45, 0] })],
    0.035
  );

const rage = () => {
  const spikes = [0, 1, 2, 3, 4, 5].map((i) => {
    const a = (i / 6) * Math.PI * 2;
    return cone(0.09, 0.2, 4, 0x9a1010, {
      at: [Math.sin(a) * 0.27, Math.cos(a) * 0.27, 0],
      rot: [0, 0, -a],
    });
  });
  return figure(
    [ball(0.24, 0xff3030), ...spikes],
    [
      box(0.08, 0.05, 0.05, 0xfff2b0, { at: [-0.09, 0.05, 0.22], rot: [0, 0, -0.4] }),
      box(0.08, 0.05, 0.05, 0xfff2b0, { at: [0.09, 0.05, 0.22], rot: [0, 0, 0.4] }),
    ],
    0.03
  );
};

// A snowflake: three bars crossed, with a tip on each arm.
const ice = () =>
  figure(
    [0, 1, 2].map((i) => box(0.1, 0.7, 0.1, 0x8fe8ff, { rot: [0, 0, (i * Math.PI) / 3] })),
    [
      box(0.16, 0.16, 0.14, 0xeafcff, { rot: [0, 0, Math.PI / 4] }),
      ...[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i * Math.PI) / 3;
        return box(0.08, 0.08, 0.12, 0xeafcff, {
          at: [Math.sin(a) * 0.3, Math.cos(a) * 0.3, 0],
          rot: [0, 0, Math.PI / 4],
        });
      }),
    ],
    0.035
  );

const star = () => {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? 0.36 : 0.15;
    const a = (i / 10) * Math.PI * 2;
    if (i === 0) shape.moveTo(Math.sin(a) * r, Math.cos(a) * r);
    else shape.lineTo(Math.sin(a) * r, Math.cos(a) * r);
  }
  const solid = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false });
  solid.translate(0, 0, -0.06);
  return figure([paint(solid, 0xffe23a)], [], 0.04);
};

const moneyBag = () =>
  figure(
    [
      ball(0.28, 0xc8955a, { at: [0, -0.08, 0] }),
      box(0.16, 0.12, 0.16, 0xb07f48, { at: [0, 0.22, 0] }),
      box(0.22, 0.06, 0.2, GOLD, { at: [0, 0.16, 0] }),
      cylinder(0.12, 0.05, 10, GOLD, [0, -0.06, 0.27]),
    ],
    [],
    0.035
  );

const MODELS: Record<PickupKind, () => THREE.BufferGeometry> = {
  xp: crystal,
  gold: coin,
  heart,
  magnet,
  chest,
  bomb,
  rage,
  freeze: ice,
  star,
  goldrain: moneyBag,
};

export const pickupGeometry = (kind: PickupKind): THREE.BufferGeometry => bake(MODELS[kind]());

export const PICKUP_KINDS = Object.keys(MODELS) as PickupKind[];

// The color of each kind's glow on the ground and its sparkle when picked up.
export const PICKUP_GLOW: Record<PickupKind, number> = {
  xp: 0x38c8ff,
  gold: 0xffc83a,
  heart: 0xff3a5a,
  magnet: 0xff5a5a,
  chest: 0xffb84a,
  bomb: 0xff9a2a,
  rage: 0xff3030,
  freeze: 0x8fe8ff,
  star: 0xfff27a,
  goldrain: 0xffc83a,
};

// Experience by size: the common blue, the green of tougher enemies, and the purple of a boss
// or of many gems grown into one.
export const xpTint = (value: number): number => {
  if (value >= 20) return 0xc65aff;
  if (value >= 3) return 0x4dff7a;
  return 0x38c8ff;
};

export const xpScale = (value: number): number => {
  if (value >= 20) return 1.5 + Math.min(0.5, value / 400);
  if (value >= 3) return 1.15;
  return 0.9;
};

// A soft round light, for the glow under each drop and the chest's beam.
export const glowTexture = (vertical = false): THREE.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const g = canvas.getContext('2d') as CanvasRenderingContext2D;
  const gradient = vertical
    ? g.createLinearGradient(0, 64, 0, 0)
    : g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(vertical ? 0.25 : 0.35, 'rgba(255,255,255,0.45)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gradient;
  g.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};
