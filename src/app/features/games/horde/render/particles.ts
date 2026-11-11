import * as THREE from 'three';

// Square sparks in one draw call. The pool is fixed, so a big fight makes no garbage: when it
// is full, new sparks take the place of the oldest ones.
const MAX = 1400;
const GRAVITY = 14;
const HIDDEN = -500;

export class Particles {
  private points: THREE.Points;

  private position: THREE.BufferAttribute;

  private colors: THREE.BufferAttribute;

  private velocity = new Float32Array(MAX * 3);

  private life = new Float32Array(MAX);

  private next = 0;

  private color = new THREE.Color();

  constructor(scene: THREE.Scene) {
    const geometry = new THREE.BufferGeometry();
    this.position = new THREE.BufferAttribute(new Float32Array(MAX * 3).fill(HIDDEN), 3);
    this.colors = new THREE.BufferAttribute(new Float32Array(MAX * 3), 3);
    this.position.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', this.position);
    geometry.setAttribute('color', this.colors);
    this.points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ size: 0.34, vertexColors: true, sizeAttenuation: true })
    );
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  burst(x: number, y: number, z: number, count: number, color: number, speed: number) {
    this.color.setHex(color);
    for (let n = 0; n < count; n += 1) {
      const i = this.next;
      this.next = (this.next + 1) % MAX;
      const angle = Math.random() * Math.PI * 2;
      const out = Math.random() * speed;
      this.position.setXYZ(i, x, y, z);
      this.velocity[i * 3] = Math.cos(angle) * out;
      this.velocity[i * 3 + 1] = 2 + Math.random() * speed * 0.8;
      this.velocity[i * 3 + 2] = Math.sin(angle) * out;
      this.life[i] = 0.35 + Math.random() * 0.45;
      const shade = 0.7 + Math.random() * 0.5;
      this.colors.setXYZ(i, this.color.r * shade, this.color.g * shade, this.color.b * shade);
    }
    this.colors.needsUpdate = true;
  }

  update(dt: number) {
    const array = this.position.array as Float32Array;
    for (let i = 0; i < MAX; i += 1) {
      if (this.life[i] > 0) {
        this.life[i] -= dt;
        if (this.life[i] <= 0) {
          array[i * 3 + 1] = HIDDEN;
        } else {
          this.velocity[i * 3 + 1] -= GRAVITY * dt;
          array[i * 3] += this.velocity[i * 3] * dt;
          array[i * 3 + 1] += this.velocity[i * 3 + 1] * dt;
          array[i * 3 + 2] += this.velocity[i * 3 + 2] * dt;
        }
      }
    }
    this.position.needsUpdate = true;
  }
}
