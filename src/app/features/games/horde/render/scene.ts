/* eslint-disable no-param-reassign */
import * as THREE from 'three';
import { ENEMIES, MAX_ENEMIES, SHOT_HEIGHT, SHRINE_RADIUS } from '../engine/data';
import { auraRadius, runStats, urnCount, urnOrbit } from '../engine/run';
import { MAX_URNS } from '../engine/weapons';
import { MAP_HALF, heightAt, obstaclesOf } from '../engine/terrain';
import { Forest, Planted } from './forest';
import { ForestModel } from '../textures/forest';
import {
  Enemy,
  EnemyKind,
  GameEvent,
  PickupKind,
  RunState,
  ShotKind,
  ShrineKind,
} from '../engine/types';
import { HERO_SPRITES } from '../sprites';
import { Particles } from './particles';
import { SpriteHero } from './spriteHero';
import { buildTerrain } from './terrainMesh';
import { Sky } from './sky';
import { ball, box, cone, ENEMY_FRAMES, enemyGeometry, merge } from './models';
import { glowTexture, PICKUP_GLOW, PICKUP_KINDS, pickupGeometry, xpScale, xpTint } from './pickups';
import { EMBLEM_HEIGHT, ShrineModel, shrineModel } from './shrines';
import { psxSnap, psxifyAll } from './psx';

// Draws a run with three.js. The engine knows nothing about this file: every frame the scene
// reads the run's state and places things, and the events of each tick become effects.
//
// The old-console look comes from rendering at a low resolution and stretching it without
// smoothing, flat-shaded models with colors per vertex, and fog close to the camera.

// Lines of pixels the scene is drawn at, per quality, before being stretched to the screen.
const RENDER_HEIGHTS = { low: 240, medium: 360, high: 540 };
export type SceneQuality = keyof typeof RENDER_HEIGHTS;
const KINDS: EnemyKind[] = [
  'husk',
  'runner',
  'brute',
  'spitter',
  'boss',
  'charger',
  'bomber',
  'shield',
  'summoner',
  'swarm',
  'barrel',
  'pot',
];
// Steps of the walk a second; the rest take 3.5.
const STEP_RATES: Partial<Record<EnemyKind, number>> = {
  runner: 7,
  swarm: 11,
  bomber: 7,
  brute: 2.5,
  boss: 2.2,
};
const MAX_HAZARDS = 120;
const SHRINE_COLORS: Record<ShrineKind, number> = {
  blessing: 0x6ae6ff,
  curse: 0xb04aff,
  gold: 0xffd23a,
  heal: 0x5aff8a,
  challenge: 0xff5a3a,
  // The Camelô's orange tarp, the Agiota's green of money.
  camelo: 0xff9a2e,
  agiota: 0x2fbf5a,
  treta: 0xff2040,
};
const SHOT_KINDS: ShotKind[] = ['card', 'missile', 'axe', 'spit'];
const SKY = 0x1a1326;
const MAX_CORPSES = 48;
// Drops drawn at most: gems, and each other kind.
const MAX_PICKUPS_SHOWN = 420;
const MAX_DROPS = 24;
const CORPSE_SECONDS = 0.4;
const POWERUP_COLORS: Partial<Record<string, number>> = {
  bomb: 0x2b2b30,
  rage: 0xff3030,
  freeze: 0x8fe8ff,
  star: 0xfff27a,
  goldrain: 0xffb020,
};
// The camera looks at this point over the hero's feet.
const CAMERA_AIM = 1.6;

// Where the camera is, turned by the player. `yaw` 0 is behind the hero on +z looking towards -z;
// `pitch` is how far above the hero it looks down from, in radians.
export type CameraView = { yaw: number; pitch: number; distance: number; fov: number };

const hash = (x: number, z: number): number => {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const instanced = (
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  capacity: number
): THREE.InstancedMesh => {
  const mesh = new THREE.InstancedMesh(geometry, material, capacity);
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  return mesh;
};

export class HordeScene {
  private renderer: THREE.WebGLRenderer;

  private scene = new THREE.Scene();

  private camera = new THREE.PerspectiveCamera(46, 1, 0.5, 220);

  private lit = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

  private glow = new THREE.MeshBasicMaterial({ vertexColors: true });

  // One mesh per frame of each kind's walk.
  private enemyMeshes = new Map<EnemyKind, THREE.InstancedMesh[]>();

  private shotMeshes = new Map<ShotKind, THREE.InstancedMesh>();

  private shadows: THREE.InstancedMesh;

  // One mesh per kind of drop, a glow on the ground under each, and the beams over chests.
  private pickups = new Map<PickupKind, THREE.InstancedMesh>();

  private pickupGlows: THREE.InstancedMesh;

  private chestBeams: THREE.InstancedMesh;

  private zones: THREE.InstancedMesh;

  // Danger on the ground: the circle that fills up before a blast, its outline, burning ground
  // and the lanes of charges and stampedes.
  private warnFill: THREE.InstancedMesh;

  private warnRing: THREE.InstancedMesh;

  private fires: THREE.InstancedMesh;

  private lanes: THREE.InstancedMesh;

  private urns: THREE.InstancedMesh;

  private aura: THREE.Mesh;

  private shrines: {
    emblem: THREE.Mesh;
    ring: THREE.Mesh;
    beam: THREE.Mesh;
    glow: THREE.Mesh;
    height: number;
  }[] = [];

  private rings: { mesh: THREE.Mesh; age: number; radius: number }[] = [];

  private bolts: THREE.LineSegments;

  private boltLife = 0;

  private hero: SpriteHero;

  private particles: Particles;

  private dummy = new THREE.Object3D();

  private color = new THREE.Color();

  private target = new THREE.Vector3();

  private aim = new THREE.Vector3();

  private shake = 0;

  // Frames still to hold the last picture: the freeze frame of a big kill. Only the drawing
  // stops; the engine keeps going.
  private hold = 0;

  // Dead enemies flung away, shrinking, drawn with the living ones.
  private corpses: {
    kind: EnemyKind;
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    scale: number;
    age: number;
  }[] = [];

  // No shaking or freeze frames (the "reduce motion" option).
  reduceMotion = false;

  private quality: SceneQuality = 'medium';

  // Fewer pixels and fewer sparks on a slow device.
  setQuality(quality: SceneQuality) {
    if (quality === this.quality) return;
    this.quality = quality;
    this.particles.density = { low: 0.4, medium: 1, high: 1 }[quality];
    this.resize();
  }

  private clock = 0;

  private sky: Sky;

  // How much of the chosen camera distance is free of cliffs, eased.
  private reach = 1;

  // The map's chests, hidden once bought.
  private chestMeshes: THREE.Mesh[] = [];

  private disposables: { dispose: () => void }[] = [];

  // The height of the map's ground, the same the engine stands things on.
  private ground(x: number, z: number): number {
    return heightAt(this.run.map, x, z);
  }

  constructor(private canvas: HTMLCanvasElement, private run: RunState) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(1);
    this.scene.background = new THREE.Color(SKY);
    this.scene.fog = new THREE.Fog(SKY, 40, 120);

    const hemi = new THREE.HemisphereLight(0xb8c4ff, 0x4a3a30, 2.2);
    const sun = new THREE.DirectionalLight(0xffc890, 2.6);
    sun.position.set(-6, 10, 4);
    this.scene.add(hemi, sun);
    this.sky = new Sky(this.scene, hemi, sun);
    this.disposables.push(...this.sky.disposables);

    this.buildGround();
    this.buildDecor();
    this.buildChests();

    KINDS.forEach((kind) => {
      const frames = kind === 'barrel' || kind === 'pot' ? 1 : ENEMY_FRAMES;
      const meshes = Array.from({ length: frames }, (_, frame) =>
        instanced(
          enemyGeometry(kind, frame),
          this.lit,
          kind === 'boss' ? 6 : MAX_ENEMIES + 8 + MAX_CORPSES
        )
      );
      this.enemyMeshes.set(kind, meshes);
      this.scene.add(...meshes);
    });

    const shotShapes: Record<ShotKind, THREE.BufferGeometry> = {
      // A work card: the little blue booklet.
      card: merge([
        box(0.55, 0.1, 0.75, 0x1c4fb0),
        box(0.22, 0.12, 0.22, 0xe8c84a),
        box(0.57, 0.06, 0.1, 0x143a82, { at: [0, 0, -0.34] }),
      ]),
      // A falling bomb: a round nose towards +z, a body that narrows to the tail and four fins.
      missile: merge([
        ball(0.36, 0x3c4a3a, { at: [0, 0, 0.08] }),
        cone(0.3, 0.7, 6, 0x3c4a3a, { at: [0, 0, -0.3], rot: [-Math.PI / 2, 0, 0] }),
        box(0.66, 0.05, 0.24, 0x2a3328, { at: [0, 0, -0.56] }),
        box(0.05, 0.66, 0.24, 0x2a3328, { at: [0, 0, -0.56] }),
        box(0.5, 0.5, 0.06, 0xf2c230, { at: [0, 0, -0.1] }),
      ]),
      spit: ball(0.4, 0xb04cff),
      axe: merge([
        box(1.5, 0.14, 0.3, 0xd8dde6),
        box(0.3, 0.14, 1.5, 0xd8dde6),
        box(0.4, 0.2, 0.4, 0x8a6a3a),
      ]),
    };
    SHOT_KINDS.forEach((kind) => {
      const mesh = instanced(shotShapes[kind], kind === 'spit' ? this.glow : this.lit, 400);
      this.shotMeshes.set(kind, mesh);
      this.scene.add(mesh);
    });

    const flat = new THREE.CircleGeometry(1, 12).rotateX(-Math.PI / 2);
    this.shadows = instanced(
      flat,
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
      }),
      MAX_ENEMIES + 16
    );
    this.zones = instanced(
      flat,
      new THREE.MeshBasicMaterial({
        color: 0xff6a1a,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
      200
    );
    const danger = (color: number, opacity: number, additive = false) =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      });
    this.warnFill = instanced(flat, danger(0xff2a1a, 0.3), MAX_HAZARDS);
    this.warnRing = instanced(
      new THREE.RingGeometry(0.9, 1, 32).rotateX(-Math.PI / 2),
      danger(0xff3a2a, 0.85),
      MAX_HAZARDS
    );
    this.fires = instanced(flat, danger(0xff7a1a, 0.5, true), MAX_HAZARDS);
    this.lanes = instanced(
      new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      danger(0xff2a1a, 0.22),
      MAX_HAZARDS
    );
    this.scene.add(this.warnFill, this.warnRing, this.fires, this.lanes);
    PICKUP_KINDS.forEach((kind) => {
      let capacity = MAX_DROPS;
      if (kind === 'xp') capacity = MAX_PICKUPS_SHOWN;
      else if (kind === 'gold') capacity = 160;
      const mesh = instanced(pickupGeometry(kind), this.glow, capacity);
      this.pickups.set(kind, mesh);
      this.scene.add(mesh);
    });
    const glowFlat = (vertical: boolean) =>
      new THREE.MeshBasicMaterial({
        map: glowTexture(vertical),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      });
    this.pickupGlows = instanced(
      new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      glowFlat(false),
      MAX_PICKUPS_SHOWN
    );
    this.chestBeams = instanced(
      new THREE.CylinderGeometry(0.3, 0.5, 7, 10, 1, true).translate(0, 3.5, 0),
      glowFlat(true),
      MAX_DROPS
    );
    (this.chestBeams.material as THREE.MeshBasicMaterial).side = THREE.DoubleSide;
    this.scene.add(this.pickupGlows, this.chestBeams);
    // A ballot box: the beige voting machine with its screen and keys.
    this.urns = instanced(
      merge([
        box(0.9, 0.62, 0.7, 0xd9d2bd, { at: [0, 0, 0] }),
        box(0.4, 0.3, 0.05, 0x16324a, { at: [-0.18, 0.06, 0.36] }),
        box(0.24, 0.36, 0.05, 0x2b2b30, { at: [0.26, 0.02, 0.36] }),
        box(0.09, 0.07, 0.06, 0x2fbf4a, { at: [0.32, -0.11, 0.38] }),
        box(0.09, 0.07, 0.06, 0xff8a2a, { at: [0.2, -0.11, 0.38] }),
      ]),
      this.lit,
      MAX_URNS
    );
    this.aura = new THREE.Mesh(
      flat,
      new THREE.MeshBasicMaterial({
        color: 0x7fd0ff,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
      })
    );
    this.aura.visible = false;
    this.scene.add(this.shadows, this.zones, this.urns, this.aura);

    this.buildShrines();

    for (let i = 0; i < 5; i += 1) {
      const mesh = new THREE.Mesh(
        new THREE.RingGeometry(0.86, 1, 28).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({
          color: 0x9fd8ff,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
        })
      );
      mesh.visible = false;
      this.rings.push({ mesh, age: 1, radius: 1 });
      this.scene.add(mesh);
    }

    const boltGeometry = new THREE.BufferGeometry();
    boltGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(256 * 6), 3));
    boltGeometry.setDrawRange(0, 0);
    this.bolts = new THREE.LineSegments(
      boltGeometry,
      new THREE.LineBasicMaterial({ color: 0xcfe6ff })
    );
    this.bolts.frustumCulled = false;
    this.scene.add(this.bolts);

    this.hero = new SpriteHero(HERO_SPRITES[run.character]);
    this.disposables.push(this.hero);
    this.scene.add(this.hero.root);

    this.particles = new Particles(this.scene);
    this.disposables.push(this.lit, this.glow, flat, boltGeometry);
    this.camera.position.set(0, 6, 9);
    // Every material drawn the PS1 way: vertices snapped to the screen, 15-bit dithered color.
    psxifyAll(this.scene);
    this.resize();
  }

  private buildGround() {
    const terrain = buildTerrain(this.run.map);
    this.scene.add(terrain.group);
    this.disposables.push(...terrain.disposables);
  }

  private buildDecor() {
    const forest = new Forest();
    const planted = (x: number, z: number, size: number, turn: number, sink = 0): Planted => ({
      x,
      y: this.ground(x, z) - sink * size,
      z,
      size,
      turn,
    });
    // The trees, boulders and logs the engine stops the hero at, each where the engine has it.
    const obstacles = obstaclesOf(this.run.map);
    const trees: ForestModel[] = ['tree1', 'tree2', 'tree3', 'tree4'];
    trees.forEach((model, variant) =>
      forest.add(
        model,
        obstacles
          .filter((o) => o.kind === 'tree' && o.variant === variant)
          .map((o) => planted(o.x, o.z, o.size, o.turn, 0.02))
      )
    );
    // The boulder's model is as wide as the circle it blocks when drawn this much bigger.
    forest.add(
      'rock',
      obstacles.filter((o) => o.kind === 'rock').map((o) => planted(o.x, o.z, o.size, o.turn, 0.12))
    );
    forest.add(
      'log',
      obstacles.filter((o) => o.kind === 'log').map((o) => planted(o.x, o.z, o.size, o.turn, 0.1))
    );
    // Pebbles and small plants anywhere on the square, never on a cliff face: only to look at.
    const scatter = (model: ForestModel, count: number, salt: number, size: number) => {
      const places: Planted[] = [];
      for (let i = 0; i < count; i += 1) {
        const x = (hash(i, salt) * 2 - 1) * (MAP_HALF - 3);
        const z = (hash(salt, i) * 2 - 1) * (MAP_HALF - 3);
        const h = this.ground(x, z);
        const steep =
          Math.abs(this.ground(x + 0.8, z) - h) + Math.abs(this.ground(x, z + 0.8) - h) > 0.6;
        if (!steep && Math.hypot(x, z) > 3) {
          places.push(planted(x, z, size * (0.7 + hash(i + salt, 9) * 0.6), hash(i, x) * 6, 0.05));
        }
      }
      forest.add(model, places);
    };
    scatter('rock', 320, 11, 0.5);
    scatter('grass', 2200, 23, 0.55);
    scatter('reed', 700, 31, 1.1);
    scatter('dandelion', 500, 43, 0.6);
    scatter('lavender', 400, 53, 1);
    // A forest on the mountains around the square.
    const rim: Planted[][] = [[], []];
    for (let i = 0; i < 420; i += 1) {
      const along = (hash(i, 37) * 2 - 1) * (MAP_HALF + 24);
      const out = MAP_HALF - 2 + hash(37, i) * 26;
      const sign = hash(i, 71) < 0.5 ? -1 : 1;
      const onX = hash(71, i) < 0.5;
      const x = onX ? sign * out : along;
      const z = onX ? along : sign * out;
      rim[i % 2].push(planted(x, z, 9 + hash(i, 5) * 6, hash(5, i) * 6, 0.03));
    }
    forest.add('tree3', rim[0]);
    forest.add('tree4', rim[1]);
    this.scene.add(forest.root);
    this.disposables.push(...forest.disposables);
  }

  private buildChests() {
    const chest = merge([
      box(1.4, 0.8, 1, 0x7a4a22, { at: [0, 0.4, 0] }),
      box(1.5, 0.35, 1.1, 0x8f5a2a, { at: [0, 0.95, 0] }),
      box(0.25, 0.5, 0.1, 0xffd23a, { at: [0, 0.75, 0.56] }),
      box(1.52, 0.12, 1.12, 0xd9a21b, { at: [0, 0.8, 0] }),
    ]);
    this.disposables.push(chest);
    this.run.chests.forEach((c) => {
      const mesh = new THREE.Mesh(chest, this.lit);
      mesh.position.set(c.x, this.ground(c.x, c.z), c.z);
      mesh.rotation.y = hash(c.id, 4) * 6;
      mesh.scale.setScalar(1.2);
      this.scene.add(mesh);
      this.chestMeshes.push(mesh);
    });
  }

  private buildShrines() {
    const models = new Map<ShrineKind, ShrineModel>();
    const ringGeometry = new THREE.RingGeometry(SHRINE_RADIUS - 0.18, SHRINE_RADIUS, 32).rotateX(
      -Math.PI / 2
    );
    const beamGeometry = new THREE.CylinderGeometry(0.25, 0.45, 16, 8, 1, true).translate(0, 8, 0);
    const beamTexture = glowTexture(true);
    this.disposables.push(ringGeometry, beamGeometry, beamTexture);
    this.run.shrines.forEach((shrine) => {
      const kind = shrine.kind ?? 'blessing';
      let model = models.get(kind);
      if (!model) {
        model = shrineModel(kind);
        models.set(kind, model);
        this.disposables.push(model.body, model.glow, model.emblem);
      }
      const y = this.ground(shrine.x, shrine.z);
      const turn = hash(shrine.id, 9) * Math.PI * 2;
      const body = new THREE.Mesh(model.body, this.lit);
      const glow = new THREE.Mesh(model.glow, this.glow);
      [body, glow].forEach((mesh) => {
        mesh.position.set(shrine.x, y, shrine.z);
        mesh.rotation.y = turn;
      });
      const emblem = new THREE.Mesh(model.emblem, this.glow);
      emblem.position.set(shrine.x, y + EMBLEM_HEIGHT[kind], shrine.z);
      const color = SHRINE_COLORS[kind];
      const ring = new THREE.Mesh(
        ringGeometry,
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, depthWrite: false })
      );
      ring.position.set(shrine.x, y + 0.08, shrine.z);
      // A column of light in the shrine's color, to find it from across the map.
      const beam = new THREE.Mesh(
        beamGeometry,
        new THREE.MeshBasicMaterial({
          map: beamTexture,
          color: new THREE.Color(color).multiplyScalar(0.22),
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          fog: false,
        })
      );
      // From the emblem up, so the shrine itself stays clear.
      beam.position.set(shrine.x, y + EMBLEM_HEIGHT[kind] + 0.6, shrine.z);
      this.scene.add(body, glow, emblem, ring, beam);
      this.shrines.push({ emblem, ring, beam, glow, height: y + EMBLEM_HEIGHT[kind] });
    });
  }

  resize() {
    const width = this.canvas.clientWidth || 1;
    const height = this.canvas.clientHeight || 1;
    const scale = Math.min(1, RENDER_HEIGHTS[this.quality] / height);
    this.renderer.setSize(Math.round(width * scale), Math.round(height * scale), false);
    // Vertices snap to half the pixels drawn: coarse enough to wobble, fine enough to read.
    psxSnap.value.set(Math.round((width * scale) / 4), Math.round((height * scale) / 4));
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  // Where a point of the world is on the canvas, in CSS pixels. For damage numbers.
  // Where a point of the map lands on screen; `front` is false when it's behind the camera.
  project(x: number, z: number, lift: number): { x: number; y: number; front: boolean } {
    this.target.set(x, this.ground(x, z) + lift, z).project(this.camera);
    return {
      x: (this.target.x * 0.5 + 0.5) * this.canvas.clientWidth,
      y: (-this.target.y * 0.5 + 0.5) * this.canvas.clientHeight,
      front: this.target.z < 1,
    };
  }

  // Where the hero is on the screen, `lift` above its feet (it may be in the air).
  projectHero(lift: number): { x: number; y: number; front: boolean } {
    const { player } = this.run;
    return this.project(player.x, player.z, player.y - this.ground(player.x, player.z) + lift);
  }

  handle(events: GameEvent[]) {
    for (let i = 0; i < events.length; i += 1) {
      const event = events[i];
      if (event.type === 'hit') {
        this.particles.burst(
          event.x,
          this.ground(event.x, event.z) + 0.9,
          event.z,
          event.crit ? 5 : 2,
          0xfff0c0,
          4
        );
      } else if (event.type === 'kill') {
        const big = event.kind === 'boss' || event.elite;
        const colors: Record<EnemyKind, number> = {
          husk: 0x7d9068,
          runner: 0x9a5fd0,
          brute: 0xa85040,
          spitter: 0x3f8f6a,
          boss: 0xff8a2a,
          charger: 0x8c6a46,
          bomber: 0x3a3a40,
          shield: 0x9ab0c8,
          summoner: 0x6a3a8a,
          swarm: 0x8a9a3a,
          barrel: 0xb03a2a,
          pot: 0xa8683a,
        };
        this.particles.burst(
          event.x,
          this.ground(event.x, event.z) + 0.8,
          event.z,
          big ? 60 : 9,
          colors[event.kind],
          big ? 11 : 6
        );
        // The body is thrown away from the hero, spinning and shrinking.
        const { player } = this.run;
        const dx = event.x - player.x;
        const dz = event.z - player.z;
        const len = Math.hypot(dx, dz) || 1;
        const fling = big ? 3 : 7 + Math.random() * 4;
        if (this.corpses.length >= MAX_CORPSES) this.corpses.shift();
        this.corpses.push({
          kind: event.kind,
          x: event.x,
          y: this.ground(event.x, event.z),
          z: event.z,
          vx: (dx / len) * fling,
          vy: big ? 4 : 6 + Math.random() * 3,
          vz: (dz / len) * fling,
          scale: event.elite && event.kind !== 'boss' ? 1.5 : 1,
          age: 0,
        });
        if (big) {
          this.shake = Math.max(this.shake, 0.6);
          this.hold = 4;
        }
      } else if (event.type === 'hurt') {
        // Bigger hits shake harder.
        const share = event.amount / Math.max(1, this.run.player.maxHp);
        this.shake = Math.max(this.shake, 0.25 + Math.min(0.6, share * 3));
        const { x, z } = this.run.player;
        this.particles.burst(x, this.ground(x, z) + 1, z, 14, 0xff4040, 6);
      } else if (event.type === 'nova' || event.type === 'blast') {
        const blast = event.type === 'blast';
        const ring = this.rings.find((r) => r.age >= 1) ?? this.rings[0];
        ring.age = 0;
        ring.radius = event.radius;
        ring.mesh.position.set(event.x, this.ground(event.x, event.z) + 0.4, event.z);
        (ring.mesh.material as THREE.MeshBasicMaterial).color.setHex(blast ? 0xffa040 : 0x9fd8ff);
        if (blast) {
          const y = this.ground(event.x, event.z) + 0.6;
          this.particles.burst(event.x, y, event.z, 26, 0xff8a2a, 9);
          this.particles.burst(event.x, y, event.z, 10, 0xfff2a0, 5);
          // A little mushroom: a column of smoke and a cap spreading on top.
          this.particles.smoke(event.x, y, event.z, 8, 0x8a7a70, 0.4, 4);
          this.particles.smoke(event.x, y + 2.2, event.z, 12, 0x6a5e58, event.radius * 0.5, 1);
          this.shake = Math.max(this.shake, 0.12 + event.radius * 0.04);
        }
      } else if (event.type === 'bolt') {
        this.drawBolt(event.points);
      } else if (event.type === 'levelup' || event.type === 'shrine') {
        const { x, z } = this.run.player;
        this.particles.burst(x, this.ground(x, z) + 1, z, 40, 0x6ae6ff, 9);
      } else if (event.type === 'land' && event.speed > 9) {
        const { x, z } = this.run.player;
        this.particles.burst(x, this.ground(x, z) + 0.2, z, 6, 0xd8c8a8, 3);
      } else if (event.type === 'powerup') {
        const { x, z } = this.run.player;
        this.particles.burst(
          x,
          this.ground(x, z) + 1.2,
          z,
          30,
          POWERUP_COLORS[event.kind] ?? 0xffffff,
          8
        );
        this.shake = Math.max(this.shake, event.kind === 'bomb' ? 0.7 : 0.2);
      } else if (event.type === 'explode') {
        const y = this.ground(event.x, event.z) + 0.4;
        this.particles.burst(event.x, y, event.z, 22, 0xff5a2a, 8);
        this.particles.smoke(event.x, y, event.z, 6, 0x5a4a44, event.radius * 0.4, 2);
        const share = Math.hypot(event.x - this.run.player.x, event.z - this.run.player.z);
        if (share < 12) this.shake = Math.max(this.shake, 0.25);
      } else if (event.type === 'pickup' && event.kind !== 'xp') {
        // Gems come in by the dozen; the rest sparkle when taken.
        const y = this.ground(event.x, event.z) + 0.8;
        this.particles.burst(event.x, y, event.z, 8, PICKUP_GLOW[event.kind], 4);
      } else if (event.type === 'itemBlast') {
        // An item's pop: sparks, no smoke and no shake, there can be a dozen a tick.
        const y = this.ground(event.x, event.z) + 0.6;
        this.particles.burst(event.x, y, event.z, 5, 0xffb03a, 5);
      } else if (event.type === 'jeitinho') {
        const { x, z } = this.run.player;
        this.particles.burst(x, this.ground(x, z) + 1.2, z, 60, 0x7dff6a, 10);
      } else if (event.type === 'bossPhase') {
        this.shake = Math.max(this.shake, 0.9);
        this.hold = 5;
      } else if (event.type === 'chest' || event.type === 'evolve') {
        const { x, z } = this.run.player;
        this.particles.burst(x, this.ground(x, z) + 1.2, z, 50, 0xffd23a, 10);
      } else if (event.type === 'ability') {
        const { x, z } = this.run.player;
        this.particles.burst(x, this.ground(x, z) + 1, z, 36, 0xffe08a, 9);
      } else if (event.type === 'evade') {
        const { x, z } = this.run.player;
        this.particles.burst(x, this.ground(x, z) + 1, z, 8, 0xd8f0ff, 4);
      } else if (event.type === 'dash') {
        const { x, z } = this.run.player;
        this.particles.burst(x, this.ground(x, z) + 0.6, z, 12, 0xffffff, 3);
      } else if (event.type === 'boss') {
        this.shake = 0.8;
      }
    }
  }

  private drawBolt(points: { x: number; z: number }[]) {
    const attribute = this.bolts.geometry.attributes.position as THREE.BufferAttribute;
    let used = this.boltLife > 0 ? this.bolts.geometry.drawRange.count : 0;
    for (let i = 0; i + 1 < points.length; i += 1) {
      // Each stretch is broken in three, with the joints knocked sideways.
      let fromX = points[i].x;
      let fromZ = points[i].z;
      let fromY = this.ground(fromX, fromZ) + 1.2;
      for (let part = 1; part <= 3 && used + 2 <= 512; part += 1) {
        const t = part / 3;
        const jitter = part < 3 ? 0.7 : 0;
        const toX =
          points[i].x + (points[i + 1].x - points[i].x) * t + (Math.random() - 0.5) * jitter;
        const toZ =
          points[i].z + (points[i + 1].z - points[i].z) * t + (Math.random() - 0.5) * jitter;
        const toY = this.ground(toX, toZ) + 1 + Math.random() * jitter;
        attribute.setXYZ(used, fromX, fromY, fromZ);
        attribute.setXYZ(used + 1, toX, toY, toZ);
        used += 2;
        fromX = toX;
        fromY = toY;
        fromZ = toZ;
      }
    }
    attribute.needsUpdate = true;
    this.bolts.geometry.setDrawRange(0, used);
    this.boltLife = 0.12;
  }

  private placeEnemy(e: Enemy, index: number, mesh: THREE.InstancedMesh) {
    const { player } = this.run;
    const scale = e.radius / ENEMIES[e.kind].radius;
    if (e.prop) {
      // Barrels and pots just stand there, each turned its own way.
      this.dummy.position.set(e.x, this.ground(e.x, e.z), e.z);
      this.dummy.rotation.set(0, e.id * 1.7, 0);
    } else {
      const hop = Math.abs(Math.sin(this.clock * (e.kind === 'runner' ? 14 : 8) + e.id)) * 0.18;
      // Charging enemies face where they run and lean into it.
      const charging = e.act && (e.act.kind === 'charge' || e.act.kind === 'rush');
      const facing =
        e.act && (e.act.dx || e.act.dz)
          ? Math.atan2(e.act.dx, e.act.dz)
          : Math.atan2(player.x - e.x, player.z - e.z);
      this.dummy.position.set(e.x, this.ground(e.x, e.z) + (charging ? 0 : hop), e.z);
      this.dummy.rotation.set(
        charging ? 0.3 : 0,
        facing,
        Math.sin(this.clock * 8 + e.id) * 0.08,
        'YXZ'
      );
    }
    this.dummy.scale.setScalar(scale);
    this.dummy.updateMatrix();
    mesh.setMatrixAt(index, this.dummy.matrix);
    if (e.flash > 0) this.color.setRGB(4, 4, 4);
    else if (this.run.buffs.freeze > 0) this.color.setRGB(0.7, 1.4, 2.4);
    else if (e.elite && e.kind !== 'boss') this.color.setRGB(1.9, 1.4, 0.5);
    else this.color.setRGB(1, 1, 1);
    mesh.setColorAt(index, this.color);
  }

  render(dt: number, view: CameraView) {
    if (this.hold > 0 && !this.reduceMotion) {
      // The canvas keeps the last frame.
      this.hold -= 1;
      return;
    }
    this.hold = 0;
    const { run } = this;
    const { player } = run;
    this.clock += dt;

    // Enemies and their shadows.
    const counts = new Map<THREE.InstancedMesh, number>();
    let shadowCount = 0;
    const shadow = (x: number, z: number, radius: number) => {
      if (shadowCount >= MAX_ENEMIES + 16) return;
      this.dummy.position.set(x, this.ground(x, z) + 0.06, z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.setScalar(radius);
      this.dummy.updateMatrix();
      this.shadows.setMatrixAt(shadowCount, this.dummy.matrix);
      shadowCount += 1;
    };
    for (let i = 0; i < run.enemies.length; i += 1) {
      const e = run.enemies[i];
      const frames = this.enemyMeshes.get(e.kind);
      // Each enemy steps at its kind's pace, out of step with its neighbours.
      const step = this.clock * (STEP_RATES[e.kind] ?? 3.5) + e.id * 0.37;
      const mesh = frames && frames[Math.floor(step) % frames.length];
      const index = (mesh && counts.get(mesh)) ?? 0;
      if (mesh && index < mesh.instanceMatrix.count) {
        this.placeEnemy(e, index, mesh);
        counts.set(mesh, index + 1);
        shadow(e.x, e.z, e.radius * 1.1);
      }
    }
    this.corpses = this.corpses.filter((c) => c.age < CORPSE_SECONDS);
    for (let i = 0; i < this.corpses.length; i += 1) {
      const c = this.corpses[i];
      c.age += dt;
      c.vy -= 25 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.z += c.vz * dt;
      const mesh = this.enemyMeshes.get(c.kind)?.[0];
      const index = (mesh && counts.get(mesh)) ?? 0;
      if (mesh && index < mesh.instanceMatrix.count) {
        const t = Math.min(1, c.age / CORPSE_SECONDS);
        this.dummy.position.set(c.x, c.y, c.z);
        this.dummy.rotation.set(t * 5, t * 3, t * 4);
        this.dummy.scale.setScalar(c.scale * (1 - t * 0.9));
        this.dummy.updateMatrix();
        mesh.setMatrixAt(index, this.dummy.matrix);
        this.color.setRGB(2 - t, 1.6 - t, 1.6 - t);
        mesh.setColorAt(index, this.color);
        counts.set(mesh, index + 1);
      }
    }
    this.enemyMeshes.forEach((frames) =>
      frames.forEach((mesh) => {
        mesh.count = counts.get(mesh) ?? 0;
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      })
    );
    shadow(player.x, player.z, 0.6);
    this.shadows.count = shadowCount;
    this.shadows.instanceMatrix.needsUpdate = true;

    // Shots.
    const shotCounts = new Map<ShotKind, number>();
    for (let i = 0; i < run.shots.length; i += 1) {
      const s = run.shots[i];
      const mesh = this.shotMeshes.get(s.kind);
      const index = shotCounts.get(s.kind) ?? 0;
      if (mesh && index < 400) {
        this.dummy.position.set(s.x, this.ground(s.x, s.z) + SHOT_HEIGHT, s.z);
        let spin = 0;
        if (s.kind === 'missile') spin = Math.atan2(s.vx, s.vz);
        else if (s.kind !== 'spit') spin = this.clock * 16 + s.id;
        // The bomb flies nose down, as if it were falling on its target.
        this.dummy.rotation.set(s.kind === 'missile' ? 0.45 : 0, spin, 0, 'YXZ');
        // Axes grow with Size; the evolved bomb is a giant.
        let size = 1;
        if (s.kind === 'axe') size = s.radius / 1.1;
        else if (s.kind === 'missile') size = s.radius / 0.45;
        this.dummy.scale.setScalar(size);
        this.dummy.updateMatrix();
        mesh.setMatrixAt(index, this.dummy.matrix);
        shotCounts.set(s.kind, index + 1);
        if (s.kind === 'missile' && run.tick % 2 === 0) {
          this.particles.smoke(s.x, this.ground(s.x, s.z) + 1, s.z, 1, 0xb8b8c0, 0.3, 0.6);
        } else if (s.kind === 'card' && dt > 0 && run.tick % 3 === 0) {
          this.particles.burst(s.x, this.ground(s.x, s.z) + 1, s.z, 1, 0x6a9cff, 0.5);
        }
      }
    }
    this.shotMeshes.forEach((mesh, kind) => {
      mesh.count = shotCounts.get(kind) ?? 0;
      mesh.instanceMatrix.needsUpdate = true;
    });

    // Burning ground.
    const zoneCount = Math.min(run.zones.length, 200);
    for (let i = 0; i < zoneCount; i += 1) {
      const zone = run.zones[i];
      this.dummy.position.set(zone.x, this.ground(zone.x, zone.z) + 0.16, zone.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.setScalar(
        zone.radius *
          Math.min(1, zone.life * 2) *
          (0.92 + Math.sin(this.clock * 9 + zone.id) * 0.08)
      );
      this.dummy.updateMatrix();
      this.zones.setMatrixAt(i, this.dummy.matrix);
      if ((run.tick + zone.id) % 9 === 0) {
        this.particles.burst(zone.x, this.ground(zone.x, zone.z) + 0.3, zone.z, 1, 0xff8a2a, 2.5);
      }
    }
    this.zones.count = zoneCount;
    this.zones.instanceMatrix.needsUpdate = true;

    // Danger on the ground.
    let fills = 0;
    let fireCount = 0;
    let laneCount = 0;
    for (let i = 0; i < run.hazards.length; i += 1) {
      const h = run.hazards[i];
      const y = this.ground(h.x, h.z) + 0.2;
      if (h.kind === 'blast' && fills < MAX_HAZARDS) {
        const filled = h.total > 0 ? 1 - h.delay / h.total : 1;
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.position.set(h.x, y, h.z);
        this.dummy.scale.setScalar(h.radius * Math.max(0.05, filled));
        this.dummy.updateMatrix();
        this.warnFill.setMatrixAt(fills, this.dummy.matrix);
        this.dummy.scale.setScalar(h.radius);
        this.dummy.updateMatrix();
        this.warnRing.setMatrixAt(fills, this.dummy.matrix);
        fills += 1;
      } else if (h.kind === 'fire' && fireCount < MAX_HAZARDS) {
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.position.set(h.x, y - 0.02, h.z);
        this.dummy.scale.setScalar(
          h.radius * Math.min(1, h.life * 2) * (0.9 + Math.sin(this.clock * 10 + h.id) * 0.1)
        );
        this.dummy.updateMatrix();
        this.fires.setMatrixAt(fireCount, this.dummy.matrix);
        fireCount += 1;
        if ((run.tick + h.id) % 10 === 0) {
          this.particles.burst(h.x, y + 0.2, h.z, 1, 0xff8a2a, 2);
        }
      } else if (h.kind === 'lane' && laneCount < MAX_HAZARDS && h.x2 !== undefined) {
        const lx = h.x2 - h.x;
        const lz = (h.z2 ?? h.z) - h.z;
        this.dummy.position.set(h.x + lx / 2, y, h.z + lz / 2);
        this.dummy.rotation.set(0, Math.atan2(lx, lz), 0);
        this.dummy.scale.set(h.radius * 2, 1, Math.hypot(lx, lz));
        this.dummy.updateMatrix();
        this.lanes.setMatrixAt(laneCount, this.dummy.matrix);
        laneCount += 1;
      }
    }
    this.warnFill.count = fills;
    this.warnRing.count = fills;
    this.fires.count = fireCount;
    this.lanes.count = laneCount;
    [this.warnFill, this.warnRing, this.fires, this.lanes].forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
    });

    // Things to pick up: each kind floats and turns its own way over a pool of its light.
    const dropCounts = new Map<PickupKind, number>();
    let glows = 0;
    let beams = 0;
    const shownPickups = Math.min(run.pickups.length, MAX_PICKUPS_SHOWN);
    for (let i = 0; i < shownPickups; i += 1) {
      const p = run.pickups[i];
      const mesh = this.pickups.get(p.kind) as THREE.InstancedMesh;
      const n = dropCounts.get(p.kind) ?? 0;
      if (n < mesh.instanceMatrix.count) {
        const ground = this.ground(p.x, p.z);
        const phase = this.clock + p.id * 0.37;
        let scale = 1.5;
        let lift = 0.6 + Math.sin(phase * 3) * 0.1;
        let turn = phase * 2;
        let glow = PICKUP_GLOW[p.kind];
        let glowSize = 1.6;
        if (p.kind === 'xp') {
          glow = xpTint(p.value);
          scale = xpScale(p.value);
          glowSize = 1.1 * scale;
          lift = 0.45 * scale + Math.sin(phase * 4) * 0.08;
          this.color.setHex(glow);
          mesh.setColorAt(n, this.color);
        } else if (p.kind === 'gold') {
          // A coin spins fast on its edge, catching the light.
          scale = 1.15;
          turn = phase * 6;
          glowSize = 1.2;
        } else if (p.kind === 'heart') {
          scale = 1.6 * (1 + Math.max(0, Math.sin(phase * 7)) * 0.12);
          turn = Math.sin(phase * 1.5) * 0.9;
          glowSize = 2;
        } else if (p.kind === 'chest') {
          scale = 1.7;
          lift = 0.45 + Math.abs(Math.sin(phase * 2)) * 0.15;
          turn = phase * 0.8;
          glowSize = 3;
          if (beams < MAX_DROPS) {
            this.dummy.position.set(p.x, ground, p.z);
            this.dummy.rotation.set(0, 0, 0);
            this.dummy.scale.set(1, 1 + Math.sin(phase * 3) * 0.06, 1);
            this.dummy.updateMatrix();
            this.chestBeams.setMatrixAt(beams, this.dummy.matrix);
            this.color.setHex(glow).multiplyScalar(0.35);
            this.chestBeams.setColorAt(beams, this.color);
            beams += 1;
          }
        }
        this.dummy.position.set(p.x, ground + lift, p.z);
        this.dummy.rotation.set(0, turn, 0);
        this.dummy.scale.setScalar(scale);
        this.dummy.updateMatrix();
        mesh.setMatrixAt(n, this.dummy.matrix);
        dropCounts.set(p.kind, n + 1);

        this.dummy.position.set(p.x, ground + 0.06, p.z);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.scale.setScalar(glowSize * (1 + Math.sin(phase * 3) * 0.08));
        this.dummy.updateMatrix();
        this.pickupGlows.setMatrixAt(glows, this.dummy.matrix);
        this.color.setHex(glow).multiplyScalar(p.kind === 'xp' ? 0.45 : 0.6);
        this.pickupGlows.setColorAt(glows, this.color);
        glows += 1;
      }
    }
    this.pickups.forEach((mesh, kind) => {
      mesh.count = dropCounts.get(kind) ?? 0;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
    [this.pickupGlows, this.chestBeams].forEach((mesh, i) => {
      mesh.count = i === 0 ? glows : beams;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });

    // Ballot boxes in orbit, screens facing out.
    const stats = runStats(run);
    const urns = run.weapons.find((w) => w.id === 'urns');
    const urnsShown = urns ? Math.min(MAX_URNS, urnCount(urns, stats)) : 0;
    for (let i = 0; urns && i < urnsShown; i += 1) {
      const angle = urns.angle + (i / urnsShown) * Math.PI * 2;
      const x = player.x + Math.cos(angle) * urnOrbit(stats, urns);
      const z = player.z + Math.sin(angle) * urnOrbit(stats, urns);
      this.dummy.position.set(x, this.ground(x, z) + 1 + Math.sin(this.clock * 5 + i) * 0.12, z);
      this.dummy.rotation.set(0, Math.PI / 2 - angle, 0);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.urns.setMatrixAt(i, this.dummy.matrix);
      // A faint trail behind each box.
      if (dt > 0 && (run.tick + i) % 8 === 0) {
        this.particles.burst(x, this.ground(x, z) + 1, z, 1, 0xd9d2bd, 0.4);
      }
    }
    this.urns.count = urnsShown;
    this.urns.instanceMatrix.needsUpdate = true;

    // The aura of tears: a pale disc under the hero, with drops falling inside it.
    const aura = run.weapons.find((w) => w.id === 'aura');
    this.aura.visible = aura !== undefined;
    if (aura) {
      const radius = auraRadius(aura, stats);
      this.aura.position.set(player.x, this.ground(player.x, player.z) + 0.12, player.z);
      this.aura.scale.setScalar(radius * (1 + Math.sin(this.clock * 4) * 0.03));
      if (dt > 0 && run.tick % 3 === 0) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.sqrt(Math.random()) * radius;
        const x = player.x + Math.cos(angle) * dist;
        const z = player.z + Math.sin(angle) * dist;
        this.particles.burst(x, this.ground(x, z) + 2.2, z, 1, 0x8fd8ff, 0.4);
      }
    }

    // Shrines.
    run.shrines.forEach((shrine, i) => {
      const shown = this.shrines[i];
      // A Camelô that just sold starts below zero (see collectPickups).
      const charge = Math.max(0, shrine.charge);
      const open = !shrine.used;
      shown.emblem.visible = open;
      shown.ring.visible = open;
      shown.beam.visible = open;
      // A used shrine goes dark: its runes, water and fire are out.
      shown.glow.visible = open;
      shown.emblem.rotation.y = this.clock * 1.5 + i;
      shown.emblem.position.y = shown.height + Math.sin(this.clock * 2 + i) * 0.15;
      shown.emblem.scale.setScalar(1 + charge * 0.8);
      (shown.ring.material as THREE.MeshBasicMaterial).opacity = 0.35 + charge * 0.65;
      shown.beam.scale.set(1 + charge * 0.6, 1, 1 + charge * 0.6);
    });

    // Map chests: gone once bought, swelling while being bought.
    run.chests.forEach((chest, i) => {
      const mesh = this.chestMeshes[i];
      mesh.visible = !chest.opened;
      mesh.scale.setScalar(1.2 + chest.charge * 0.35);
    });

    // Shock waves and lightning fade out.
    this.rings.forEach((ring) => {
      if (ring.age >= 1) {
        ring.mesh.visible = false;
        return;
      }
      ring.age += dt * 3.2;
      ring.mesh.visible = true;
      ring.mesh.scale.setScalar(ring.radius * Math.min(1, ring.age * 1.15));
      (ring.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - ring.age;
    });
    this.boltLife -= dt;
    this.bolts.visible = this.boltLife > 0;

    // The hero.
    this.hero.root.position.set(player.x, player.y, player.z);
    this.hero.root.visible = player.invuln <= 0 || Math.floor(this.clock * 20) % 2 === 0;
    if (run.buffs.sprint > 0 && run.tick % 2 === 0) {
      this.particles.burst(
        player.x,
        this.ground(player.x, player.z) + 0.2,
        player.z,
        1,
        0xd8c8a8,
        2
      );
    }
    if (run.buffs.star > 0 && run.tick % 4 === 0) {
      this.particles.burst(player.x, player.y + 1.2, player.z, 1, 0xfff27a, 3);
    }

    this.particles.update(dt);
    // The camera orbits the hero where the player turned it, and shakes when something big happens.
    // Its height follows the jump only halfway, so hopping doesn't bob the whole screen.
    const ground = this.ground(player.x, player.z);
    const aimY = ground + (player.y - ground) * 0.5 + CAMERA_AIM;
    const smooth = Math.min(1, dt * 14);
    this.aim.set(
      this.aim.x + (player.x - this.aim.x) * smooth,
      this.aim.y + (aimY - this.aim.y) * smooth,
      this.aim.z + (player.z - this.aim.z) * smooth
    );
    if (this.clock <= dt) this.aim.set(player.x, aimY, player.z);
    // A cliff between the hero and the camera pulls the camera in front of it: in at once, back
    // out slowly, so walking along a wall doesn't make it pump.
    const outX = Math.sin(view.yaw) * Math.cos(view.pitch);
    const outY = Math.sin(view.pitch);
    const outZ = Math.cos(view.yaw) * Math.cos(view.pitch);
    let reach = 1;
    for (let k = 1; k <= 12; k += 1) {
      const t = k / 12;
      const d = t * view.distance;
      const y = this.aim.y + outY * d;
      if (this.ground(this.aim.x + outX * d, this.aim.z + outZ * d) + 0.4 > y) {
        reach = Math.max(0.15, (k - 1) / 12);
        break;
      }
    }
    this.reach =
      reach < this.reach ? reach : this.reach + (reach - this.reach) * Math.min(1, dt * 2);
    const distance = view.distance * this.reach;
    this.camera.position.set(
      this.aim.x + outX * distance,
      this.aim.y + outY * distance,
      this.aim.z + outZ * distance
    );
    // Never under the hills.
    const floor = this.ground(this.camera.position.x, this.camera.position.z) + 0.5;
    if (this.camera.position.y < floor) this.camera.position.y = floor;
    this.camera.lookAt(this.aim);
    this.shake = Math.max(0, this.shake - dt * 1.8);
    const jolt = this.reduceMotion ? 0 : this.shake * this.shake * 1.6;
    this.camera.position.x += (Math.random() - 0.5) * jolt;
    this.camera.position.y += (Math.random() - 0.5) * jolt;
    // A tall phone screen sees less to the sides, so it gets a wider view.
    const fov = view.fov + (this.camera.aspect < 1 ? 12 : 0);
    if (this.camera.fov !== fov) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    this.hero.update(player, view.yaw, this.camera, dt);
    this.sky.update(run.time, run.bossAlive, dt, this.camera.position);

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const { material } = mesh;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else if (material) material.dispose();
    });
    this.disposables.forEach((d) => d.dispose());
    this.renderer.dispose();
  }
}
