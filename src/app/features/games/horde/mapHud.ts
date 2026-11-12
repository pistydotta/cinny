import { chestPrice } from './engine/data';
import { MAP_HALF, heightAt } from './engine/terrain';
import { RunState, ShrineKind } from './engine/types';
import type { HordeScene } from './render/scene';

// The map's part of the screen: a minimap in the corner (the ground's heights, the shrines and
// chests not used yet, the boss, and the hero with the camera's heading) and the price over the
// chests nearby. Plain DOM, refreshed a few times a second.

const SHRINE_DOTS: Record<ShrineKind, string> = {
  blessing: '#6ae6ff',
  curse: '#c46aff',
  gold: '#ffd23a',
  heal: '#6aff8a',
  challenge: '#ff6a6a',
};
// Minimap pixels per side, and the map units shown around it (a bit past the square).
const PIXELS = 132;
const SPAN = MAP_HALF + 4;
const CHEST_TAG_RANGE = 28;

const shade = (h: number): string => {
  if (h > 9) return '#3a3446';
  const v = Math.max(0, Math.min(1, (h + 1) / 10));
  const r = Math.round(52 + v * 120);
  const g = Math.round(74 + v * 110);
  const b = Math.round(44 + v * 70);
  return `rgb(${r},${g},${b})`;
};

export class MapHud {
  private canvas = document.createElement('canvas');

  private ground = document.createElement('canvas');

  private tags = new Map<number, HTMLDivElement>();

  private since = 1;

  constructor(private overlay: HTMLElement, private run: RunState, private scene: HordeScene) {
    this.ground.width = PIXELS;
    this.ground.height = PIXELS;
    const ctx = this.ground.getContext('2d');
    if (ctx) {
      for (let py = 0; py < PIXELS; py += 2) {
        for (let px = 0; px < PIXELS; px += 2) {
          const x = (px / PIXELS) * 2 * SPAN - SPAN;
          const z = (py / PIXELS) * 2 * SPAN - SPAN;
          ctx.fillStyle = shade(heightAt(run.map, x, z));
          ctx.fillRect(px, py, 2, 2);
        }
      }
    }
    this.canvas.width = PIXELS;
    this.canvas.height = PIXELS;
    this.canvas.style.cssText =
      'position:absolute;right:12px;top:58px;width:clamp(88px,22vw,132px);aspect-ratio:1;' +
      'border-radius:10px;border:2px solid rgba(0,0,0,.55);box-shadow:0 2px 8px rgba(0,0,0,.4);' +
      'image-rendering:pixelated;pointer-events:none;opacity:.92';
    overlay.appendChild(this.canvas);
  }

  update(dt: number, yaw: number) {
    this.placeChestTags();
    this.since += dt;
    if (this.since < 0.15) return;
    this.since = 0;
    this.drawMinimap(yaw);
  }

  private drawMinimap(yaw: number) {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    const { run } = this;
    const at = (x: number, z: number) => [
      ((x + SPAN) / (2 * SPAN)) * PIXELS,
      ((z + SPAN) / (2 * SPAN)) * PIXELS,
    ];
    ctx.drawImage(this.ground, 0, 0);
    run.shrines.forEach((s) => {
      if (s.used) return;
      const [x, y] = at(s.x, s.z);
      ctx.fillStyle = SHRINE_DOTS[s.kind ?? 'blessing'];
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    run.chests.forEach((c) => {
      if (c.opened) return;
      const [x, y] = at(c.x, c.z);
      ctx.fillStyle = '#000';
      ctx.fillRect(x - 3, y - 3, 6, 6);
      ctx.fillStyle = '#e0a030';
      ctx.fillRect(x - 2, y - 2, 4, 4);
    });
    run.enemies.forEach((e) => {
      if (e.kind !== 'boss') return;
      const [x, y] = at(e.x, e.z);
      ctx.fillStyle = '#ff2a2a';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
    // The hero, pointing where the camera looks.
    const [x, y] = at(run.player.x, run.player.z);
    const dx = -Math.sin(yaw);
    const dy = -Math.cos(yaw);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + dx * 6, y + dy * 6);
    ctx.lineTo(x - dx * 3 + dy * 4, y - dy * 3 - dx * 4);
    ctx.lineTo(x - dx * 3 - dy * 4, y - dy * 3 + dx * 4);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
  }

  // The price over each chest close enough to matter, red while the gold isn't there.
  private placeChestTags() {
    const { run } = this;
    const price = chestPrice(run.chestsBought);
    const seen = new Set<number>();
    run.chests.forEach((c) => {
      if (c.opened) return;
      if (Math.hypot(c.x - run.player.x, c.z - run.player.z) > CHEST_TAG_RANGE) return;
      const spot = this.scene.project(c.x, c.z, 2.2);
      if (!spot.front) return;
      seen.add(c.id);
      let el = this.tags.get(c.id);
      if (!el) {
        el = document.createElement('div');
        el.style.cssText =
          'position:absolute;pointer-events:none;transform:translate(-50%,-100%);' +
          'font-size:13px;font-weight:900;text-shadow:0 2px 0 #000;white-space:nowrap';
        this.overlay.appendChild(el);
        this.tags.set(c.id, el);
      }
      el.textContent = `🪙 ${price}`;
      el.style.color = run.gold >= price ? '#ffd23a' : '#ff7a7a';
      el.style.left = `${spot.x}px`;
      el.style.top = `${spot.y}px`;
    });
    this.tags.forEach((el, id) => {
      if (!seen.has(id)) {
        el.remove();
        this.tags.delete(id);
      }
    });
  }

  dispose() {
    this.canvas.remove();
    this.tags.forEach((el) => el.remove());
  }
}
