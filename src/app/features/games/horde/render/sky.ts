import * as THREE from 'three';
import { SKY_TEXTURES } from '../textures';

// The sky over the arena and the light it gives: a run starts in daylight, passes through sunset
// and ends deep in the night, so the ten minutes show on screen; a boss turns the horizon red
// while it lives. Drawing only: the engine never sees any of it.

type Look = {
  zenith: number;
  horizon: number;
  sun: number;
  sunPower: number;
  hemi: number;
  hemiPower: number;
  // How much of the night sky shows through the day's, and the color the sky is washed with.
  night: number;
  tint: number;
};

// By run time, in seconds.
const LOOKS: [number, Look][] = [
  [
    0,
    {
      zenith: 0x3f78c0,
      horizon: 0xa9c9e6,
      sun: 0xfff0d8,
      sunPower: 2.8,
      hemi: 0xd4e2ff,
      hemiPower: 2.4,
      night: 0,
      tint: 0xffffff,
    },
  ],
  [
    180,
    {
      zenith: 0x3f78c0,
      horizon: 0xa9c9e6,
      sun: 0xfff0d8,
      sunPower: 2.8,
      hemi: 0xd4e2ff,
      hemiPower: 2.4,
      night: 0,
      tint: 0xffffff,
    },
  ],
  [
    330,
    {
      zenith: 0x3a2a62,
      horizon: 0xe0906a,
      sun: 0xffb070,
      sunPower: 2.6,
      hemi: 0xc8c0ff,
      hemiPower: 2.2,
      night: 0.35,
      tint: 0xffa888,
    },
  ],
  [
    500,
    {
      zenith: 0x0a0c24,
      horizon: 0x2c2c5e,
      sun: 0x9ab0ff,
      sunPower: 1.8,
      hemi: 0x8c9ad8,
      hemiPower: 1.8,
      night: 1,
      tint: 0xffffff,
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

  private tint = new THREE.Color();

  private night = { value: 0 };

  private dome: THREE.Mesh;

  private boss = 0;

  // What has to be let go of with the scene.
  readonly disposables: { dispose: () => void }[] = [];

  constructor(
    private scene: THREE.Scene,
    private hemi: THREE.HemisphereLight,
    private sun: THREE.DirectionalLight
  ) {
    const loader = new THREE.TextureLoader();
    const picture = (url: string) => {
      const texture = loader.load(url);
      texture.colorSpace = THREE.SRGBColorSpace;
      // Unfiltered like the ground; no smaller copies, which would draw a seam where the sky's
      // picture wraps around.
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;
      this.disposables.push(texture);
      return texture;
    };
    // A sphere outside the fog, wearing the day's sky and the night's, one fading into the other,
    // and melting into the horizon's color near the ground so far land and sky meet.
    const material = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        day: { value: picture(SKY_TEXTURES.day) },
        dark: { value: picture(SKY_TEXTURES.night) },
        night: this.night,
        tint: { value: this.tint },
        horizon: { value: this.horizon },
      },
      vertexShader:
        'varying vec3 dir; void main() { dir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader:
        // The colors come in linear, like the rest of the scene, and go out in the screen's space.
        'uniform sampler2D day; uniform sampler2D dark; uniform float night; uniform vec3 tint;\n' +
        'uniform vec3 horizon; varying vec3 dir;\nvoid main() {\n' +
        'vec3 d = normalize(dir);\n' +
        'vec2 uv = vec2(atan(d.z, d.x) / 6.2831853 + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.1415927 + 0.5);\n' +
        'vec3 sky = mix(texture2D(day, uv).rgb, texture2D(dark, uv).rgb, night) * tint;\n' +
        'gl_FragColor = vec4(mix(horizon, sky, smoothstep(-0.02, 0.28, d.y)), 1.0);\n' +
        '#include <colorspace_fragment>\n}',
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(RADIUS, 24, 12), material);
    this.dome.renderOrder = -1;
    this.disposables.push(this.dome.geometry, material);

    this.root.add(this.dome);
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
    this.night.value = from.night + (to.night - from.night) * t;
    mix(from.tint, to.tint, t, this.tint);

    // The fog fades into the horizon, so far things melt into the sky.
    (this.scene.fog as THREE.Fog).color.copy(this.horizon).lerp(this.zenith, 0.35);
    (this.scene.background as THREE.Color).copy(this.zenith);
    this.root.position.copy(cameraAt);
  }
}
