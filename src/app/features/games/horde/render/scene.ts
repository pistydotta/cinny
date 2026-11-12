/* eslint-disable no-param-reassign */
import * as THREE from 'three';
import { ENEMIES, MAX_ENEMIES, SHOT_HEIGHT, SHRINE_RADIUS } from '../engine/data';
import { auraRadius, runStats, urnCount, urnOrbit } from '../engine/run';
import { MAP_HALF, heightAt } from '../engine/terrain';
import { Enemy, EnemyKind, GameEvent, RunState, ShotKind, ShrineKind } from '../engine/types';
import { HERO_SPRITES } from '../sprites';
import { Particles } from './particles';
import { SpriteHero } from './spriteHero';
import { buildTerrain } from './terrainMesh';
import { Sky } from './sky';
import { ball, box, cone, enemyGeometry, grainTexture, merge } from './models';

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
const MAX_HAZARDS = 120;
const SHRINE_COLORS: Record<ShrineKind, number> = {
  blessing: 0x6ae6ff,
  curse: 0xb04aff,
  gold: 0xffd23a,
  heal: 0x5aff8a,
  challenge: 0xff5a3a,
};
const SHOT_KINDS: ShotKind[] = ['card', 'missile', 'axe', 'spit'];
const SKY = 0x1a1326;
const MAX_CORPSES = 48;
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

  private enemyMeshes = new Map<EnemyKind, THREE.InstancedMesh>();

  private shotMeshes = new Map<ShotKind, THREE.InstancedMesh>();

  private shadows: THREE.InstancedMesh;

  private pickups: THREE.InstancedMesh;

  private zones: THREE.InstancedMesh;

  // Danger on the ground: the circle that fills up before a blast, its outline, burning ground
  // and the lanes of charges and stampedes.
  private warnFill: THREE.InstancedMesh;

  private warnRing: THREE.InstancedMesh;

  private fires: THREE.InstancedMesh;

  private lanes: THREE.InstancedMesh;

  private urns: THREE.InstancedMesh;

  private aura: THREE.Mesh;

  private shrines: { crystal: THREE.Mesh; ring: THREE.Mesh }[] = [];

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

    this.buildGround();
    this.buildDecor();
    this.buildChests();

    KINDS.forEach((kind) => {
      const mesh = instanced(
        enemyGeometry(kind),
        this.lit,
        kind === 'boss' ? 6 : MAX_ENEMIES + 8 + MAX_CORPSES
      );
      this.enemyMeshes.set(kind, mesh);
      this.scene.add(mesh);
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
    this.pickups = instanced(
      new THREE.OctahedronGeometry(0.3, 0),
      new THREE.MeshLambertMaterial({ flatShading: true, emissive: 0x222222 }),
      420
    );
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
      12
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
    this.scene.add(this.shadows, this.zones, this.pickups, this.urns, this.aura);

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
    this.resize();
  }

  private buildGround() {
    const texture = grainTexture();
    texture.repeat.set(90, 90);
    const terrain = buildTerrain(this.run.map, texture);
    this.scene.add(terrain.group);
    this.disposables.push(...terrain.disposables, texture);
  }

  private buildDecor() {
    const { map } = this.run;
    const rocks = instanced(ball(0.5, 0x6a6672), this.lit, 220);
    const tufts = instanced(cone(0.22, 0.6, 3, 0x6f9448, { at: [0, 0.3, 0] }), this.lit, 1200);
    const trees = instanced(
      merge([
        box(0.5, 3, 0.5, 0x3a2c24, { at: [0, 1.5, 0] }),
        cone(1.7, 3.2, 5, 0x24402e, { at: [0, 4.2, 0] }),
        cone(1.2, 2.4, 5, 0x2e5238, { at: [0, 5.8, 0] }),
      ]),
      this.lit,
      420
    );
    const place = (mesh: THREE.InstancedMesh, i: number, x: number, z: number, size: number) => {
      this.dummy.position.set(x, this.ground(x, z), z);
      this.dummy.rotation.set(0, hash(i, x) * 6, 0);
      this.dummy.scale.setScalar(size);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(mesh.count, this.dummy.matrix);
      // eslint-disable-next-line no-param-reassign
      mesh.count += 1;
    };
    [rocks, tufts, trees].forEach((mesh) => {
      // eslint-disable-next-line no-param-reassign
      mesh.count = 0;
    });
    // Rocks and grass anywhere on the square, tops of the blocks included, never on a cliff face.
    const scatter = (mesh: THREE.InstancedMesh, count: number, salt: number, size: number) => {
      for (let i = 0; i < count; i += 1) {
        const x = (hash(i, salt) * 2 - 1) * (MAP_HALF - 3);
        const z = (hash(salt, i) * 2 - 1) * (MAP_HALF - 3);
        const h = this.ground(x, z);
        const steep =
          Math.abs(this.ground(x + 0.8, z) - h) + Math.abs(this.ground(x, z + 0.8) - h) > 0.6;
        if (!steep && Math.hypot(x, z) > 3) place(mesh, i, x, z, size + hash(i + salt, 9) * 0.9);
      }
    };
    scatter(rocks, 220, 11, 0.5);
    scatter(tufts, 1200, 23, 0.6);
    // A forest on the mountains around the square.
    for (let i = 0; i < 420; i += 1) {
      const along = (hash(i, 37) * 2 - 1) * (MAP_HALF + 30);
      const out = MAP_HALF - 2 + hash(37, i) * 34;
      const sign = hash(i, 71) < 0.5 ? -1 : 1;
      const onX = hash(71, i) < 0.5;
      const x = onX ? sign * out : along;
      const z = onX ? along : sign * out;
      place(trees, i, x, z, 0.7 + hash(i, 5) * 1.1);
    }
    // Torches on both sides of the top of every ramp, so climbs are easy to spot from afar.
    const torches = instanced(
      merge([
        box(0.25, 1.6, 0.25, 0x3a2c24, { at: [0, 0.8, 0] }),
        box(0.45, 0.3, 0.45, 0x4a4652, { at: [0, 1.65, 0] }),
      ]),
      this.lit,
      map.ramps.length * 2
    );
    const flames = instanced(
      cone(0.28, 0.7, 4, 0xff8a2a, { at: [0, 2.1, 0] }),
      this.glow,
      map.ramps.length * 2
    );
    torches.count = 0;
    flames.count = 0;
    map.ramps.forEach((r) => {
      const length = Math.hypot(r.x2 - r.x1, r.z2 - r.z1);
      const ax = (r.x2 - r.x1) / length;
      const az = (r.z2 - r.z1) / length;
      [-1, 1].forEach((sign) => {
        const x = r.x2 - ax * 1.6 - az * sign * (r.width / 2 + 0.3);
        const z = r.z2 - az * 1.6 + ax * sign * (r.width / 2 + 0.3);
        this.dummy.position.set(x, r.h2, z);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.scale.setScalar(1);
        this.dummy.updateMatrix();
        torches.setMatrixAt(torches.count, this.dummy.matrix);
        flames.setMatrixAt(flames.count, this.dummy.matrix);
        torches.count += 1;
        flames.count += 1;
      });
    });
    this.scene.add(rocks, tufts, trees, torches, flames);
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
    const base = merge(
      [
        new THREE.CylinderGeometry(1.1, 1.4, 0.5, 6).translate(0, 0.25, 0),
        new THREE.CylinderGeometry(0.35, 0.5, 1.4, 5).translate(0, 1.2, 0),
      ].map((g) => {
        const flat = g.toNonIndexed();
        const colors = new Float32Array(flat.attributes.position.count * 3).fill(0.42);
        flat.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        flat.deleteAttribute('uv');
        return flat;
      })
    );
    const crystalGeometry = new THREE.OctahedronGeometry(0.55, 0);
    const ringGeometry = new THREE.RingGeometry(SHRINE_RADIUS - 0.18, SHRINE_RADIUS, 24).rotateX(
      -Math.PI / 2
    );
    this.disposables.push(base, crystalGeometry, ringGeometry);
    this.run.shrines.forEach((shrine) => {
      const y = this.ground(shrine.x, shrine.z);
      const pillar = new THREE.Mesh(base, this.lit);
      pillar.position.set(shrine.x, y, shrine.z);
      const color = SHRINE_COLORS[shrine.kind ?? 'blessing'];
      const crystal = new THREE.Mesh(crystalGeometry, new THREE.MeshBasicMaterial({ color }));
      crystal.position.set(shrine.x, y + 2.7, shrine.z);
      const ring = new THREE.Mesh(
        ringGeometry,
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
        })
      );
      ring.position.set(shrine.x, y + 0.25, shrine.z);
      this.scene.add(pillar, crystal, ring);
      this.shrines.push({ crystal, ring });
    });
  }

  resize() {
    const width = this.canvas.clientWidth || 1;
    const height = this.canvas.clientHeight || 1;
    const scale = Math.min(1, RENDER_HEIGHTS[this.quality] / height);
    this.renderer.setSize(Math.round(width * scale), Math.round(height * scale), false);
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
    const counts = new Map<EnemyKind, number>();
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
      const mesh = this.enemyMeshes.get(e.kind);
      const index = counts.get(e.kind) ?? 0;
      if (mesh && index < mesh.instanceMatrix.count) {
        this.placeEnemy(e, index, mesh);
        counts.set(e.kind, index + 1);
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
      const mesh = this.enemyMeshes.get(c.kind);
      const index = counts.get(c.kind) ?? 0;
      if (mesh && index < mesh.instanceMatrix.count) {
        const t = Math.min(1, c.age / CORPSE_SECONDS);
        this.dummy.position.set(c.x, c.y, c.z);
        this.dummy.rotation.set(t * 5, t * 3, t * 4);
        this.dummy.scale.setScalar(c.scale * (1 - t * 0.9));
        this.dummy.updateMatrix();
        mesh.setMatrixAt(index, this.dummy.matrix);
        this.color.setRGB(2 - t, 1.6 - t, 1.6 - t);
        mesh.setColorAt(index, this.color);
        counts.set(c.kind, index + 1);
      }
    }
    this.enemyMeshes.forEach((mesh, kind) => {
      mesh.count = counts.get(kind) ?? 0;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
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

    // Things to pick up.
    const pickupCount = Math.min(run.pickups.length, 420);
    for (let i = 0; i < pickupCount; i += 1) {
      const p = run.pickups[i];
      let scale = 0.8 + Math.min(1.2, p.value * 0.06);
      if (p.kind === 'xp') this.color.setHex(p.value >= 6 ? 0x7dff6a : 0x4ad2ff);
      else if (p.kind === 'gold') this.color.setHex(0xffd23a);
      else if (p.kind === 'heart') this.color.setHex(0xff4a6a);
      else if (p.kind === 'magnet') this.color.setHex(0xffffff);
      else if (p.kind === 'chest') this.color.setHex(0xff9a2a);
      else this.color.setHex(POWERUP_COLORS[p.kind] ?? 0xffffff);
      if (p.kind === 'chest') scale = 3;
      else if (p.kind !== 'xp') scale = 1.5;
      this.dummy.position.set(
        p.x,
        this.ground(p.x, p.z) + 0.5 + Math.sin(this.clock * 4 + p.id) * 0.12,
        p.z
      );
      this.dummy.rotation.set(0, this.clock * 2.5 + p.id, 0);
      this.dummy.scale.setScalar(scale);
      this.dummy.updateMatrix();
      this.pickups.setMatrixAt(i, this.dummy.matrix);
      this.pickups.setColorAt(i, this.color);
    }
    this.pickups.count = pickupCount;
    this.pickups.instanceMatrix.needsUpdate = true;
    if (this.pickups.instanceColor) this.pickups.instanceColor.needsUpdate = true;

    // Ballot boxes in orbit, screens facing out.
    const stats = runStats(run);
    const urns = run.weapons.find((w) => w.id === 'urns');
    const urnsShown = urns ? Math.min(12, urnCount(urns, stats)) : 0;
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
      shown.crystal.visible = !shrine.used;
      shown.crystal.rotation.y = this.clock * 1.5;
      shown.crystal.scale.setScalar(1 + shrine.charge * 0.8);
      shown.ring.visible = !shrine.used;
      (shown.ring.material as THREE.MeshBasicMaterial).opacity = 0.35 + shrine.charge * 0.65;
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
