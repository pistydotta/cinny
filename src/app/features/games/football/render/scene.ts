/* eslint-disable no-param-reassign */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import playerUrl from '../assets/player.glb?url';
import { BALL_RADIUS, HALF_LENGTH, HALF_WIDTH, ReplayCam } from '../engine/data';
import { inTunnel, sceneFocus } from '../engine/scenes';
import { Kit, colorDistance, keeperKit } from '../engine/teams';
import { Action, MatchState, Official, Player } from '../engine/types';
import { CAMERA, Graphics, QUALITY, Quality } from '../options';
import { kitMaterial } from './kit';
import { makeClips, readRig } from './rig';
import { buildStadium } from './stadium';

// Draws a match with three.js: the stadium, the mannequins in their kits (the 22, the benches
// and the officials) and the ball, from a TV camera on the near touchline that follows play, or
// the scene of the moment (engine/scenes.ts). A replay hands in a moment from the tape
// (replayTape.ts) and the camera of its take. The only part of the game that imports three.js;
// it reads the match and never changes it.
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
  // Eased toward the pose's needs: lying down (0 to 1) and how far the body sits lower (m).
  lie: number;
  drop: number;
  // A clock for the body's own bobbing and rolling.
  t: number;
};

// Which clip each action plays, and whether it plays once. Actions moving the body (a run
// with arms out) set `moving`, and their speed follows the feet like the run's.
const MOVE_CLIPS: Partial<
  Record<Action, { clip: string; once: boolean; speed?: number; moving?: boolean }>
> = {
  kick: { clip: 'kick', once: true },
  slide: { clip: 'Slide_Start', once: true, speed: 1.3 },
  dive: { clip: 'NinjaJump_Start', once: true, speed: 1.4 },
  fall: { clip: 'Hit_Knockback', once: true, speed: 1.2 },
  celebrate: { clip: 'Yes', once: false },
  throw: { clip: 'OverhandThrow', once: true, speed: 1.5 },
  card: { clip: 'raise', once: true },
  flag: { clip: 'raise', once: true },
  whistle: { clip: 'whistle', once: true },
  point: { clip: 'point', once: true },
  indirect: { clip: 'raise', once: true },
  board: { clip: 'board', once: false },
  down: { clip: 'down', once: false },
  protest: { clip: 'protest', once: false },
  dejected: { clip: 'dejected', once: false },
  cheer: { clip: 'cheer', once: false },
  airplane: { clip: 'airplane', once: false, moving: true },
  kneeslide: { clip: 'kneeslide', once: false },
  clap: { clip: 'clap', once: false },
  highfive: { clip: 'highfive', once: true },
  sit: { clip: 'sit', once: false },
};

// A replay's take on screen: its camera, which take (a new one cuts), the end of the pitch the
// moment was at (+1 or -1, for the camera behind the goal), and an offside's line.
export type ReplayView = { cam: ReplayCam; take: number; end: number; line: number | undefined };

// How much lower a pose puts the body: seated on the bench, kneeling.
const DROP: Partial<Record<Action, number>> = { sit: 0.4, kneeslide: 0.46 };

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

// The run's pace matched to the feet: about 2.2 m per stride cycle at a jog, longer sprinting.
const runSpeed = (speed: number) => speed / (1.6 + speed * 0.12);

// Picks the clip for what the player is doing: an action's own clip, a walk or a run at a pace
// that matches the feet to the ground, or standing.
const animate = (body: Body, p: Pick<Player, 'vx' | 'vz' | 'action' | 'role'>, dt: number) => {
  const speed = Math.hypot(p.vx, p.vz);
  const move = MOVE_CLIPS[p.action];
  if (move?.moving) {
    playClip(body, move.clip, false, runSpeed(Math.max(speed, 3)));
  } else if (move) {
    if (body.lastAction !== p.action) playClip(body, move.clip, move.once, move.speed);
  } else if (speed > (body.current === 'run' ? 2.3 : 2.9)) {
    playClip(body, 'run', false, runSpeed(speed));
  } else if (speed > 0.35) {
    // About 1.45 m per stride cycle.
    playClip(body, 'walk', false, Math.max(0.5, speed / 1.45));
  } else {
    playClip(body, p.role === 'gk' ? 'ready' : 'idle', false);
  }
  body.lastAction = p.action;
  body.mixer.update(dt);
  body.t += dt;
  const ease = 1 - Math.exp(-dt * 9);
  body.lie += ((p.action === 'down' ? 1 : 0) - body.lie) * ease;
  body.drop += ((DROP[p.action] ?? 0) - body.drop) * ease;
};

const LIE_AXIS = new THREE.Vector3(1, 0, 0);
const ROLL_AXIS = new THREE.Vector3(0, 1, 0);
const UP = new THREE.Vector3(0, 1, 0);

// Puts a body where the engine has it, facing its way, lowered, lying or springing as its pose
// asks. The model faces +z; the engine's angle 0 is +x.
const place = (body: Body, x: number, z: number, face: number, action: Action) => {
  const { root } = body;
  root.position.set(x, -body.drop, z);
  root.quaternion.setFromAxisAngle(UP, Math.PI / 2 - face);
  if (body.lie > 0.01) {
    // On the back, feet where they stood, rolling a little side to side.
    const tilt = new THREE.Quaternion().setFromAxisAngle(LIE_AXIS, (-Math.PI / 2) * body.lie);
    const roll = new THREE.Quaternion().setFromAxisAngle(
      ROLL_AXIS,
      Math.sin(body.t * 3.2) * 0.35 * body.lie
    );
    root.quaternion.multiply(tilt).multiply(roll);
    root.position.y += 0.14 * body.lie;
  }
  if (action === 'cheer') root.position.y += Math.max(0, Math.sin(body.t * 9)) * 0.22;
};

// The fourth official's board: the number coming on in green over the one going off in red.
const boardTexture = (on: number, off: number): THREE.CanvasTexture => {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 192;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  g.fillStyle = '#101010';
  g.fillRect(0, 0, 256, 192);
  g.font = 'bold 78px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#39ff5a';
  g.fillText(`▲ ${on}`, 128, 50);
  g.fillStyle = '#ff3030';
  g.fillText(`▼ ${off}`, 128, 142);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
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

  // The numbers on the fourth official's board, to paint it again only when they change.
  private boardShown = '';

  private zoom = 1;

  // Arrows over whoever a person's pass would go to, or is on its way to.
  private arrows: THREE.Mesh[] = [];

  private view = CAMERA.normal;

  private time = 0;

  private sun: THREE.DirectionalLight;

  private camX = 0;

  private camZ = 0;

  // The take on screen ('' live): a change cuts instead of panning, as TV does.
  private shot = '';

  // Where a replay camera looks (the ball, eased), and an offside line's x, eased.
  private aim = new THREE.Vector3();

  private lineX = 0;

  // The offside line on the grass, in replays.
  private line: THREE.Mesh;

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

    this.line = new THREE.Mesh(
      new THREE.PlaneGeometry(0.16, HALF_WIDTH * 2),
      new THREE.MeshBasicMaterial({
        color: '#ffd400',
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      })
    );
    this.line.rotation.x = -Math.PI / 2;
    this.line.position.y = 0.025;
    this.line.visible = false;
    this.scene.add(this.line);

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
      return {
        root,
        hand,
        mixer,
        actions,
        current: first,
        lastAction: 'none',
        lie: 0,
        drop: 0,
        t: delay,
      };
    };
    // The kit is painted once: a substitute keeper wears the keeper's colours from the bench.
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
      if (k === 3) {
        // The board, held over the head facing the way the official does.
        const board = new THREE.Mesh(
          new THREE.PlaneGeometry(0.8, 0.6),
          new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide })
        );
        board.position.set(0, 2.1, 0.24);
        board.visible = false;
        b.root.add(board);
        b.prop = board;
      } else {
        const prop = new THREE.Mesh(
          k === 0 ? new THREE.PlaneGeometry(0.16, 0.22) : new THREE.PlaneGeometry(0.32, 0.24),
          new THREE.MeshBasicMaterial({
            color: k === 0 ? '#ffd400' : '#ff3d00',
            side: THREE.DoubleSide,
          })
        );
        // The card sits above the hand, hidden until shown; a linesman always has the flag.
        prop.position.set(0, k === 0 ? 0.16 : 0.22, 0);
        prop.visible = k !== 0;
        (b.hand ?? b.root).add(prop);
        b.prop = prop;
      }
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
    // A replay camera may have hidden them last frame.
    b.root.visible = true;
    animate(b, { vx: o.vx, vz: o.vz, action: o.action, role: 'mid' }, dt);
    place(b, o.x, o.z, o.face, o.action);
    if (!b.prop) return;
    if (k === 0) {
      b.prop.visible = o.action === 'card';
      if (o.card)
        (b.prop.material as THREE.MeshBasicMaterial).color.set(
          o.card === 'red' ? '#e0102a' : '#ffd400'
        );
    } else if (k === 3) {
      b.prop.visible = o.action === 'board' && !!o.board;
      const key = o.board ? o.board.join('-') : '';
      if (o.board && key !== this.boardShown) {
        this.boardShown = key;
        const mat = b.prop.material as THREE.MeshBasicMaterial;
        mat.map?.dispose();
        mat.map = boardTexture(o.board[1], o.board[0]);
        mat.needsUpdate = true;
      }
    }
  }

  // Draws the match as it is now, or a replay's moment; `dt` is the time since the last frame
  // for the clips (slowed down in a slow-motion take).
  render(m: MatchState, dt: number, replay?: ReplayView): void {
    if (!this.ready) return;
    m.players.forEach((p, i) => {
      const body = this.bodies[i];
      // Someone sent off is drawn until they reach the tunnel; the benches are always there.
      body.root.visible = !inTunnel(p);
      if (!body.root.visible) return;
      animate(body, p, dt);
      place(body, p.x, p.z, p.face, p.action);
      if (p.action === 'dive') {
        // Thrown sideways toward the dive.
        const right = -Math.sin(p.face) * p.actX + Math.cos(p.face) * p.actZ;
        body.root.rotateZ(-Math.sign(right || 1) * 1.1);
        body.root.position.y = 0.35;
      } else if (p.action === 'slide') {
        body.root.position.y = 0;
      }
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

    // A replay shows the match as TV does: no rings, names or arrows.
    this.markers.forEach((ring, s) => {
      const person = m.people[s];
      const p = person && m.players[person.control];
      ring.visible = !!p && !p.off && m.phase !== 'over' && !replay;
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
      arrow.visible = this.who.mine.includes(s) && who >= 0 && m.phase === 'play' && !replay;
      if (!arrow.visible) return;
      const p = m.players[who];
      const bob = Math.sin(this.time * (inFlight ? 12 : 6)) * 0.08;
      arrow.position.set(p.x, 2.6 + bob, p.z);
      (arrow.material as THREE.MeshBasicMaterial).opacity = inFlight ? 0.95 : 0.55;
    });

    const key = replay ? `${replay.take}:${replay.cam}` : '';
    const cut = key !== this.shot;
    this.shot = key;
    this.line.visible = replay?.line !== undefined;
    if (replay) this.replayCamera(m, replay, dt, cut);
    else this.tvCamera(m, dt, cut);
    this.renderer.render(this.scene, this.camera);
  }

  // The TV camera: on the near touchline, high, sliding along with the ball; during a scene it
  // closes in on what matters (the card, the scorer, the substitution at the far line). Back
  // from a replay it cuts straight to where it should be.
  private tvCamera(m: MatchState, dt: number, cut: boolean) {
    const { ball } = m;
    const focus = sceneFocus(m);
    const tx = Math.max(-HALF_LENGTH + 14, Math.min(HALF_LENGTH - 14, focus?.x ?? ball.x));
    const tz = focus
      ? Math.max(-HALF_WIDTH - 2, Math.min(HALF_WIDTH, focus.z)) * 0.8
      : Math.max(-HALF_WIDTH + 6, Math.min(HALF_WIDTH - 6, ball.z)) * 0.55;
    const k = cut ? 1 : 1 - Math.exp(-dt * 3);
    this.camX += (tx - this.camX) * k;
    this.camZ += (tz - this.camZ) * k;
    this.zoom += ((focus?.zoom ?? 1) - this.zoom) * (cut ? 1 : 1 - Math.exp(-dt * 1.5));
    this.camera.position.set(
      this.camX,
      this.view.height * this.zoom,
      this.camZ + this.view.back * this.zoom
    );
    this.camera.lookAt(this.camX, 0, this.camZ - 1);
  }

  // A replay's cameras, all following the ball: the TV camera closer in; high behind the goal
  // the moment was at; low at the side of the play; level with the offside line, which slides
  // with the second-last defender.
  private replayCamera(m: MatchState, r: ReplayView, dt: number, cut: boolean) {
    const { ball } = m;
    const k = cut ? 1 : 1 - Math.exp(-dt * 4);
    const bx = Math.max(-HALF_LENGTH - 1, Math.min(HALF_LENGTH + 1, ball.x));
    const bz = Math.max(-HALF_WIDTH, Math.min(HALF_WIDTH, ball.z));
    this.aim.x += (bx - this.aim.x) * k;
    this.aim.y += (Math.min(ball.y, 3) * 0.5 - this.aim.y) * k;
    this.aim.z += (bz - this.aim.z) * k;
    const { aim } = this;
    if (r.cam === 'goal') {
      this.camera.position.set(r.end * (HALF_LENGTH + 15), 7.5, aim.z * 0.35);
      this.camera.lookAt(aim.x, aim.y + 0.6, aim.z);
    } else if (r.cam === 'low') {
      const z = Math.min(aim.z + 14, HALF_WIDTH + 4);
      this.camera.position.set(aim.x - r.end * 5, 3.2, z);
      this.camera.lookAt(aim.x, aim.y + 0.7, aim.z);
    } else if (r.cam === 'line' && r.line !== undefined) {
      this.lineX += (r.line - this.lineX) * (cut ? 1 : 1 - Math.exp(-dt * 6));
      this.line.position.x = this.lineX;
      this.camera.position.set(this.lineX, 12, HALF_WIDTH + 22);
      this.camera.lookAt(this.lineX, 0, -2);
    } else {
      const zoom = 0.6;
      const x = Math.max(-HALF_LENGTH + 8, Math.min(HALF_LENGTH - 8, aim.x));
      const z = Math.max(-HALF_WIDTH + 6, Math.min(HALF_WIDTH - 6, aim.z)) * 0.55;
      this.camera.position.set(x, this.view.height * zoom, z + this.view.back * zoom);
      this.camera.lookAt(x, 0, z - 1);
    }
    // Nobody right in front of the lens: a body that close would fill the screen.
    const cam = this.camera.position;
    [...this.bodies, ...this.officials].forEach(({ root }) => {
      if (Math.hypot(root.position.x - cam.x, root.position.z - cam.z) < 4) root.visible = false;
    });
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
