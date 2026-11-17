import bark1 from './bark1.png';
import bark2 from './bark2.png';
import bark3 from './bark3.png';
import bark4 from './bark4.png';
import boulder from './boulder.png';
import crown1 from './crown1.png';
import crown2 from './crown2.png';
import crown3 from './crown3.png';
import crown4 from './crown4.png';
import dandelion from './dandelion.png';
import plants from './plants.png';
import treeEnd from './treeEnd.png';
import models from './models.json';

// The trees, boulder, log and small plants of the "PSX Forest Asset Collection" by Stark Crafts
// (starkcrafts.itch.io), taken out of the pack's .fbx: `models.json` has each model's triangles
// (its foot at the origin, 1 unit tall) grouped by the texture they wear.
export const FOREST_TEXTURES: Record<string, string> = {
  bark1,
  bark2,
  bark3,
  bark4,
  boulder,
  crown1,
  crown2,
  crown3,
  crown4,
  dandelion,
  plants,
  treeEnd,
};

export type ForestPart = {
  texture: string;
  // Leaves and blades: drawn from both sides, with the see-through pixels cut out.
  cutout: boolean;
  positions: number[];
  uvs: number[];
};
export type ForestModel =
  | 'tree1'
  | 'tree2'
  | 'tree3'
  | 'tree4'
  | 'rock'
  | 'log'
  | 'grass'
  | 'reed'
  | 'dandelion'
  | 'lavender';

export const FOREST_MODELS = models as Record<ForestModel, { parts: ForestPart[] }>;
