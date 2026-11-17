import * as THREE from 'three';
import { FOREST_MODELS, FOREST_TEXTURES, ForestModel } from '../textures/forest';

// The pack's models, drawn many at a time: one instanced mesh for each texture a model wears.

export type Planted = { x: number; y: number; z: number; size: number; turn: number };

export class Forest {
  readonly root = new THREE.Group();

  readonly disposables: { dispose: () => void }[] = [];

  private textures = new Map<string, THREE.Texture>();

  private dummy = new THREE.Object3D();

  private texture(name: string): THREE.Texture {
    let texture = this.textures.get(name);
    if (!texture) {
      texture = new THREE.TextureLoader().load(FOREST_TEXTURES[name]);
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestMipmapLinearFilter;
      texture.colorSpace = THREE.SRGBColorSpace;
      this.textures.set(name, texture);
      this.disposables.push(texture);
    }
    return texture;
  }

  // Draws `model` at every one of `places`.
  add(model: ForestModel, places: Planted[]) {
    if (places.length === 0) return;
    FOREST_MODELS[model].parts.forEach((part) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(part.positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(part.uvs, 2));
      geometry.computeVertexNormals();
      const material = new THREE.MeshLambertMaterial({
        map: this.texture(part.texture),
        alphaTest: part.cutout ? 0.5 : 0,
        side: part.cutout ? THREE.DoubleSide : THREE.FrontSide,
      });
      const mesh = new THREE.InstancedMesh(geometry, material, places.length);
      mesh.frustumCulled = false;
      places.forEach((place, i) => {
        this.dummy.position.set(place.x, place.y, place.z);
        this.dummy.rotation.set(0, place.turn, 0);
        this.dummy.scale.setScalar(place.size);
        this.dummy.updateMatrix();
        mesh.setMatrixAt(i, this.dummy.matrix);
      });
      this.root.add(mesh);
      this.disposables.push(geometry, material);
    });
  }
}
