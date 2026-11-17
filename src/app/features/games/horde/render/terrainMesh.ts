import * as THREE from 'three';
import {
  CELL,
  GRID_HALF,
  GRID_SIZE,
  LEVEL,
  MAP_HALF,
  cutAcross,
  gridHeights,
} from '../engine/terrain';
import { GameMap } from '../engine/types';
import { GROUND_TEXTURES, GroundTexture } from '../textures';

// The map drawn from the very grid the engine stands things on: each square of the grid is the
// same two triangles here, so the hero's feet are always on what is drawn. Every triangle takes a
// texture from what it is: grass on level ground, bare earth on a slope that can be walked,
// dark earth on a cliff, undergrowth down in the hollows and gravel on the mountains.

// Map units one copy of a texture covers.
const TILE = 8;
// Above this much of the normal pointing up a triangle is level ground; above the second, a slope
// the hero walks; under it, a cliff (the engine's wall is at 0.67).
const LEVEL_GROUND = 0.9;
const WALKABLE = 0.69;

const hash = (a: number, b: number): number => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const SNOW = new THREE.Color(0xdcd8e8);
const DUST = new THREE.Color(0xb8a48a);
const work = new THREE.Color();

type Batch = { positions: number[]; uvs: number[]; colors: number[] };

const textureOf = (x: number, z: number, y: number, up: number): GroundTexture => {
  if (Math.max(Math.abs(x), Math.abs(z)) > MAP_HALF - 3) return 'gravel';
  if (up < WALKABLE) return 'earth';
  if (up < LEVEL_GROUND) return 'dryGround';
  if (y < -LEVEL * 0.35)
    return hash(Math.floor(x / 14), Math.floor(z / 14)) < 0.5 ? 'clover' : 'undergrowth';
  // Patches of longer grass break up the lawn.
  return hash(Math.floor(x / 22), Math.floor(z / 22)) < 0.3 ? 'wildGrass' : 'grass';
};

export const buildTerrain = (map: GameMap) => {
  const heights = gridHeights(map);
  const batches = new Map<GroundTexture, Batch>();
  const normal = new THREE.Vector3();
  const side = new THREE.Vector3();
  const other = new THREE.Vector3();

  const point = (ix: number, iz: number, out: THREE.Vector3) =>
    out.set(ix * CELL - GRID_HALF, heights[iz * GRID_SIZE + ix], iz * CELL - GRID_HALF);
  const corners = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const [a, b, c] = corners;
  // How much the triangle of these three grid points faces up, leaving its normal in `normal`.
  const facing = (p: [number, number][]): number => {
    p.forEach(([ix, iz], i) => point(ix, iz, corners[i]));
    return normal.crossVectors(side.subVectors(b, a), other.subVectors(c, a)).normalize().y;
  };

  for (let iz = 0; iz < GRID_SIZE - 1; iz += 1) {
    for (let ix = 0; ix < GRID_SIZE - 1; ix += 1) {
      // The same cut as the engine's `heightAt`, so the hero stands on what is drawn.
      const across = cutAcross(
        heights[iz * GRID_SIZE + ix],
        heights[iz * GRID_SIZE + ix + 1],
        heights[(iz + 1) * GRID_SIZE + ix],
        heights[(iz + 1) * GRID_SIZE + ix + 1]
      );
      const halves: [number, number][][] = across
        ? [
            [
              [ix, iz],
              [ix, iz + 1],
              [ix + 1, iz],
            ],
            [
              [ix + 1, iz],
              [ix, iz + 1],
              [ix + 1, iz + 1],
            ],
          ]
        : [
            [
              [ix, iz],
              [ix, iz + 1],
              [ix + 1, iz + 1],
            ],
            [
              [ix, iz],
              [ix + 1, iz + 1],
              [ix + 1, iz],
            ],
          ];
      // Both halves of a square wear the same texture, chosen by its steeper half: a texture per
      // triangle would leave saw teeth along every edge between two kinds of ground.
      const up = Math.min(facing(halves[0]), facing(halves[1]));
      const x = (ix + 0.5) * CELL - GRID_HALF;
      const z = (iz + 0.5) * CELL - GRID_HALF;
      const y = (heights[iz * GRID_SIZE + ix] + heights[(iz + 1) * GRID_SIZE + ix + 1]) / 2;
      const kind = textureOf(x, z, y, up);
      let batch = batches.get(kind);
      if (!batch) {
        batch = { positions: [], uvs: [], colors: [] };
        batches.set(kind, batch);
      }
      const { positions, uvs, colors } = batch;
      // Hollows sit in shade, the heights catch more light, and the peaks go pale.
      work.setScalar(0.84 + Math.max(-0.14, Math.min(0.2, y / 60)) + hash(x, z) * 0.08);
      if (kind === 'gravel') work.lerp(SNOW, Math.min(1, Math.max(0, (y - 26) / 18)));
      // The bare earth of a slope, toned down to sit with the grass around it.
      if (kind === 'dryGround') work.multiply(DUST);
      halves.forEach((half) => {
        // A steep face's texture hangs down it instead of being stretched from above.
        const wall = facing(half) < WALKABLE;
        const alongX = Math.abs(normal.x) < Math.abs(normal.z);
        corners.forEach((v) => {
          positions.push(v.x, v.y, v.z);
          colors.push(work.r, work.g, work.b);
          if (wall) uvs.push((alongX ? v.x : v.z) / TILE, v.y / TILE);
          else uvs.push(v.x / TILE, v.z / TILE);
        });
      });
    }
  }

  const group = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];
  const loader = new THREE.TextureLoader();
  batches.forEach((batch, kind) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(batch.positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(batch.uvs, 2));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(batch.colors, 3));
    geometry.computeVertexNormals();
    const texture = loader.load(GROUND_TEXTURES[kind]);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestMipmapLinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshLambertMaterial({ map: texture, vertexColors: true });
    group.add(new THREE.Mesh(geometry, material));
    disposables.push(geometry, material, texture);
  });
  return { group, disposables };
};
