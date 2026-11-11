/* eslint-disable no-param-reassign */
import * as THREE from 'three';
import { ARENA_RADIUS, ENEMIES, MAX_ENEMIES, SHRINE_RADIUS } from '../engine/data';
import { bladeCount, bladeOrbit, runStats } from '../engine/run';
import { Enemy, EnemyKind, GameEvent, RunState, ShotKind } from '../engine/types';
import { HERO_SPRITES } from '../sprites';
import { Particles } from './particles';
import { SpriteHero } from './spriteHero';
import {
  PlayerModel,
  ball,
  box,
  cone,
  enemyGeometry,
  grainTexture,
  merge,
  playerModel,
} from './models';

// Draws a run with three.js. The engine knows nothing about this file: every frame the scene
// reads the run's state and places things, and the events of each tick become effects.
//
// The old-console look comes from rendering at a low resolution and stretching it without
// smoothing, flat-shaded models with colors per vertex, and fog close to the camera.

const RENDER_HEIGHT = 360;
const KINDS: EnemyKind[] = ['husk', 'runner', 'brute', 'spitter', 'boss'];
const SHOT_KINDS: ShotKind[] = ['ember', 'axe', 'spit'];
const SKY = 0x1a1326;
// Behind and above the hero, low enough to see the horde coming from the horizon.
const CAMERA_UP = 12.5;
const CAMERA_BACK = 15;

// Gentle hills, only for the eyes: the run itself is played on a flat plane.
export const heightAt = (x: number, z: number): number =>
  Math.sin(x * 0.07) * Math.cos(z * 0.06) * 0.9 + Math.sin((x + z) * 0.03) * 0.6;

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

  private camera = new THREE.PerspectiveCamera(46, 1, 0.5, 160);

  private lit = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

  private glow = new THREE.MeshBasicMaterial({ vertexColors: true });

  private enemyMeshes = new Map<EnemyKind, THREE.InstancedMesh>();

  private shotMeshes = new Map<ShotKind, THREE.InstancedMesh>();

  private shadows: THREE.InstancedMesh;

  private pickups: THREE.InstancedMesh;

  private zones: THREE.InstancedMesh;

  private blades: THREE.InstancedMesh;

  private shrines: { crystal: THREE.Mesh; ring: THREE.Mesh }[] = [];

  private rings: { mesh: THREE.Mesh; age: number; radius: number }[] = [];

  private bolts: THREE.LineSegments;

  private boltLife = 0;

  private player: PlayerModel | undefined;

  private sprite: SpriteHero | undefined;

  private hero: THREE.Object3D;

  private particles: Particles;

  private dummy = new THREE.Object3D();

  private color = new THREE.Color();

  private target = new THREE.Vector3();

  private shake = 0;

  private clock = 0;

  private walk = 0;

  private disposables: { dispose: () => void }[] = [];

  constructor(private canvas: HTMLCanvasElement, private run: RunState) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(1);
    this.scene.background = new THREE.Color(SKY);
    this.scene.fog = new THREE.Fog(SKY, 30, 78);

    this.scene.add(new THREE.HemisphereLight(0xb8c4ff, 0x4a3a30, 2.2));
    const sun = new THREE.DirectionalLight(0xffc890, 2.6);
    sun.position.set(-6, 10, 4);
    this.scene.add(sun);

    this.buildGround();
    this.buildDecor();

    KINDS.forEach((kind) => {
      const mesh = instanced(enemyGeometry(kind), this.lit, kind === 'boss' ? 4 : MAX_ENEMIES + 8);
      this.enemyMeshes.set(kind, mesh);
      this.scene.add(mesh);
    });

    const shotShapes: Record<ShotKind, THREE.BufferGeometry> = {
      ember: ball(0.34, 0xffb347),
      spit: ball(0.4, 0xb04cff),
      axe: merge([
        box(1.5, 0.14, 0.3, 0xd8dde6),
        box(0.3, 0.14, 1.5, 0xd8dde6),
        box(0.4, 0.2, 0.4, 0x8a6a3a),
      ]),
    };
    SHOT_KINDS.forEach((kind) => {
      const mesh = instanced(shotShapes[kind], kind === 'axe' ? this.lit : this.glow, 400);
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
    this.pickups = instanced(
      new THREE.OctahedronGeometry(0.3, 0),
      new THREE.MeshLambertMaterial({ flatShading: true, emissive: 0x222222 }),
      420
    );
    this.blades = instanced(
      merge([box(0.22, 0.08, 1.3, 0xe6ecf5), box(0.5, 0.1, 0.16, 0xc79a3a, { at: [0, 0, -0.6] })]),
      this.lit,
      12
    );
    this.scene.add(this.shadows, this.zones, this.pickups, this.blades);

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

    const sheet = HERO_SPRITES[run.character];
    if (sheet) {
      this.sprite = new SpriteHero(sheet);
      this.disposables.push(this.sprite);
    } else this.player = playerModel(run.character, this.lit);
    this.hero = this.sprite?.root ?? this.player?.root ?? new THREE.Group();
    this.scene.add(this.hero);

    this.particles = new Particles(this.scene);
    this.disposables.push(this.lit, this.glow, flat, boltGeometry);
    this.camera.position.set(0, CAMERA_UP, CAMERA_BACK);
    this.resize();
  }

  private buildGround() {
    const size = 200;
    const cells = 80;
    const geometry = new THREE.PlaneGeometry(size, size, cells, cells).rotateX(-Math.PI / 2);
    const { position } = geometry.attributes;
    const colors = new Float32Array(position.count * 3);
    const grass = new THREE.Color(0x4f6b3a);
    const dirt = new THREE.Color(0x6b5236);
    const ash = new THREE.Color(0x2c2630);
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i);
      const z = position.getZ(i);
      position.setY(i, heightAt(x, z));
      const patch = hash(Math.floor(x / 8), Math.floor(z / 8));
      const c = this.color.copy(grass).lerp(dirt, patch > 0.62 ? 0.75 : hash(x, z) * 0.3);
      if (Math.hypot(x, z) > ARENA_RADIUS) c.lerp(ash, 0.8);
      c.multiplyScalar(0.85 + hash(z, x) * 0.3);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const texture = grainTexture();
    texture.repeat.set(70, 70);
    const material = new THREE.MeshLambertMaterial({
      vertexColors: true,
      flatShading: true,
      map: texture,
    });
    this.scene.add(new THREE.Mesh(geometry, material));
    this.disposables.push(geometry, material, texture);
  }

  private buildDecor() {
    // The wall of the arena: standing stones with embers on top.
    const stones = instanced(
      merge([
        box(1.6, 4.4, 1.6, 0x4a4652, { at: [0, 2.2, 0] }),
        box(2, 0.5, 2, 0x5c5866, { at: [0, 4.5, 0] }),
      ]),
      this.lit,
      72
    );
    const flames = instanced(cone(0.5, 1.2, 4, 0xff8a2a, { at: [0, 5.4, 0] }), this.glow, 72);
    for (let i = 0; i < 72; i += 1) {
      const angle = (i / 72) * Math.PI * 2;
      const x = Math.cos(angle) * (ARENA_RADIUS + 1.2);
      const z = Math.sin(angle) * (ARENA_RADIUS + 1.2);
      this.dummy.position.set(x, heightAt(x, z) - 0.3, z);
      this.dummy.rotation.set(0, -angle, 0);
      this.dummy.scale.setScalar(0.9 + hash(i, 3) * 0.4);
      this.dummy.updateMatrix();
      stones.setMatrixAt(i, this.dummy.matrix);
      flames.setMatrixAt(i, this.dummy.matrix);
    }
    stones.count = 72;
    flames.count = 72;

    const rocks = instanced(ball(0.5, 0x6a6672), this.lit, 90);
    const tufts = instanced(cone(0.22, 0.6, 3, 0x6f9448, { at: [0, 0.3, 0] }), this.lit, 400);
    const trees = instanced(
      merge([
        box(0.5, 3, 0.5, 0x3a2c24, { at: [0, 1.5, 0] }),
        cone(1.7, 3.2, 5, 0x24402e, { at: [0, 4.2, 0] }),
        cone(1.2, 2.4, 5, 0x2e5238, { at: [0, 5.8, 0] }),
      ]),
      this.lit,
      90
    );
    const scatter = (
      mesh: THREE.InstancedMesh,
      count: number,
      min: number,
      max: number,
      salt: number
    ) => {
      for (let i = 0; i < count; i += 1) {
        const angle = hash(i, salt) * Math.PI * 2;
        const dist = min + hash(salt, i) * (max - min);
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;
        this.dummy.position.set(x, heightAt(x, z), z);
        this.dummy.rotation.set(0, hash(i, i + salt) * 6, 0);
        this.dummy.scale.setScalar(0.6 + hash(i + salt, 9) * 0.9);
        this.dummy.updateMatrix();
        mesh.setMatrixAt(i, this.dummy.matrix);
      }
      mesh.count = count;
    };
    scatter(rocks, 90, 4, ARENA_RADIUS - 2, 11);
    scatter(tufts, 400, 2, ARENA_RADIUS - 1, 23);
    scatter(trees, 90, ARENA_RADIUS + 5, ARENA_RADIUS + 26, 37);
    this.scene.add(stones, flames, rocks, tufts, trees);
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
      const y = heightAt(shrine.x, shrine.z);
      const pillar = new THREE.Mesh(base, this.lit);
      pillar.position.set(shrine.x, y, shrine.z);
      const crystal = new THREE.Mesh(
        crystalGeometry,
        new THREE.MeshBasicMaterial({ color: 0x6ae6ff })
      );
      crystal.position.set(shrine.x, y + 2.7, shrine.z);
      const ring = new THREE.Mesh(
        ringGeometry,
        new THREE.MeshBasicMaterial({
          color: 0x6ae6ff,
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
    const scale = Math.min(1, RENDER_HEIGHT / height);
    this.renderer.setSize(Math.round(width * scale), Math.round(height * scale), false);
    this.camera.aspect = width / height;
    // A tall phone screen sees less to the sides, so the camera backs off a little.
    this.camera.fov = width < height ? 58 : 46;
    this.camera.updateProjectionMatrix();
  }

  // Where a point of the world is on the canvas, in CSS pixels. For damage numbers.
  project(x: number, z: number, lift: number): { x: number; y: number } {
    this.target.set(x, heightAt(x, z) + lift, z).project(this.camera);
    return {
      x: (this.target.x * 0.5 + 0.5) * this.canvas.clientWidth,
      y: (-this.target.y * 0.5 + 0.5) * this.canvas.clientHeight,
    };
  }

  handle(events: GameEvent[]) {
    for (let i = 0; i < events.length; i += 1) {
      const event = events[i];
      if (event.type === 'hit') {
        this.particles.burst(
          event.x,
          heightAt(event.x, event.z) + 0.9,
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
        };
        this.particles.burst(
          event.x,
          heightAt(event.x, event.z) + 0.8,
          event.z,
          big ? 60 : 9,
          colors[event.kind],
          big ? 11 : 6
        );
        if (big) this.shake = Math.max(this.shake, 0.5);
      } else if (event.type === 'hurt') {
        this.shake = Math.max(this.shake, 0.45);
        const { x, z } = this.run.player;
        this.particles.burst(x, heightAt(x, z) + 1, z, 14, 0xff4040, 6);
      } else if (event.type === 'nova') {
        const ring = this.rings.find((r) => r.age >= 1) ?? this.rings[0];
        ring.age = 0;
        ring.radius = event.radius;
        ring.mesh.position.set(event.x, heightAt(event.x, event.z) + 0.4, event.z);
      } else if (event.type === 'bolt') {
        this.drawBolt(event.points);
      } else if (event.type === 'levelup' || event.type === 'shrine') {
        const { x, z } = this.run.player;
        this.particles.burst(x, heightAt(x, z) + 1, z, 40, 0x6ae6ff, 9);
      } else if (event.type === 'dash') {
        const { x, z } = this.run.player;
        this.particles.burst(x, heightAt(x, z) + 0.6, z, 12, 0xffffff, 3);
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
      let fromY = heightAt(fromX, fromZ) + 1.2;
      for (let part = 1; part <= 3 && used + 2 <= 512; part += 1) {
        const t = part / 3;
        const jitter = part < 3 ? 0.7 : 0;
        const toX =
          points[i].x + (points[i + 1].x - points[i].x) * t + (Math.random() - 0.5) * jitter;
        const toZ =
          points[i].z + (points[i + 1].z - points[i].z) * t + (Math.random() - 0.5) * jitter;
        const toY = heightAt(toX, toZ) + 1 + Math.random() * jitter;
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
    const hop = Math.abs(Math.sin(this.clock * (e.kind === 'runner' ? 14 : 8) + e.id)) * 0.18;
    const scale = e.radius / ENEMIES[e.kind].radius;
    this.dummy.position.set(e.x, heightAt(e.x, e.z) + hop, e.z);
    this.dummy.rotation.set(
      0,
      Math.atan2(player.x - e.x, player.z - e.z),
      Math.sin(this.clock * 8 + e.id) * 0.08
    );
    this.dummy.scale.setScalar(scale);
    this.dummy.updateMatrix();
    mesh.setMatrixAt(index, this.dummy.matrix);
    if (e.flash > 0) this.color.setRGB(4, 4, 4);
    else if (e.elite && e.kind !== 'boss') this.color.setRGB(1.9, 1.4, 0.5);
    else this.color.setRGB(1, 1, 1);
    mesh.setColorAt(index, this.color);
  }

  // The box heroes walk by swinging their limbs.
  private swing(model: PlayerModel, dt: number) {
    const { player } = this.run;
    const facing = Math.atan2(player.dirX, player.dirZ);
    let turn = facing - model.root.rotation.y;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    model.root.rotation.y += turn * Math.min(1, dt * 16);
    this.walk += dt * (player.moving ? 13 : 0);
    const swing = player.moving ? Math.sin(this.walk) * 0.9 : 0;
    model.legL.rotation.x = swing;
    model.legR.rotation.x = -swing;
    model.armL.rotation.x = -swing * 0.8;
    model.armR.rotation.x = swing * 0.8;
    model.body.position.y = player.moving
      ? Math.abs(Math.sin(this.walk)) * 0.08
      : Math.sin(this.clock * 2.5) * 0.03;
    model.body.rotation.x = player.dashTime > 0 ? 0.5 : 0;
  }

  render(dt: number) {
    const { run } = this;
    const { player } = run;
    this.clock += dt;

    // Enemies and their shadows.
    const counts = new Map<EnemyKind, number>();
    let shadowCount = 0;
    const shadow = (x: number, z: number, radius: number) => {
      if (shadowCount >= MAX_ENEMIES + 16) return;
      this.dummy.position.set(x, heightAt(x, z) + 0.06, z);
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
        this.dummy.position.set(s.x, heightAt(s.x, s.z) + 1, s.z);
        this.dummy.rotation.set(0, s.kind === 'axe' ? this.clock * 16 + s.id : 0, 0);
        this.dummy.scale.setScalar(s.kind === 'axe' ? s.radius / 1.1 : 1);
        this.dummy.updateMatrix();
        mesh.setMatrixAt(index, this.dummy.matrix);
        shotCounts.set(s.kind, index + 1);
        if (s.kind === 'ember' && run.tick % 2 === 0) {
          this.particles.burst(s.x, heightAt(s.x, s.z) + 1, s.z, 1, 0xff7a1a, 1);
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
      this.dummy.position.set(zone.x, heightAt(zone.x, zone.z) + 0.16, zone.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.setScalar(
        zone.radius *
          Math.min(1, zone.life * 2) *
          (0.92 + Math.sin(this.clock * 9 + zone.id) * 0.08)
      );
      this.dummy.updateMatrix();
      this.zones.setMatrixAt(i, this.dummy.matrix);
      if ((run.tick + zone.id) % 9 === 0) {
        this.particles.burst(zone.x, heightAt(zone.x, zone.z) + 0.3, zone.z, 1, 0xff8a2a, 2.5);
      }
    }
    this.zones.count = zoneCount;
    this.zones.instanceMatrix.needsUpdate = true;

    // Things to pick up.
    const pickupCount = Math.min(run.pickups.length, 420);
    for (let i = 0; i < pickupCount; i += 1) {
      const p = run.pickups[i];
      let scale = 0.8 + Math.min(1.2, p.value * 0.06);
      if (p.kind === 'xp') this.color.setHex(p.value >= 6 ? 0x7dff6a : 0x4ad2ff);
      else if (p.kind === 'gold') this.color.setHex(0xffd23a);
      else if (p.kind === 'heart') this.color.setHex(0xff4a6a);
      else if (p.kind === 'magnet') this.color.setHex(0xffffff);
      else this.color.setHex(0xff9a2a);
      if (p.kind === 'chest') scale = 3;
      else if (p.kind !== 'xp') scale = 1.5;
      this.dummy.position.set(
        p.x,
        heightAt(p.x, p.z) + 0.5 + Math.sin(this.clock * 4 + p.id) * 0.12,
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

    // Orbiting blades.
    const bladesWeapon = run.weapons.find((w) => w.id === 'blades');
    if (bladesWeapon) {
      const stats = runStats(run);
      const count = Math.min(12, bladeCount(bladesWeapon, stats));
      const orbit = bladeOrbit(stats);
      for (let i = 0; i < count; i += 1) {
        const angle = bladesWeapon.angle + (i / count) * Math.PI * 2;
        const x = player.x + Math.cos(angle) * orbit;
        const z = player.z + Math.sin(angle) * orbit;
        this.dummy.position.set(x, heightAt(x, z) + 1, z);
        this.dummy.rotation.set(0, -angle, 0);
        this.dummy.scale.setScalar(1);
        this.dummy.updateMatrix();
        this.blades.setMatrixAt(i, this.dummy.matrix);
      }
      this.blades.count = count;
      this.blades.instanceMatrix.needsUpdate = true;
    }

    // Shrines.
    run.shrines.forEach((shrine, i) => {
      const view = this.shrines[i];
      view.crystal.visible = !shrine.used;
      view.crystal.rotation.y = this.clock * 1.5;
      view.crystal.scale.setScalar(1 + shrine.charge * 0.8);
      view.ring.visible = !shrine.used;
      (view.ring.material as THREE.MeshBasicMaterial).opacity = 0.35 + shrine.charge * 0.65;
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
    const model = this.player;
    const ground = heightAt(player.x, player.z);
    this.hero.position.set(player.x, ground, player.z);
    this.hero.visible = player.invuln <= 0 || Math.floor(this.clock * 20) % 2 === 0;
    this.sprite?.update(player, this.camera, dt);
    if (model) this.swing(model, dt);

    this.particles.update(dt);
    // The camera follows from behind and above, and shakes when something big happens.
    this.shake = Math.max(0, this.shake - dt * 1.8);
    const jolt = this.shake * this.shake * 1.6;
    this.target.set(player.x, ground + CAMERA_UP, player.z + CAMERA_BACK);
    this.camera.position.lerp(this.target, Math.min(1, dt * 7));
    this.camera.position.x += (Math.random() - 0.5) * jolt;
    this.camera.position.y += (Math.random() - 0.5) * jolt;
    this.camera.lookAt(
      this.camera.position.x,
      this.camera.position.y - CAMERA_UP + 1,
      this.camera.position.z - CAMERA_BACK - 2
    );

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
