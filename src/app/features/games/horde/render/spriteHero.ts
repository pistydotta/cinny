import * as THREE from 'three';
import { SPRITE_FRAMES } from '../sprites';

// A hero made of pixel art: a flat card that always faces the camera and shows the frame for the
// side the hero is turned to. The sheets have no walk frames, so walking is a hop and a sway.

const HEIGHT = 2.7;

export class SpriteHero {
  readonly root = new THREE.Group();

  private card: THREE.Mesh;

  private texture: THREE.Texture;

  private walk = 0;

  constructor(url: string) {
    this.texture = new THREE.TextureLoader().load(url);
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.generateMipmaps = false;
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.repeat.set(1 / SPRITE_FRAMES, 1);
    // The feet sit on the ground, so the card grows up from its bottom edge.
    const geometry = new THREE.PlaneGeometry(HEIGHT, HEIGHT).translate(0, HEIGHT / 2 - 0.05, 0);
    const material = new THREE.MeshBasicMaterial({ map: this.texture, alphaTest: 0.5 });
    this.card = new THREE.Mesh(geometry, material);
    this.root.add(this.card);
  }

  update(
    player: { dirX: number; dirZ: number; moving: boolean; dashTime: number },
    camera: THREE.Camera,
    dt: number
  ) {
    // 0 is towards the camera (+z), a quarter turn is to the right of the screen (+x).
    const turn = Math.atan2(player.dirX, player.dirZ) / (Math.PI / 4);
    const frame = ((Math.round(turn) % SPRITE_FRAMES) + SPRITE_FRAMES) % SPRITE_FRAMES;
    this.texture.offset.x = frame / SPRITE_FRAMES;

    this.root.quaternion.copy(camera.quaternion);
    this.walk += dt * (player.moving ? 13 : 0);
    this.card.position.y = player.moving ? Math.abs(Math.sin(this.walk)) * 0.22 : 0;
    this.card.rotation.z = player.moving ? Math.sin(this.walk) * 0.09 : 0;
    const stretch = player.dashTime > 0 ? 0.8 : 1;
    this.card.scale.set(2 - stretch, stretch, 1);
  }

  dispose() {
    this.texture.dispose();
  }
}
