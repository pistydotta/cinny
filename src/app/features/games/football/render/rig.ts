import * as THREE from 'three';

// Clips the animation pack doesn't have (idle, walk, run, kick, and the poses of the scenes in
// engine/scenes.ts: arguing, lying hurt, cheering, sitting on the bench...), made here from
// rotations of the mannequin's bones. A rotation is given in the model's own axes (+x its left, +y up, +z
// forward) and turned into each bone's local rotation, so the numbers read like a pose:
// a negative angle about x swings a leg forward, a positive one bends the knee back.
//
// Every clip writes every bone the pack's clips move, so cross-fading from a pack clip back
// to one of these leaves no bone stuck where the other one put it.

type Rest = { local: THREE.Quaternion; world: THREE.Quaternion; pos: THREE.Vector3 };
export type RigInfo = { rest: Map<string, Rest>; bones: string[] };

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

export const readRig = (root: THREE.Object3D): RigInfo => {
  root.updateMatrixWorld(true);
  const rootInv = new THREE.Quaternion();
  root.getWorldQuaternion(rootInv).invert();
  const rest = new Map<string, Rest>();
  const bones: string[] = [];
  root.traverse((o) => {
    if (!(o as THREE.Bone).isBone) return;
    if (/^(index|middle|pinky|ring|thumb)_/.test(o.name)) return;
    const world = new THREE.Quaternion();
    o.getWorldQuaternion(world);
    world.premultiply(rootInv);
    rest.set(o.name, { local: o.quaternion.clone(), world, pos: o.position.clone() });
    bones.push(o.name);
  });
  return { rest, bones };
};

// A pose: per bone, the rotation to add in model axes (applied after its parent's).
type Pose = Record<string, THREE.Quaternion>;

const rot = (axis: THREE.Vector3, deg: number) =>
  new THREE.Quaternion().setFromAxisAngle(axis, (deg * Math.PI) / 180);

// Rotations applied right to left: rx(a) after rz(b) is rx(a).multiply(rz(b)).
const rx = (deg: number) => rot(X, deg);
const ry = (deg: number) => rot(Y, deg);
const rz = (deg: number) => rot(Z, deg);

// The local rotation that puts a bone's world rotation at delta * rest.
const localFor = (r: Rest, delta: THREE.Quaternion): THREE.Quaternion =>
  r.local.clone().multiply(r.world.clone().invert()).multiply(delta).multiply(r.world);

const clipOf = (
  rig: RigInfo,
  name: string,
  duration: number,
  frames: number,
  poseAt: (t: number) => Pose
): THREE.AnimationClip => {
  const times = Array.from({ length: frames + 1 }, (_, k) => (k / frames) * duration);
  const poses = times.map((t) => poseAt(t / duration));
  const tracks: THREE.KeyframeTrack[] = rig.bones.map((bone) => {
    const r = rig.rest.get(bone) as Rest;
    const values: number[] = [];
    poses.forEach((pose) => {
      const q = pose[bone] ? localFor(r, pose[bone]) : r.local;
      values.push(q.x, q.y, q.z, q.w);
    });
    return new THREE.QuaternionKeyframeTrack(`${bone}.quaternion`, times, values);
  });
  ['root', 'pelvis'].forEach((bone) => {
    const r = rig.rest.get(bone);
    if (!r) return;
    tracks.push(
      new THREE.VectorKeyframeTrack(
        `${bone}.position`,
        [0, duration],
        [...r.pos.toArray(), ...r.pos.toArray()]
      )
    );
  });
  return new THREE.AnimationClip(name, duration, tracks);
};

// Arms hang by the sides (the mannequin's rest pose is a T), elbows a little bent.
const arms = (swingL: number, swingR: number, bend: number, spread = 0): Pose => ({
  upperarm_l: rx(swingL).multiply(rz(-72 + spread)),
  upperarm_r: rx(swingR).multiply(rz(72 - spread)),
  lowerarm_l: ry(-bend),
  lowerarm_r: ry(bend),
});

const TAU = Math.PI * 2;

export const makeClips = (rig: RigInfo): Record<string, THREE.AnimationClip> => {
  const idle = clipOf(rig, 'idle', 2.4, 24, (t) => {
    const breath = Math.sin(t * TAU);
    return {
      ...arms(3, 3, 14 + breath * 2),
      spine_02: rx(2 + breath * 1.2),
      thigh_l: rz(-3),
      thigh_r: rz(3),
    };
  });

  // One stride of each leg; the runner sets its speed from the player's.
  const run = clipOf(rig, 'run', 1, 24, (t) => {
    const a = t * TAU;
    const s = Math.sin(a);
    // The knee folds most while the leg swings back through.
    const kneeL = 25 + 70 * Math.max(0, Math.sin(a + 2.2));
    const kneeR = 25 + 70 * Math.max(0, Math.sin(a + 2.2 + Math.PI));
    return {
      ...arms(40 * s, -40 * s, 85),
      spine_01: rx(10).multiply(ry(8 * s)),
      spine_03: ry(-6 * s),
      thigh_l: rx(-42 * s - 8),
      thigh_r: rx(42 * s - 8),
      calf_l: rx(kneeL),
      calf_r: rx(kneeR),
      foot_l: rx(-10 * s),
      foot_r: rx(10 * s),
    };
  });

  // The right foot: back-lift, strike, follow through.
  const kick = clipOf(rig, 'kick', 0.42, 21, (t) => {
    const back = Math.min(1, t / 0.35);
    const strike = t < 0.35 ? 0 : Math.min(1, (t - 0.35) / 0.25);
    const settle = t < 0.7 ? 0 : (t - 0.7) / 0.3;
    const thigh = (40 * (1 - strike) - 100 * strike) * (1 - settle * 0.85);
    const knee = 95 * back * (1 - strike) + 10;
    const lift = back + strike - settle;
    return {
      ...arms(-25 * lift, 25 * lift, 30, 35 * lift),
      spine_01: rx(8 * back - 14 * strike),
      thigh_r: rx(thigh),
      calf_r: rx(knee),
      thigh_l: rx(-8),
      calf_l: rx(18),
    };
  });

  // The keeper's stance: low, hands out in front.
  const ready = clipOf(rig, 'ready', 1.2, 12, (t) => {
    const s = Math.sin(t * TAU) * 2;
    return {
      upperarm_l: rx(-35).multiply(rz(-55)),
      upperarm_r: rx(-35).multiply(rz(55)),
      lowerarm_l: ry(-35),
      lowerarm_r: ry(35),
      spine_01: rx(22 + s),
      thigh_l: rx(-30).multiply(rz(-10)),
      thigh_r: rx(-30).multiply(rz(10)),
      calf_l: rx(55),
      calf_r: rx(55),
      foot_l: rx(-25),
      foot_r: rx(-25),
    };
  });

  // The referee's card and the linesman's flag: right arm straight up, the other one down.
  const raise = clipOf(rig, 'raise', 0.4, 8, (t) => {
    const up = Math.min(1, t * 2.5);
    return {
      upperarm_l: rx(3).multiply(rz(-72)),
      upperarm_r: rz(72 - 160 * up),
      lowerarm_l: ry(-14),
      lowerarm_r: ry(4),
      spine_02: rx(-3 * up),
    };
  });

  // Strolling: a run with short steps, straight knees and loose arms.
  const walk = clipOf(rig, 'walk', 1, 24, (t) => {
    const a = t * TAU;
    const s = Math.sin(a);
    const kneeL = 6 + 38 * Math.max(0, Math.sin(a + 2.0));
    const kneeR = 6 + 38 * Math.max(0, Math.sin(a + 2.0 + Math.PI));
    return {
      ...arms(18 * s, -18 * s, 18),
      spine_01: rx(2).multiply(ry(4 * s)),
      thigh_l: rx(-24 * s - 2),
      thigh_r: rx(24 * s - 2),
      calf_l: rx(kneeL),
      calf_r: rx(kneeR),
      foot_l: rx(-6 * s),
      foot_r: rx(6 * s),
    };
  });

  // The run, with the arms held out like wings: a scorer off to celebrate.
  const airplane = clipOf(rig, 'airplane', 1, 24, (t) => {
    const a = t * TAU;
    const s = Math.sin(a);
    const kneeL = 25 + 60 * Math.max(0, Math.sin(a + 2.2));
    const kneeR = 25 + 60 * Math.max(0, Math.sin(a + 2.2 + Math.PI));
    const tilt = 12 * Math.sin(a * 0.5);
    return {
      upperarm_l: rx(10).multiply(rz(-4 + tilt)),
      upperarm_r: rx(10).multiply(rz(4 + tilt)),
      lowerarm_l: ry(-8),
      lowerarm_r: ry(8),
      spine_01: rx(6).multiply(rz(tilt * 0.6)),
      Head: rx(-10),
      thigh_l: rx(-38 * s - 8),
      thigh_r: rx(38 * s - 8),
      calf_l: rx(kneeL),
      calf_r: rx(kneeR),
    };
  });

  // The referee's whistle: right hand to the mouth.
  const whistle = clipOf(rig, 'whistle', 0.5, 10, (t) => {
    const up = Math.min(1, t * 3);
    return {
      upperarm_l: rx(3).multiply(rz(-72)),
      lowerarm_l: ry(-14),
      upperarm_r: rx(-55 * up).multiply(rz(78 - 10 * up)),
      lowerarm_r: ry(4 + 135 * up),
      Head: rx(-4 * up),
    };
  });

  // An arm straight out the way play goes (the body is turned to face it).
  const point = clipOf(rig, 'point', 0.5, 10, (t) => {
    const up = Math.min(1, t * 3);
    return {
      upperarm_l: rx(3).multiply(rz(-72)),
      lowerarm_l: ry(-14),
      upperarm_r: ry(85 * up).multiply(rz(72 * (1 - up))),
      lowerarm_r: ry(4 * (1 - up)),
      spine_01: ry(-12 * up),
    };
  });

  // "I never touched him": arms low and forward, forearms out, a shrug that comes and goes.
  // (For an arm held out, ry swings it forward and rz lowers it; rz first, as in `arms`.)
  const protest = clipOf(rig, 'protest', 1.4, 28, (t) => {
    const w = Math.sin(t * TAU);
    const out = 0.75 + 0.25 * w;
    return {
      upperarm_l: ry(-28).multiply(rz(-58 + 10 * out)),
      upperarm_r: ry(28).multiply(rz(58 - 10 * out)),
      lowerarm_l: ry(-55 - 10 * out),
      lowerarm_r: ry(55 + 10 * out),
      clavicle_l: rz(6 * out),
      clavicle_r: rz(-6 * out),
      spine_01: rx(-4 * out),
      Head: ry(10 * w).multiply(rx(-6)),
      thigh_l: rz(-4),
      thigh_r: rz(4),
    };
  });

  // Hands on the head, looking down.
  const dejected = clipOf(rig, 'dejected', 3, 24, (t) => {
    const b = Math.sin(t * TAU);
    return {
      upperarm_l: rx(-55).multiply(rz(20)),
      upperarm_r: rx(-55).multiply(rz(-20)),
      lowerarm_l: ry(-150),
      lowerarm_r: ry(150),
      spine_01: rx(8 + b * 2),
      spine_03: rx(6),
      Head: rx(28 + b * 4),
      thigh_l: rz(-3),
      thigh_r: rz(3),
    };
  });

  // Both arms up, punching the air, knees springing (the renderer lifts the body).
  const cheer = clipOf(rig, 'cheer', 0.7, 14, (t) => {
    const a = Math.sin(t * TAU);
    const k = Math.max(0, -a);
    return {
      upperarm_l: rx(-10).multiply(rz(80 + 14 * a)),
      upperarm_r: rx(-10).multiply(rz(-80 - 14 * a)),
      lowerarm_l: ry(-25 - 20 * k),
      lowerarm_r: ry(25 + 20 * k),
      spine_01: rx(-6),
      Head: rx(-14),
      thigh_l: rx(-20 * k),
      thigh_r: rx(-20 * k),
      calf_l: rx(40 * k),
      calf_r: rx(40 * k),
      foot_l: rx(-20 * k),
      foot_r: rx(-20 * k),
    };
  });

  // On the knees, chest out, arms spread back: the knee slide (the renderer lowers the body).
  const kneeslide = clipOf(rig, 'kneeslide', 1, 8, () => ({
    upperarm_l: rx(25).multiply(rz(18)),
    upperarm_r: rx(25).multiply(rz(-18)),
    lowerarm_l: ry(-10),
    lowerarm_r: ry(10),
    spine_01: rx(-18),
    spine_03: rx(-8),
    Head: rx(-22),
    thigh_l: rz(-8),
    thigh_r: rz(8),
    calf_l: rx(92),
    calf_r: rx(92),
    foot_l: rx(40),
    foot_r: rx(40),
  }));

  // Applause: the forearms fold in so the hands meet in front of the chest.
  const clap = clipOf(rig, 'clap', 0.42, 8, (t) => {
    const c = 0.5 + 0.5 * Math.cos(t * TAU);
    return {
      upperarm_l: rx(-18).multiply(rz(-74)),
      upperarm_r: rx(-18).multiply(rz(74)),
      lowerarm_l: ry(-122 - 16 * c),
      lowerarm_r: ry(122 + 16 * c),
      Head: rx(4),
    };
  });

  // A hand up and forward to slap the other's.
  const highfive = clipOf(rig, 'highfive', 0.6, 12, (t) => {
    const up = Math.min(1, t * 2.2);
    return {
      upperarm_l: rx(3).multiply(rz(-72)),
      lowerarm_l: ry(-14),
      upperarm_r: ry(55 * up).multiply(rz(72 - 120 * up)),
      lowerarm_r: ry(4 + 25 * up),
      spine_01: rx(-4 * up),
    };
  });

  // Seated on the bench, hands on the knees (the renderer lowers the body onto the seat).
  const sit = clipOf(rig, 'sit', 4, 16, (t) => {
    const b = Math.sin(t * TAU);
    return {
      upperarm_l: rx(-30).multiply(rz(-66)),
      upperarm_r: rx(-30).multiply(rz(66)),
      lowerarm_l: ry(-45),
      lowerarm_r: ry(45),
      spine_01: rx(10 + b),
      Head: ry(6 * b),
      thigh_l: rx(-88).multiply(rz(-6)),
      thigh_r: rx(-88).multiply(rz(6)),
      calf_l: rx(88),
      calf_r: rx(88),
    };
  });

  // Lying on the back holding the right shin, knees up; the renderer lays the body down and
  // rolls it. In the standing frame the hands reach forward and down to the knee.
  const down = clipOf(rig, 'down', 1.6, 16, (t) => {
    const b = Math.sin(t * TAU);
    return {
      upperarm_l: rx(40 + 6 * b).multiply(ry(-100)),
      upperarm_r: rx(40 + 6 * b).multiply(ry(80)),
      lowerarm_l: ry(-25),
      lowerarm_r: ry(25),
      spine_01: rx(22 + 4 * b),
      spine_03: rx(10),
      Head: rx(18).multiply(ry(15 * b)),
      thigh_l: rx(-30).multiply(rz(-8)),
      thigh_r: rx(-75 - 8 * b),
      calf_l: rx(45),
      calf_r: rx(105),
    };
  });

  // The fourth official: the board held up in both hands.
  const board = clipOf(rig, 'board', 2, 8, (t) => {
    const b = Math.sin(t * TAU);
    return {
      upperarm_l: rx(-30).multiply(rz(55)),
      upperarm_r: rx(-30).multiply(rz(-55)),
      lowerarm_l: ry(-55),
      lowerarm_r: ry(55),
      spine_01: rx(-3 + b),
    };
  });

  return {
    idle,
    run,
    kick,
    ready,
    raise,
    walk,
    airplane,
    whistle,
    point,
    protest,
    dejected,
    cheer,
    kneeslide,
    clap,
    highfive,
    sit,
    down,
    board,
  };
};
