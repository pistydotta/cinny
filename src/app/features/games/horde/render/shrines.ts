import * as THREE from 'three';
import { ShrineKind } from '../engine/types';
import { box, cone, figure, merge, paint } from './models';

// The shrines, one model per kind so each reads from afar: a carved totem for blessings, a dark
// obelisk for the curse, a heap of gold, a fountain, swords in the stone, the Camelô's stall,
// the Agiota's desk and the Treta's spiked pillar. Each is built in code from boxes like the
// enemies, with the same dark outline, on a stone plinth. A model has three parts: `body` is lit
// by the scene, `glow` (runes, water, fire, gold) is drawn unlit so it shines at night, and the
// `emblem` floats above, turning, until the shrine is used. Feet at y = 0.

export type ShrineModel = {
  body: THREE.BufferGeometry;
  glow: THREE.BufferGeometry;
  emblem: THREE.BufferGeometry;
};

const STONE = 0x6b6a72;
const STONE_LIGHT = 0x8a8992;
const STONE_DARK = 0x4a4952;
const WOOD = 0x7a4a22;
const WOOD_DARK = 0x5a3418;
const GOLD = 0xffc83a;
const GOLD_DARK = 0xb97a10;

const cylinder = (
  top: number,
  bottom: number,
  height: number,
  sides: number,
  color: number,
  at: [number, number, number] = [0, 0, 0]
): THREE.BufferGeometry =>
  paint(new THREE.CylinderGeometry(top, bottom, height, sides), color).translate(...at);

// The stepped stone every shrine stands on.
const plinth = (): THREE.BufferGeometry[] => [
  cylinder(1.5, 1.7, 0.3, 8, STONE_DARK, [0, 0.15, 0]),
  cylinder(1.2, 1.35, 0.3, 8, STONE, [0, 0.45, 0]),
  ...[0, 1, 2, 3].map((i) => {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    return box(0.35, 0.35, 0.35, STONE_LIGHT, {
      at: [Math.sin(a) * 1.45, 0.45, Math.cos(a) * 1.45],
    });
  }),
];

const crystal = (color: number) =>
  merge([
    cone(0.35, 0.6, 6, color, { at: [0, 0.3, 0] }),
    cone(0.35, 0.45, 6, color, { at: [0, -0.22, 0], rot: [Math.PI, 0, 0] }),
  ]);

const skull = (bone: number, eye: number) =>
  merge([
    box(0.7, 0.6, 0.6, bone, { at: [0, 0.1, 0] }),
    box(0.5, 0.25, 0.5, bone, { at: [0, -0.3, 0.02] }),
    box(0.18, 0.18, 0.08, eye, { at: [-0.16, 0.12, 0.31] }),
    box(0.18, 0.18, 0.08, eye, { at: [0.16, 0.12, 0.31] }),
  ]);

const coin = () =>
  merge([
    paint(new THREE.CylinderGeometry(0.45, 0.45, 0.12, 12), GOLD_DARK).rotateX(Math.PI / 2),
    paint(new THREE.CylinderGeometry(0.35, 0.35, 0.14, 12), GOLD).rotateX(Math.PI / 2),
  ]);

const blessing = (): ShrineModel => ({
  body: figure([
    ...plinth(),
    box(0.55, 2.2, 0.55, WOOD, { at: [0, 1.7, 0] }),
    box(0.75, 0.3, 0.75, 0x3d8bff, { at: [0, 1.2, 0] }),
    box(0.75, 0.3, 0.75, 0xffd23a, { at: [0, 2.0, 0] }),
    box(0.8, 0.55, 0.8, WOOD_DARK, { at: [0, 2.9, 0] }),
    // Wings spread from the top of the pole.
    box(1.2, 0.2, 0.3, 0xe8dcc0, { at: [-0.85, 3.0, 0], rot: [0, 0, 0.35] }),
    box(1.2, 0.2, 0.3, 0xe8dcc0, { at: [0.85, 3.0, 0], rot: [0, 0, -0.35] }),
  ]),
  glow: merge([
    box(0.2, 0.2, 0.06, 0x7fe8ff, { at: [-0.13, 2.95, 0.42] }),
    box(0.2, 0.2, 0.06, 0x7fe8ff, { at: [0.13, 2.95, 0.42] }),
  ]),
  emblem: crystal(0x6ae6ff),
});

const curse = (): ShrineModel => ({
  body: figure([
    ...plinth(),
    cylinder(0.35, 0.65, 2.6, 4, 0x2a2030, [0, 1.9, 0]),
    cone(0.4, 0.6, 4, 0x2a2030, { at: [0, 3.5, 0] }),
    skull(0xe8dcc0, 0x15111c).translate(0, 0.9, 0.9),
  ]),
  glow: merge(
    [1.3, 1.9, 2.5].map((y, i) => box(0.12, 0.3, 0.05, 0xc46aff, { at: [(i - 1) * 0.12, y, 0.48] }))
  ),
  emblem: skull(0xc46aff, 0x15111c),
});

const gold = (): ShrineModel => ({
  body: figure([...plinth(), cylinder(0.9, 1.05, 0.25, 8, STONE_LIGHT, [0, 0.72, 0])]),
  glow: merge([
    cone(0.85, 0.9, 7, GOLD, { at: [0, 1.25, 0] }),
    ...[0, 1, 2, 3, 4].map((i) => {
      const a = (i / 5) * Math.PI * 2;
      return paint(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 8), GOLD_DARK)
        .rotateZ(0.5)
        .translate(Math.sin(a) * 0.95, 0.95, Math.cos(a) * 0.95);
    }),
  ]),
  emblem: coin(),
});

const heal = (): ShrineModel => ({
  body: figure([
    ...plinth(),
    cylinder(1.0, 0.9, 0.5, 8, 0xd9d2bd, [0, 0.85, 0]),
    cylinder(0.25, 0.3, 1.3, 6, 0xd9d2bd, [0, 1.6, 0]),
    cylinder(0.55, 0.3, 0.25, 6, 0xd9d2bd, [0, 2.3, 0]),
  ]),
  glow: merge([
    cylinder(0.85, 0.85, 0.08, 8, 0x5ac8ff, [0, 1.08, 0]),
    cylinder(0.45, 0.45, 0.06, 6, 0x8fe8ff, [0, 2.42, 0]),
  ]),
  emblem: merge([box(0.25, 0.8, 0.2, 0x5aff8a), box(0.8, 0.25, 0.2, 0x5aff8a)]),
});

const sword = (x: number, lean: number) => [
  box(0.12, 1.8, 0.04, 0xc8c8d4, { at: [x, 1.6, 0], rot: [0, 0, lean] }),
  box(0.55, 0.1, 0.12, GOLD_DARK, { at: [x - lean * 0.9, 2.5, 0], rot: [0, 0, lean] }),
  box(0.1, 0.4, 0.1, WOOD_DARK, { at: [x - lean * 1.1, 2.75, 0], rot: [0, 0, lean] }),
];

const challenge = (): ShrineModel => ({
  body: figure([
    ...plinth(),
    box(1.4, 0.45, 1.0, STONE_LIGHT, { at: [0, 0.82, 0] }),
    ...sword(-0.3, 0.25),
    ...sword(0.3, -0.25),
    box(0.1, 3.0, 0.1, WOOD_DARK, { at: [1.05, 2.0, -0.5] }),
    box(0.8, 0.6, 0.05, 0xc8262a, { at: [1.45, 3.1, -0.5] }),
  ]),
  glow: merge([box(0.3, 0.3, 0.06, GOLD, { at: [1.45, 3.1, -0.46] })]),
  emblem: merge([
    box(0.14, 0.9, 0.08, 0xff5a3a, { rot: [0, 0, 0.6] }),
    box(0.14, 0.9, 0.08, 0xff5a3a, { rot: [0, 0, -0.6] }),
  ]),
});

// The Camelô: a street stall with a striped tarp and goods on the table.
const camelo = (): ShrineModel => {
  const stripes = [0, 1, 2, 3, 4].map((i) =>
    box(0.5, 0.12, 2.0, i % 2 ? 0xffffff : 0xff8a2a, {
      at: [-1.0 + i * 0.5, 2.6 + (i % 2) * 0.01, 0],
      rot: [0.18, 0, 0],
    })
  );
  const posts = [
    [-1.1, -0.8],
    [1.1, -0.8],
    [-1.1, 0.8],
    [1.1, 0.8],
  ].map(([x, z]) => box(0.12, 2.4, 0.12, WOOD_DARK, { at: [x, 1.4, z] }));
  return {
    body: figure([
      cylinder(1.6, 1.7, 0.2, 8, STONE_DARK, [0, 0.1, 0]),
      ...posts,
      ...stripes,
      box(2.2, 0.15, 1.1, WOOD, { at: [0, 1.15, 0.2] }),
      box(2.0, 0.9, 0.08, WOOD_DARK, { at: [0, 0.65, 0.72] }),
      // The goods: a speaker, a box of sneakers, phones, a cap.
      box(0.35, 0.45, 0.3, 0x2b2b33, { at: [-0.7, 1.45, 0.2] }),
      box(0.5, 0.25, 0.3, 0xff3a5a, { at: [-0.15, 1.35, 0.25] }),
      box(0.18, 0.3, 0.05, 0x1a1a22, { at: [0.35, 1.38, 0.35] }),
      box(0.18, 0.3, 0.05, 0x1a1a22, { at: [0.6, 1.38, 0.35] }),
      cone(0.22, 0.2, 6, 0x3d8bff, { at: [0.85, 1.32, 0.0] }),
    ]),
    glow: merge([
      box(0.14, 0.22, 0.02, 0x7fe8ff, { at: [0.35, 1.4, 0.38] }),
      box(0.14, 0.22, 0.02, 0x7fe8ff, { at: [0.6, 1.4, 0.38] }),
      box(0.12, 0.12, 0.02, 0x5aff8a, { at: [-0.7, 1.5, 0.36] }),
    ]),
    emblem: coin(),
  };
};

// The Agiota: a desk, a safe and stacks of money.
const agiota = (): ShrineModel => {
  const stack = (x: number, z: number, n: number) =>
    Array.from({ length: n }, (_, i) =>
      box(0.4, 0.1, 0.22, i % 2 ? 0x3fbf6a : 0x2f9f5a, { at: [x, 1.32 + i * 0.1, z] })
    );
  return {
    body: figure([
      ...plinth(),
      box(2.0, 0.15, 1.0, WOOD_DARK, { at: [0, 1.2, 0] }),
      box(0.15, 0.6, 0.9, WOOD_DARK, { at: [-0.9, 0.9, 0] }),
      box(0.15, 0.6, 0.9, WOOD_DARK, { at: [0.9, 0.9, 0] }),
      box(0.9, 1.0, 0.8, 0x2a3a30, { at: [0.45, 1.8, -0.1] }),
      ...stack(-0.5, 0.15, 4),
      ...stack(-0.5, -0.2, 2),
    ]),
    glow: merge([
      cylinder(0.18, 0.18, 0.06, 8, GOLD, [0.45, 1.85, 0.32]).rotateX(0),
      box(0.4, 0.06, 0.04, GOLD, { at: [0.45, 2.15, 0.31] }),
    ]),
    // A floating bundle of notes with a gold band.
    emblem: merge([box(0.8, 0.25, 0.45, 0x3fbf6a), box(0.18, 0.27, 0.47, GOLD)]),
  };
};

// The Treta: a black pillar with red spikes and fire on top.
const treta = (): ShrineModel => {
  const spikes = [0, 1, 2, 3, 4, 5].map((i) => {
    const a = (i / 6) * Math.PI * 2;
    return cone(0.14, 0.6, 4, 0x8f1f2a, {
      at: [Math.sin(a) * 0.55, 1.6 + (i % 2) * 0.6, Math.cos(a) * 0.55],
      rot: [Math.cos(a) * 1.2, 0, -Math.sin(a) * 1.2],
    });
  });
  return {
    body: figure([
      ...plinth(),
      box(0.8, 2.6, 0.8, 0x1c1220, { at: [0, 1.9, 0] }),
      box(1.05, 0.3, 1.05, 0x8f1f2a, { at: [0, 3.25, 0] }),
      ...spikes,
    ]),
    glow: merge([
      cone(0.45, 0.9, 5, 0xff5a2a, { at: [0, 3.85, 0] }),
      cone(0.25, 0.6, 5, 0xffd23a, { at: [0, 3.75, 0] }),
      box(0.5, 0.1, 0.05, 0xff2a3a, { at: [0, 2.2, 0.42] }),
    ]),
    emblem: merge([
      box(0.22, 0.6, 0.2, 0xff2040, { at: [0, 0.15, 0] }),
      box(0.22, 0.2, 0.2, 0xff2040, { at: [0, -0.35, 0] }),
    ]),
  };
};

const BUILDERS: Record<ShrineKind, () => ShrineModel> = {
  blessing,
  curse,
  gold,
  heal,
  challenge,
  camelo,
  agiota,
  treta,
};

// Built once per kind and shared by every shrine of that kind.
export const shrineModel = (kind: ShrineKind): ShrineModel => BUILDERS[kind]();

// How high the emblem floats over each kind.
export const EMBLEM_HEIGHT: Record<ShrineKind, number> = {
  blessing: 4.2,
  curse: 4.5,
  gold: 2.9,
  heal: 3.4,
  challenge: 4.2,
  camelo: 3.6,
  agiota: 3.1,
  treta: 5.0,
};
