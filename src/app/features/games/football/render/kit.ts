import * as THREE from 'three';
import { Kit, Pattern } from '../engine/teams';

// The mannequin has no textures, so the kit is painted by a shader from where each point sits
// on the body in the rest pose (meters, feet at 0, facing +z): boots, socks, bare knees,
// shorts, the shirt and its pattern, arms past the sleeves, the head and some hair. A keeper
// wears gloves.

const PATTERNS: Pattern[] = ['solid', 'stripes', 'hoops', 'band', 'sash', 'checks'];

const SKINS = ['#f1c7a5', '#d9a47e', '#b77c56', '#8d5a3b', '#6b4029', '#4a2c1d'];
const HAIRS = ['#1b1210', '#2e1d14', '#4b3020', '#6e4b2a', '#a5773c', '#121212'];

export const lookColors = (look: number): { skin: string; hair: string } => ({
  skin: SKINS[look % SKINS.length],
  hair: HAIRS[Math.floor(look / 7) % HAIRS.length],
});

const VERTEX = /* glsl */ `
varying vec3 vKit;
`;

const FRAGMENT = /* glsl */ `
varying vec3 vKit;
uniform vec3 kShirt;
uniform vec3 kTrim;
uniform vec3 kShorts;
uniform vec3 kSocks;
uniform vec3 kSkin;
uniform vec3 kHair;
uniform vec3 kBoots;
uniform vec3 kGloves;
uniform float kPattern;

vec3 shirtColor(vec3 p) {
  float t = 0.0;
  if (kPattern < 0.5) t = 0.0;
  else if (kPattern < 1.5) t = step(0.5, fract(p.x * 7.5 + 0.25));
  else if (kPattern < 2.5) t = step(0.5, fract(p.y * 7.0));
  else if (kPattern < 3.5) t = step(abs(p.y - 1.27), 0.055);
  else if (kPattern < 4.5) t = step(abs(p.x - (p.y - 1.22) * 0.85), 0.06);
  else t = mod(floor(p.x * 11.0) + floor(p.y * 11.0), 2.0);
  return mix(kShirt, kTrim, t);
}

vec3 kitColor(vec3 p) {
  float ax = abs(p.x);
  if (p.y < 0.13) return kBoots;
  if (p.y < 0.5) return kSocks;
  if (p.y < 0.66) return kSkin;
  if (p.y < 0.98 && ax < 0.3) return kShorts;
  if (ax > 0.7) return kGloves;
  if (ax > 0.36) return kSkin;
  if (p.y < 1.47) return shirtColor(p);
  if (p.y > 1.73 || (p.y > 1.6 && p.z < -0.03)) return kHair;
  return kSkin;
}
`;

const color = (hex: string) => new THREE.Color(hex).convertSRGBToLinear();

export const kitMaterial = (
  kit: Kit,
  look: number,
  keeper: boolean
): THREE.MeshStandardMaterial => {
  const { skin, hair } = lookColors(look);
  const uniforms = {
    kShirt: { value: color(kit.shirt) },
    kTrim: { value: color(kit.trim) },
    kShorts: { value: color(kit.shorts) },
    kSocks: { value: color(kit.socks) },
    kSkin: { value: color(skin) },
    kHair: { value: color(hair) },
    kBoots: { value: color('#141414') },
    kGloves: { value: color(keeper ? '#e8e8e8' : skin) },
    kPattern: { value: PATTERNS.indexOf(kit.pattern) },
  };
  const material = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0 });
  material.onBeforeCompile = (shader) => {
    /* eslint-disable no-param-reassign */
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `${VERTEX}${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvKit = position;'
    );
    shader.fragmentShader = `${FRAGMENT}${shader.fragmentShader}`.replace(
      'vec4 diffuseColor = vec4( diffuse, opacity );',
      'vec4 diffuseColor = vec4( kitColor(vKit), opacity );'
    );
    /* eslint-enable no-param-reassign */
  };
  // One program for every player: only the uniforms differ.
  material.customProgramCacheKey = () => 'football-kit';
  return material;
};
