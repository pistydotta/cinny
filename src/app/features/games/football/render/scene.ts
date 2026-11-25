/* eslint-disable no-param-reassign */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import playerUrl from '../assets/player.glb?url';
import { BALL_RADIUS, HALF_LENGTH, HALF_WIDTH } from '../engine/data';
import { Kit, keeperKit } from '../engine/teams';
import { Action, MatchState, Player } from '../engine/types';
import { CAMERA, Graphics, QUALITY, Quality } from '../options';
import { kitMaterial } from './kit';
import { makeClips, readRig } from './rig';
import { buildStadium } from './stadium';

// Draws a match with three.js: the stadium, 22 mannequins in their kits and the ball, from a
// TV camera on the near touchline that follows play. The only part of the game that imports
// three.js; it reads the match and never changes it.
//
// The mannequin and its pack clips are Quaternius' Universal Animation Library 2 (CC0), cut
// down to what football uses (see docs/football.md); idle, run and kick are made in rig.ts.

type Body = {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  actions: Record<string, THREE.AnimationAction>;
  current: string;
  lastAction: Action;
};

// Which clip each move plays, and whether it plays once.
const MOVE_CLIPS: Partial<Record<Action, { clip: string; once: boolean; speed?: number }>> = {
  kick: { clip: 'kick', once: true },
  slide: { clip: 'Slide_Start', once: true, speed: 1.3 },
  dive: { clip: 'NinjaJump_Start', once: true, speed: 1.4 },
  fall: { clip: 'Hit_Knockback', once: true, speed: 1.2 },
  celebrate: { clip: 'Yes', once: false },
  throw: { clip: 'OverhandThrow', once: true, speed: 1.5 },
};

// Starts a clip on a body, fading from the one it plays; a looping clip already playing only
// changes speed.
const playClip = (body: Body, name: string, once: boolean, speed = 1) => {
  const next = body.actions[name];
  if (!next) return;
  if (body.current === name && !once) {
    next.timeScale = speed;
    return;
  }
  const prev = body.actions[body.current];
  next.reset();
  next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
  next.clampWhenFinished = once;
  next.timeScale = speed;
  next.play();
  if (prev && prev !== next) prev.crossFadeTo(next, 0.12, false);
  body.current = name;
};

// Picks the clip for what the player is doing: a move's own clip, the run at a pace that
// matches the feet to the ground, or standing.
const animate = (body: Body, p: Player, dt: number) => {
  const speed = Math.hypot(p.vx, p.vz);
  const move = MOVE_CLIPS[p.action];
  if (move) {
    if (body.lastAction !== p.action) playClip(body, move.clip, move.once, move.speed);
  } else if (speed > 0.5) {
    // About 2.2 m per stride cycle at a jog, longer when sprinting.
    playClip(body, 'run', false, speed / (1.6 + speed * 0.12));
  } else {
    playClip(body, p.role === 'gk' ? 'ready' : 'idle', false);
  }
  body.lastAction = p.action;
  body.mixer.update(dt);
};

const ballTexture = (): THREE.CanvasTexture => {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  g.fillStyle = '#f7f7f2';
  g.fillRect(0, 0, 256, 128);
  g.fillStyle = '#1a1a1a';
  [
    [32, 30],
    [96, 64],
    [160, 30],
    [224, 64],
    [32, 100],
    [160, 100],
  ].forEach(([x, y]) => {
    g.beginPath();
    for (let k = 0; k < 5; k += 1) {
      const a = (k / 5) * Math.PI * 2;
      g.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14);
    }
    g.fill();
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

export class FootballScene {
  private renderer: THREE.WebGLRenderer;

  private scene = new THREE.Scene();

  private camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.5, 600);

  private bodies: Body[] = [];

  private ball: THREE.Mesh;

  private ballShadow: THREE.Mesh;

  private markers: THREE.Mesh[] = [];

  // Arrows over whoever a person's pass would go to, or is on its way to.
  private arrows: THREE.Mesh[] = [];

  private view = CAMERA.normal;

  private time = 0;

  private sun: THREE.DirectionalLight;

  private camX = 0;

  private camZ = 0;

  private ready = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private kits: [Kit, Kit],
    // Which sides people play, to mark their player (yellow for the first, blue the second).
    private people: [boolean, boolean],
    graphics: Graphics
  ) {
    const start: Quality = graphics.quality === 'auto' ? 'high' : graphics.quality;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: QUALITY[start].antialias });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene.background = new THREE.Color('#0d1424');
    this.scene.fog = new THREE.Fog('#0d1424', 120, 260);
    this.scene.add(new THREE.HemisphereLight('#e8eeff', '#4a5a3a', 1.9));
    this.sun = new THREE.DirectionalLight('#fff6e8', 2.4);
    this.sun.position.set(-25, 55, 40);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -HALF_LENGTH - 6;
    sc.right = HALF_LENGTH + 6;
    sc.top = HALF_WIDTH + 6;
    sc.bottom = -HALF_WIDTH - 6;
    sc.near = 10;
    sc.far = 160;
    this.sun.shadow.bias = -0.0005;
    this.scene.add(this.sun);
    buildStadium(this.scene, this.renderer);

    this.ball = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_RADIUS * 1.25, 20, 14),
      new THREE.MeshStandardMaterial({ map: ballTexture(), roughness: 0.5 })
    );
    this.ball.castShadow = true;
    this.scene.add(this.ball);
    // A soft dark spot under the ball, so its height reads on the TV camera.
    this.ballShadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.2, 16),
      new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.35 })
    );
    this.ballShadow.rotation.x = -Math.PI / 2;
    this.scene.add(this.ballShadow);

    ['#ffd23f', '#4fc3ff'].forEach((c) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.55, 0.72, 32),
        new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9 })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.03;
      ring.visible = false;
      this.scene.add(ring);
      this.markers.push(ring);
      const arrow = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 0.5, 4),
        new THREE.MeshBasicMaterial({ color: c, transparent: true })
      );
      arrow.rotation.x = Math.PI;
      arrow.visible = false;
      this.scene.add(arrow);
      this.arrows.push(arrow);
    });
    this.setQuality(start);
    this.setCamera(graphics.camera);
  }

  // Resolution, shadows and their detail; changes at once, mid-match too.
  setQuality(quality: Quality): void {
    const q = QUALITY[quality];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, q.pixelRatio));
    const changed = this.renderer.shadowMap.enabled !== q.shadows;
    this.renderer.shadowMap.enabled = q.shadows;
    this.renderer.shadowMap.type = quality === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    this.sun.castShadow = q.shadows;
    if (this.sun.shadow.mapSize.x !== q.shadowSize) {
      this.sun.shadow.mapSize.set(q.shadowSize, q.shadowSize);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    // Materials are compiled with or without shadows: they must be built again.
    if (changed)
      this.scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((mat) => {
          mat.needsUpdate = true;
        });
      });
  }

  setCamera(camera: Graphics['camera']): void {
    this.view = CAMERA[camera];
  }

  async load(m: MatchState): Promise<void> {
    const gltf = await new GLTFLoader().loadAsync(playerUrl);
    const rig = readRig(gltf.scene);
    const made = makeClips(rig);
    const clips: Record<string, THREE.AnimationClip> = { ...made };
    gltf.animations.forEach((clip) => {
      clips[clip.name] = clip;
    });
    m.players.forEach((p, i) => {
      const root = cloneSkinned(gltf.scene);
      const kit = p.role === 'gk' ? keeperKit(this.kits, p.side) : this.kits[p.side];
      const material = kitMaterial(kit, p.look, p.role === 'gk');
      root.traverse((o) => {
        const mesh = o as THREE.SkinnedMesh;
        if (!mesh.isMesh) return;
        mesh.material = material;
        mesh.castShadow = true;
        mesh.frustumCulled = false;
      });
      this.scene.add(root);
      const mixer = new THREE.AnimationMixer(root);
      const actions: Record<string, THREE.AnimationAction> = {};
      Object.entries(clips).forEach(([name, clip]) => {
        actions[name] = mixer.clipAction(clip);
      });
      const first = p.role === 'gk' ? 'ready' : 'idle';
      actions[first].play();
      // Players don't breathe in step.
      mixer.setTime(i * 0.37);
      this.bodies.push({ root, mixer, actions, current: first, lastAction: 'none' });
    });
    this.ready = true;
  }

  // Draws the match as it is now; `dt` is the real time since the last frame, for the clips.
  render(m: MatchState, dt: number, control: [number, number]): void {
    if (!this.ready) return;
    m.players.forEach((p, i) => {
      const body = this.bodies[i];
      body.root.position.set(p.x, 0, p.z);
      // The model faces +z; the engine's angle 0 is +x.
      body.root.rotation.set(0, Math.PI / 2 - p.face, 0);
      if (p.action === 'dive') {
        // Thrown sideways toward the dive.
        const right = -Math.sin(p.face) * p.actX + Math.cos(p.face) * p.actZ;
        body.root.rotation.z = 0;
        body.root.rotateZ(-Math.sign(right || 1) * 1.1);
        body.root.position.y = 0.35;
      } else if (p.action === 'slide') {
        body.root.position.y = 0;
      }
      animate(body, p, dt);
    });

    const { ball } = m;
    this.ball.position.set(ball.x, ball.y + BALL_RADIUS * 0.25, ball.z);
    const v = Math.hypot(ball.vx, ball.vz);
    if (v > 0.05) {
      const axis = new THREE.Vector3(ball.vz, 0, -ball.vx).normalize();
      this.ball.rotateOnWorldAxis(axis, (v * dt) / (BALL_RADIUS * 1.25));
    }
    this.ballShadow.position.set(ball.x, 0.02, ball.z);
    this.ballShadow.scale.setScalar(1 + ball.y * 0.15);

    this.markers.forEach((ring, side) => {
      ring.visible = this.people[side] && m.phase !== 'over';
      const p = m.players[control[side]];
      if (p) ring.position.set(p.x, 0.03, p.z);
    });

    // Who gets the pass: solid while the ball is on its way, faint while the carrier aims.
    this.time += dt;
    this.arrows.forEach((arrow, side) => {
      const inFlight = ball.owner < 0 && ball.target >= 0 && m.players[ball.target].side === side;
      const who = inFlight ? ball.target : m.preview[side];
      arrow.visible = this.people[side] && who >= 0 && m.phase === 'play';
      if (!arrow.visible) return;
      const p = m.players[who];
      const bob = Math.sin(this.time * (inFlight ? 12 : 6)) * 0.08;
      arrow.position.set(p.x, 2.35 + bob, p.z);
      (arrow.material as THREE.MeshBasicMaterial).opacity = inFlight ? 0.95 : 0.55;
    });

    // The TV camera: on the near touchline, high, sliding along with the ball.
    const tx = Math.max(-HALF_LENGTH + 14, Math.min(HALF_LENGTH - 14, ball.x));
    const tz = Math.max(-HALF_WIDTH + 6, Math.min(HALF_WIDTH - 6, ball.z)) * 0.55;
    const k = 1 - Math.exp(-dt * 3);
    this.camX += (tx - this.camX) * k;
    this.camZ += (tz - this.camZ) * k;
    this.camera.position.set(this.camX, this.view.height, this.camZ + this.view.back);
    this.camera.lookAt(this.camX, 0, this.camZ - 1);

    this.renderer.render(this.scene, this.camera);
  }

  resize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    this.renderer.dispose();
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        (mat as THREE.MeshStandardMaterial).map?.dispose();
        mat.dispose();
      });
    });
  }
}
