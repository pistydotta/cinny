import * as THREE from 'three';

// The sky over the arena and the light it gives: a run starts at sunset and ends deep in the night,
// so the ten minutes show on screen; a boss turns the horizon red while it lives. Drawing only:
// the engine never sees any of it.

type Look = {
  zenith: number;
  horizon: number;
  sun: number;
  sunPower: number;
  hemi: number;
  hemiPower: number;
  stars: number;
};

// By run time, in seconds.
const LOOKS: [number, Look][] = [
  [
    0,
    {
      zenith: 0x3a2a62,
      horizon: 0xe0906a,
      sun: 0xffb070,
      sunPower: 2.6,
      hemi: 0xc8c0ff,
      hemiPower: 2.2,
      stars: 0,
    },
  ],
  [
    240,
    {
      zenith: 0x1c1744,
      horizon: 0x7a4a7a,
      sun: 0xe0a0b0,
      sunPower: 2.2,
      hemi: 0xb0b4ff,
      hemiPower: 2,
      stars: 0.5,
    },
  ],
  [
    480,
    {
      zenith: 0x0a0c24,
      horizon: 0x2c2c5e,
      sun: 0x9ab0ff,
      sunPower: 1.8,
      hemi: 0x8c9ad8,
      hemiPower: 1.8,
      stars: 1,
    },
  ],
];

const BOSS_HORIZON = new THREE.Color(0x9a1c1c);
const RADIUS = 180;

const mix = (a: number, b: number, t: number, out: THREE.Color) =>
  out.setHex(a).lerp(new THREE.Color(b), t);

export class Sky {
  readonly root = new THREE.Group();

  private zenith = new THREE.Color();

  private horizon = new THREE.Color();

  private dome: THREE.Mesh;

  private stars: THREE.Points;

  private boss = 0;

  constructor(
    private scene: THREE.Scene,
    private hemi: THREE.HemisphereLight,
    private sun: THREE.DirectionalLight
  ) {
    // A sphere colored from horizon to zenith in its shader, outside the fog.
    const material = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { zenith: { value: this.zenith }, horizon: { value: this.horizon } },
      vertexShader:
        'varying float h; void main() { h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader:
        // The colors come in linear, like the rest of the scene, and go out in the screen's space.
        'uniform vec3 zenith; uniform vec3 horizon; varying float h;\nvoid main() {\n' +
        'gl_FragColor = vec4(mix(horizon, zenith, smoothstep(-0.05, 0.4, h)), 1.0);\n' +
        '#include <colorspace_fragment>\n}',
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(RADIUS, 24, 12), material);
    this.dome.renderOrder = -1;

    // Stars on the upper half, from a fixed pattern so every run has the same sky.
    const points: number[] = [];
    let seed = 7;
    const next = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 260; i += 1) {
      const angle = next() * Math.PI * 2;
      const up = 0.15 + next() * 0.85;
      const flat = Math.sqrt(1 - up * up);
      points.push(
        Math.cos(angle) * flat * (RADIUS - 2),
        up * (RADIUS - 2),
        Math.sin(angle) * flat * (RADIUS - 2)
      );
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    this.stars = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.6,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0,
        fog: false,
        depthWrite: false,
      })
    );

    this.root.add(this.dome, this.stars);
    this.scene.add(this.root);
    this.update(0, false, 0, new THREE.Vector3());
  }

  update(time: number, bossAlive: boolean, dt: number, cameraAt: THREE.Vector3) {
    let i = 0;
    while (i < LOOKS.length - 2 && time >= LOOKS[i + 1][0]) i += 1;
    const [fromTime, from] = LOOKS[i];
    const [toTime, to] = LOOKS[i + 1];
    const t = Math.max(0, Math.min(1, (time - fromTime) / (toTime - fromTime)));

    // The red comes and goes over a couple of seconds.
    this.boss += ((bossAlive ? 1 : 0) - this.boss) * Math.min(1, dt * 0.8);

    mix(from.zenith, to.zenith, t, this.zenith);
    mix(from.horizon, to.horizon, t, this.horizon).lerp(BOSS_HORIZON, this.boss * 0.55);
    mix(from.sun, to.sun, t, this.sun.color);
    this.sun.intensity = from.sunPower + (to.sunPower - from.sunPower) * t;
    mix(from.hemi, to.hemi, t, this.hemi.color);
    this.hemi.intensity = from.hemiPower + (to.hemiPower - from.hemiPower) * t;
    (this.stars.material as THREE.PointsMaterial).opacity =
      (from.stars + (to.stars - from.stars) * t) * 0.9;

    // The fog fades into the horizon, so far things melt into the sky.
    (this.scene.fog as THREE.Fog).color.copy(this.horizon).lerp(this.zenith, 0.35);
    (this.scene.background as THREE.Color).copy(this.zenith);
    this.root.position.copy(cameraAt);
  }
}
