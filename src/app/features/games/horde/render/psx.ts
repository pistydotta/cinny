import * as THREE from 'three';

// The PlayStation look, added to three.js's own materials instead of replacing them:
// - vertices snap to a coarse grid on the screen, so models wobble a little as they move, the
//   way the PS1 drew without sub-pixel precision;
// - colors are cut to 32 levels per channel (the console's 15-bit color) through a 4x4 ordered
//   dither, which keeps gradients (fog, sky light) from banding into stripes.
// Both happen in the shaders three.js already compiles (`onBeforeCompile`), so every material,
// instanced or not, keeps its lighting, fog and vertex colors.

// Points on the screen to snap to: half the render resolution, set by the scene on resize.
export const psxSnap = { value: new THREE.Vector2(240, 135) };

const SNAP = `
  gl_Position.xy = floor(gl_Position.xy / gl_Position.w * psxSnap + 0.5) / psxSnap * gl_Position.w;
`;

const BAYER = `
uniform float psxLevels;
float psxBayer(vec2 p) {
  int i = int(mod(p.x, 4.0)) + int(mod(p.y, 4.0)) * 4;
  float m[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
  return m[i] / 16.0;
}
`;

const QUANTIZE = `
  gl_FragColor.rgb = floor(gl_FragColor.rgb * psxLevels + psxBayer(gl_FragCoord.xy)) / psxLevels;
`;

const psxLevels = { value: 31 };

export const psxify = (material: THREE.Material) => {
  if (material.userData.psx || material instanceof THREE.ShaderMaterial) return;
  // eslint-disable-next-line no-param-reassign
  material.userData.psx = true;
  const before = material.onBeforeCompile.bind(material);
  // eslint-disable-next-line no-param-reassign
  material.onBeforeCompile = (shader, renderer) => {
    before(shader, renderer);
    // eslint-disable-next-line no-param-reassign
    shader.uniforms.psxSnap = psxSnap;
    // eslint-disable-next-line no-param-reassign
    shader.uniforms.psxLevels = psxLevels;
    // eslint-disable-next-line no-param-reassign
    shader.vertexShader = `uniform vec2 psxSnap;\n${shader.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>\n${SNAP}`
    )}`;
    if (shader.fragmentShader.includes('#include <dithering_fragment>')) {
      // eslint-disable-next-line no-param-reassign
      shader.fragmentShader = `${BAYER}\n${shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>\n${QUANTIZE}`
      )}`;
    }
  };
  // Materials that already compiled must compile again with the change.
  // eslint-disable-next-line no-param-reassign
  material.needsUpdate = true;
};

// Every material under `root` (a whole scene), once each.
export const psxifyAll = (root: THREE.Object3D) => {
  root.traverse((object) => {
    const { material } = object as THREE.Mesh;
    if (Array.isArray(material)) material.forEach(psxify);
    else if (material) psxify(material);
  });
};
