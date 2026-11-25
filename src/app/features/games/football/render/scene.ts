/* eslint-disable no-param-reassign */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import playerUrl from '../assets/player.glb?url';
import { BALL_RADIUS, HALF_LENGTH, HALF_WIDTH } from '../engine/data';
import { Kit, colorDistance, keeperKit } from '../engine/teams';
import { Action, MatchState, Official, Player } from '../engine/types';
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
  // The right hand, for the referee's card and the linesman's flag.
  hand?: THREE.Object3D;
  prop?: THREE.Mesh;
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
  card: { clip: 'raise', once: true },
  flag: { clip: 'raise', once: true },
};

// One colour per person: warm ones for the first side, cool ones for the second.
const PERSON_COLORS = [
  ['#ffd23f', '#ff8a3d', '#ff5d8f', '#f4f1de'],
  ['#4fc3ff', '#7cff6b', '#b388ff', '#2ee6c8'],
];

// The officials wear whichever of these is furthest from both kits.
const OFFICIAL_COLORS = ['#111111', '#e9f542', '#ff7ab6', '#5b5f66'];

// A person's name on a small label over their player.
const nameSprite = (text: string, color: string): THREE.Sprite => {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  g.font = 'bold 30px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(0,0,0,0.55)';
  const w = Math.min(250, g.measureText(text).width + 24);
  g.fillRect(128 - w / 2, 10, w, 44);
  g.fillStyle = color;
  g.fillText(text.slice(0, 16), 128, 33);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false }));
  sprite.scale.set(2.4, 0.6, 1);
  sprite.renderOrder = 2;
  return sprite;
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
const animate = (body: Body, p: Pick<Player, 'vx' | 'vz' | 'action' | 'role'>, dt: number) => {
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

  private officials: Body[] = [];

  private labels: THREE.Sprite[] = [];

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
    graphics: Graphics,
    // The people on this computer (slots: their pass arrow shows) and, with more than one
    // person in the match, a name over each one's player.
    private who: { mine: number[]; labels?: string[] }
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
    const body = (kit: Kit, look: number, keeper: boolean, delay: number): Body => {
      const root = cloneSkinned(gltf.scene);
      const material = kitMaterial(kit, look, keeper);
      let hand: THREE.Object3D | undefined;
      root.traverse((o) => {
        if (o.name === 'hand_r') hand = o;
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
      const first = keeper ? 'ready' : 'idle';
      actions[first].play();
      // Players don't breathe in step.
      mixer.setTime(delay);
      return { root, hand, mixer, actions, current: first, lastAction: 'none' };
    };
    m.players.forEach((p, i) => {
      const kit = p.role === 'gk' ? keeperKit(this.kits, p.side) : this.kits[p.side];
      this.bodies.push(body(kit, p.look, p.role === 'gk', i * 0.37));
    });

    // The officials: a colour neither team wears; the referee's card and the flags in hand.
    const taken = [
      this.kits[0].shirt,
      this.kits[1].shirt,
      this.kits[0].shorts,
      this.kits[1].shorts,
    ];
    const color = [...OFFICIAL_COLORS].sort(
      (a, b) =>
        Math.min(...taken.map((t) => colorDistance(b, t))) -
        Math.min(...taken.map((t) => colorDistance(a, t)))
    )[0];
    const officialKit: Kit = {
      shirt: color,
      trim: color,
      pattern: 'solid',
      shorts: '#111111',
      socks: '#111111',
    };
    m.officials.forEach((o, k) => {
      const b = body(officialKit, 3 + k * 11, false, k * 0.5);
      const prop = new THREE.Mesh(
        k === 0 ? new THREE.PlaneGeometry(0.12, 0.17) : new THREE.PlaneGeometry(0.32, 0.24),
        new THREE.MeshBasicMaterial({
          color: k === 0 ? '#ffd400' : '#ff3d00',
          side: THREE.DoubleSide,
        })
      );
      // The card or flag sits above the hand; hidden until raised.
      prop.position.set(0, k === 0 ? 0.16 : 0.22, 0);
      prop.visible = false;
      (b.hand ?? b.root).add(prop);
      b.prop = prop;
      this.officials.push(b);
    });

    // Each person's ring, name and pass arrow.
    m.setup.slots.forEach((side, s) => {
      const nth = m.setup.slots.slice(0, s).filter((x) => x === side).length;
      const c = PERSON_COLORS[side][nth % 4];
      const mine = this.who.mine.includes(s);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(mine ? 0.55 : 0.6, mine ? 0.74 : 0.7, 32),
        new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: mine ? 0.95 : 0.7 })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.03;
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
      const label = this.who.labels?.[s];
      const sprite = nameSprite(label ?? '', c);
      sprite.visible = !!label;
      this.scene.add(sprite);
      this.labels.push(sprite);
    });
    this.ready = true;
  }

  private placeOfficial(o: Official, k: number, dt: number) {
    const b = this.officials[k];
    b.root.position.set(o.x, 0, o.z);
    b.root.rotation.set(0, Math.PI / 2 - o.face, 0);
    animate(b, { vx: o.vx, vz: o.vz, action: o.action, role: 'mid' }, dt);
    if (b.prop) {
      b.prop.visible = o.action === 'card' || o.action === 'flag';
      if (k === 0 && o.card)
        (b.prop.material as THREE.MeshBasicMaterial).color.set(
          o.card === 'red' ? '#e0102a' : '#ffd400'
        );
    }
  }

  // Draws the match as it is now; `dt` is the real time since the last frame, for the clips.
  render(m: MatchState, dt: number): void {
    if (!this.ready) return;
    m.players.forEach((p, i) => {
      const body = this.bodies[i];
      // Someone sent off has left the pitch.
      body.root.visible = !p.off;
      if (p.off) return;
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

    m.officials.forEach((o, k) => this.placeOfficial(o, k, dt));

    this.markers.forEach((ring, s) => {
      const person = m.people[s];
      const p = person && m.players[person.control];
      ring.visible = !!p && !p.off && m.phase !== 'over';
      if (p) ring.position.set(p.x, 0.03, p.z);
      const label = this.labels[s];
      label.visible = !!this.who.labels?.[s] && ring.visible;
      if (p) label.position.set(p.x, 2.25, p.z);
    });

    // Who gets the pass: solid while the ball is on its way, faint while the carrier aims. Only
    // for the people on this computer.
    this.time += dt;
    this.arrows.forEach((arrow, s) => {
      const person = m.people[s];
      const side = m.setup.slots[s];
      const passer = person && ball.credit === person.control;
      const inFlight =
        ball.owner < 0 && ball.target >= 0 && m.players[ball.target].side === side && passer;
      const who = inFlight ? ball.target : person?.preview ?? -1;
      arrow.visible = this.who.mine.includes(s) && who >= 0 && m.phase === 'play';
      if (!arrow.visible) return;
      const p = m.players[who];
      const bob = Math.sin(this.time * (inFlight ? 12 : 6)) * 0.08;
      arrow.position.set(p.x, 2.6 + bob, p.z);
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
