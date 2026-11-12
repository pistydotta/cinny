/* eslint-disable no-param-reassign */
import * as THREE from 'three';
import { ARENA_RADIUS, ENEMIES, MAX_ENEMIES, SHOT_HEIGHT, SHRINE_RADIUS } from '../engine/data';
import { auraRadius, runStats, urnCount, urnOrbit } from '../engine/run';
import { heightAt } from '../engine/terrain';
import { Enemy, EnemyKind, GameEvent, RunState, ShotKind } from '../engine/types';
import { HERO_SPRITES } from '../sprites';
import { Particles } from './particles';
import { SpriteHero } from './spriteHero';
import { ball, box, cone, enemyGeometry, grainTexture, merge } from './models';

// Draws a run with three.js. The engine knows nothing about this file: every frame the scene
// reads the run's state and places things, and the events of each tick become effects.
//
// The old-console look comes from rendering at a low resolution and stretching it without
// smoothing, flat-shaded models with colors per vertex, and fog close to the camera.

const RENDER_HEIGHT = 360;
const KINDS: EnemyKind[] = ['husk', 'runner', 'brute', 'spitter', 'boss'];
const SHOT_KINDS: ShotKind[] = ['card', 'missile', 'axe', 'spit'];
const SKY = 0x1a1326;
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

  private camera = new THREE.PerspectiveCamera(46, 1, 0.5, 160);

  private lit = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

  private glow = new THREE.MeshBasicMaterial({ vertexColors: true });

  private enemyMeshes = new Map<EnemyKind, THREE.InstancedMesh>();

  private shotMeshes = new Map<ShotKind, THREE.InstancedMesh>();

  private shadows: THREE.InstancedMesh;

  private pickups: THREE.InstancedMesh;

  private zones: THREE.InstancedMesh;

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

  private clock = 0;

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
      } else if (event.type === 'nova' || event.type === 'blast') {
        const blast = event.type === 'blast';
        const ring = this.rings.find((r) => r.age >= 1) ?? this.rings[0];
        ring.age = 0;
        ring.radius = event.radius;
        ring.mesh.position.set(event.x, heightAt(event.x, event.z) + 0.4, event.z);
        (ring.mesh.material as THREE.MeshBasicMaterial).color.setHex(blast ? 0xffa040 : 0x9fd8ff);
        if (blast) {
          const y = heightAt(event.x, event.z) + 0.6;
          this.particles.burst(event.x, y, event.z, 26, 0xff8a2a, 9);
          this.particles.burst(event.x, y, event.z, 10, 0xfff2a0, 5);
          this.shake = Math.max(this.shake, 0.22);
        }
      } else if (event.type === 'bolt') {
        this.drawBolt(event.points);
      } else if (event.type === 'levelup' || event.type === 'shrine') {
        const { x, z } = this.run.player;
        this.particles.burst(x, heightAt(x, z) + 1, z, 40, 0x6ae6ff, 9);
      } else if (event.type === 'land' && event.speed > 9) {
        const { x, z } = this.run.player;
        this.particles.burst(x, heightAt(x, z) + 0.2, z, 6, 0xd8c8a8, 3);
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

  render(dt: number, view: CameraView) {
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
        this.dummy.position.set(s.x, heightAt(s.x, s.z) + SHOT_HEIGHT, s.z);
        let spin = 0;
        if (s.kind === 'missile') spin = Math.atan2(s.vx, s.vz);
        else if (s.kind !== 'spit') spin = this.clock * 16 + s.id;
        // The bomb flies nose down, as if it were falling on its target.
        this.dummy.rotation.set(s.kind === 'missile' ? 0.45 : 0, spin, 0, 'YXZ');
        this.dummy.scale.setScalar(s.kind === 'axe' ? s.radius / 1.1 : 1);
        this.dummy.updateMatrix();
        mesh.setMatrixAt(index, this.dummy.matrix);
        shotCounts.set(s.kind, index + 1);
        if (s.kind === 'missile' && run.tick % 2 === 0) {
          this.particles.burst(s.x, heightAt(s.x, s.z) + 1, s.z, 1, 0xb8b8c0, 1);
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

    // Ballot boxes in orbit, screens facing out.
    const stats = runStats(run);
    const urns = run.weapons.find((w) => w.id === 'urns');
    const urnsShown = urns ? Math.min(12, urnCount(urns, stats)) : 0;
    for (let i = 0; urns && i < urnsShown; i += 1) {
      const angle = urns.angle + (i / urnsShown) * Math.PI * 2;
      const x = player.x + Math.cos(angle) * urnOrbit(stats);
      const z = player.z + Math.sin(angle) * urnOrbit(stats);
      this.dummy.position.set(x, heightAt(x, z) + 1 + Math.sin(this.clock * 5 + i) * 0.12, z);
      this.dummy.rotation.set(0, Math.PI / 2 - angle, 0);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.urns.setMatrixAt(i, this.dummy.matrix);
    }
    this.urns.count = urnsShown;
    this.urns.instanceMatrix.needsUpdate = true;

    // The aura of tears: a pale disc under the hero, with drops falling inside it.
    const aura = run.weapons.find((w) => w.id === 'aura');
    this.aura.visible = aura !== undefined;
    if (aura) {
      const radius = auraRadius(aura, stats);
      this.aura.position.set(player.x, heightAt(player.x, player.z) + 0.12, player.z);
      this.aura.scale.setScalar(radius * (1 + Math.sin(this.clock * 4) * 0.03));
      if (dt > 0 && run.tick % 3 === 0) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.sqrt(Math.random()) * radius;
        const x = player.x + Math.cos(angle) * dist;
        const z = player.z + Math.sin(angle) * dist;
        this.particles.burst(x, heightAt(x, z) + 2.2, z, 1, 0x8fd8ff, 0.4);
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

    this.particles.update(dt);
    // The camera orbits the hero where the player turned it, and shakes when something big happens.
    // Its height follows the jump only halfway, so hopping doesn't bob the whole screen.
    const ground = heightAt(player.x, player.z);
    const aimY = ground + (player.y - ground) * 0.5 + CAMERA_AIM;
    const smooth = Math.min(1, dt * 14);
    this.aim.set(
      this.aim.x + (player.x - this.aim.x) * smooth,
      this.aim.y + (aimY - this.aim.y) * smooth,
      this.aim.z + (player.z - this.aim.z) * smooth
    );
    if (this.clock <= dt) this.aim.set(player.x, aimY, player.z);
    const flat = Math.cos(view.pitch) * view.distance;
    this.camera.position.set(
      this.aim.x + Math.sin(view.yaw) * flat,
      this.aim.y + Math.sin(view.pitch) * view.distance,
      this.aim.z + Math.cos(view.yaw) * flat
    );
    // Never under the hills.
    const floor = heightAt(this.camera.position.x, this.camera.position.z) + 0.5;
    if (this.camera.position.y < floor) this.camera.position.y = floor;
    this.camera.lookAt(this.aim);
    this.shake = Math.max(0, this.shake - dt * 1.8);
    const jolt = this.shake * this.shake * 1.6;
    this.camera.position.x += (Math.random() - 0.5) * jolt;
    this.camera.position.y += (Math.random() - 0.5) * jolt;
    // A tall phone screen sees less to the sides, so it gets a wider view.
    const fov = view.fov + (this.camera.aspect < 1 ? 12 : 0);
    if (this.camera.fov !== fov) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    this.hero.update(player, view.yaw, this.camera, dt);

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
