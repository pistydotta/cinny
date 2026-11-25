import * as THREE from 'three';

// Clips the animation pack doesn't have (idle, run, kick), made here from rotations of the
// mannequin's bones. A rotation is given in the model's own axes (+x its left, +y up, +z
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

  return { idle, run, kick, ready, raise };
};
