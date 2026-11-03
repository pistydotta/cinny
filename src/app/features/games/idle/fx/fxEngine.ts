/* eslint-disable no-param-reassign */
// A small particle engine for the battle screen, on one canvas. Built to stay cheap on any PC:
// - particles live in a fixed pool (no garbage while fighting) and the pool has a cap;
// - glows are pre-rendered sprites drawn with drawImage and additive blending, not gradients
//   built every frame;
// - the loop is requestAnimationFrame, so it stops by itself in a hidden tab, and the owner
//   stops it when the screen closes;
// - with "reduce motion" on there are far fewer particles and no screen shake.

export type Vec = { x: number; y: number };

type Shape = 'glow' | 'spark' | 'ring' | 'shard' | 'text' | 'bolt' | 'emoji';

type Particle = {
  alive: boolean;
  shape: Shape;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Seconds lived and to live. */
  age: number;
  life: number;
  size: number;
  /** Size at the end, as a multiple of size. */
  grow: number;
  color: string;
  gravity: number;
  drag: number;
  /** Text for 'text' and 'emoji'; for 'bolt', unused. */
  text: string;
  /** 'bolt': the end point. */
  tx: number;
  ty: number;
  spin: number;
  angle: number;
  /** Sideways sway, for leaves and snow. */
  sway: number;
  additive: boolean;
  /** Ambient particles respawn and never count against bursts. */
  ambient: boolean;
};

export type BurstOptions = {
  count: number;
  color: string | string[];
  speed?: [number, number];
  size?: [number, number];
  life?: [number, number];
  gravity?: number;
  drag?: number;
  shape?: Shape;
  /** Direction in radians and spread around it; omitted is all around. */
  angle?: number;
  spread?: number;
  grow?: number;
  additive?: boolean;
};

export type TextOptions = {
  color: string;
  size: number;
  /** Bold outline and a pop at the start. */
  big?: boolean;
  life?: number;
  rise?: number;
};

export type AmbientKind =
  | 'leaves'
  | 'embers'
  | 'spores'
  | 'snow'
  | 'ash'
  | 'bubbles'
  | 'sparks'
  | 'void';

const MAX_PARTICLES = 700;
const AMBIENT_COUNT = 34;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pickOne = <T>(v: T | T[]): T =>
  Array.isArray(v) ? v[Math.floor(Math.random() * v.length)] : v;

// One 64px radial sprite per color, made once.
const spriteCache = new Map<string, HTMLCanvasElement>();
const glowSprite = (color: string): HTMLCanvasElement => {
  const cached = spriteCache.get(color);
  if (cached) return cached;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  if (g) {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.18, color);
    grad.addColorStop(0.5, `${color}66`);
    grad.addColorStop(1, `${color}00`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  }
  spriteCache.set(color, c);
  return c;
};

const AMBIENT: Record<
  AmbientKind,
  { colors: string[]; make: (p: Particle, w: number, h: number, fresh: boolean) => void }
> = {
  leaves: {
    colors: ['#7fbf4d', '#c9a33b', '#a8d672', '#d9783a'],
    make: (p, w, h, fresh) => {
      p.shape = 'shard';
      p.x = rand(0, w);
      p.y = fresh ? rand(0, h) : -10;
      p.vx = rand(-8, 8);
      p.vy = rand(14, 28);
      p.size = rand(3, 6);
      p.sway = rand(10, 24);
      p.spin = rand(-3, 3);
      p.additive = false;
    },
  },
  embers: {
    colors: ['#ff8a3d', '#ffb347', '#ff5a1f'],
    make: (p, w, h, fresh) => {
      p.shape = 'glow';
      p.x = rand(0, w);
      p.y = fresh ? rand(0, h) : h + 10;
      p.vx = rand(-6, 6);
      p.vy = rand(-30, -14);
      p.size = rand(4, 9);
      p.sway = rand(4, 12);
      p.additive = true;
    },
  },
  spores: {
    colors: ['#c6e86b', '#9bd36b', '#e3f59a'],
    make: (p, w, h, fresh) => {
      p.shape = 'glow';
      p.x = rand(0, w);
      p.y = fresh ? rand(0, h) : h + 10;
      p.vx = rand(-5, 5);
      p.vy = rand(-10, -4);
      p.size = rand(4, 8);
      p.sway = rand(10, 20);
      p.additive = true;
    },
  },
  snow: {
    colors: ['#ffffff', '#dbeeff'],
    make: (p, w, h, fresh) => {
      p.shape = 'glow';
      p.x = rand(0, w);
      p.y = fresh ? rand(0, h) : -10;
      p.vx = rand(-6, 6);
      p.vy = rand(16, 34);
      p.size = rand(3, 7);
      p.sway = rand(8, 18);
      p.additive = false;
    },
  },
  ash: {
    colors: ['#8a8a8a', '#ff6a3d', '#5a5a5a'],
    make: (p, w, h, fresh) => {
      p.shape = 'glow';
      p.x = rand(0, w);
      p.y = fresh ? rand(0, h) : -10;
      p.vx = rand(-10, 10);
      p.vy = rand(8, 20);
      p.size = rand(3, 7);
      p.sway = rand(6, 14);
      p.additive = true;
    },
  },
  bubbles: {
    colors: ['#7fd6ff', '#b4ecff'],
    make: (p, w, h, fresh) => {
      p.shape = 'ring';
      p.x = rand(0, w);
      p.y = fresh ? rand(0, h) : h + 10;
      p.vx = 0;
      p.vy = rand(-26, -12);
      p.size = rand(2, 5);
      p.sway = rand(6, 14);
      p.additive = false;
    },
  },
  sparks: {
    colors: ['#9ecbff', '#ffffff', '#c7b3ff'],
    make: (p, w, h, fresh) => {
      p.shape = 'spark';
      p.x = rand(0, w);
      p.y = fresh ? rand(0, h) : -10;
      p.vx = rand(-20, 20);
      p.vy = rand(60, 120);
      p.size = rand(1, 2);
      p.sway = 0;
      p.additive = true;
    },
  },
  void: {
    colors: ['#b388ff', '#7c4dff', '#ea80fc'],
    make: (p, w, h, fresh) => {
      p.shape = 'glow';
      p.x = rand(0, w);
      p.y = fresh ? rand(0, h) : h + 10;
      p.vx = rand(-12, 12);
      p.vy = rand(-14, -4);
      p.size = rand(4, 10);
      p.sway = rand(14, 26);
      p.additive = true;
    },
  },
};

type Scheduled = { at: number; run: () => void };

export class FxEngine {
  private ctx: CanvasRenderingContext2D;

  private pool: Particle[] = [];

  private w = 0;

  private h = 0;

  private dpr = 1;

  private raf = 0;

  private last = 0;

  private now = 0;

  private shakeAmp = 0;

  private flashColor = '';

  private flashAlpha = 0;

  private ambient: AmbientKind | null = null;

  private queue: Scheduled[] = [];

  /** 0.35 with reduced motion, else 1. */
  readonly density: number;

  /** Where the shake offset goes (the arena), set by the owner. */
  shakeTarget: HTMLElement | null = null;

  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    this.ctx = ctx;
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.density = reduced ? 0.35 : 1;
    for (let i = 0; i < MAX_PARTICLES; i += 1) this.pool.push(FxEngine.blank());
  }

  private static blank(): Particle {
    return {
      alive: false,
      shape: 'glow',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      age: 0,
      life: 1,
      size: 1,
      grow: 1,
      color: '#fff',
      gravity: 0,
      drag: 0,
      text: '',
      tx: 0,
      ty: 0,
      spin: 0,
      angle: 0,
      sway: 0,
      additive: true,
      ambient: false,
    };
  }

  get width() {
    return this.w;
  }

  get height() {
    return this.h;
  }

  resize(w: number, h: number) {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = w;
    this.h = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
  }

  start() {
    if (this.raf) return;
    this.last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - this.last) / 1000);
      this.last = t;
      this.frame(dt, t);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.queue = [];
    if (this.shakeTarget) this.shakeTarget.style.transform = '';
  }

  /** Runs `fn` after `ms`, on the animation clock (so it pauses with the tab). */
  later(ms: number, fn: () => void) {
    // A hidden tab pauses the loop; past this, effects would only pile up.
    if (this.queue.length > 1500) return;
    this.queue.push({ at: this.now + ms, run: fn });
  }

  private take(ambient = false): Particle | undefined {
    const found = this.pool.find((p) => !p.alive);
    if (found) {
      Object.assign(found, FxEngine.blank());
      found.alive = true;
      found.ambient = ambient;
      return found;
    }
    // Full: reuse the oldest burst particle so new hits always show.
    let oldest: Particle | undefined;
    this.pool.forEach((p) => {
      if (!p.ambient && (!oldest || p.age / p.life > oldest.age / oldest.life)) oldest = p;
    });
    if (oldest) {
      Object.assign(oldest, FxEngine.blank());
      oldest.alive = true;
    }
    return oldest;
  }

  setAmbient(kind: AmbientKind | null) {
    if (kind === this.ambient) return;
    this.ambient = kind;
    this.pool.forEach((p) => {
      if (p.ambient) p.alive = false;
    });
    if (!kind) return;
    const def = AMBIENT[kind];
    const n = Math.round(AMBIENT_COUNT * this.density);
    for (let i = 0; i < n; i += 1) {
      const p = this.take(true);
      if (!p) break;
      def.make(p, this.w, this.h, true);
      p.color = pickOne(def.colors);
      p.life = 9999;
      p.angle = rand(0, Math.PI * 2);
    }
  }

  burst(at: Vec, o: BurstOptions) {
    const n = Math.max(1, Math.round(o.count * this.density));
    for (let i = 0; i < n; i += 1) {
      const p = this.take();
      if (!p) return;
      const a =
        o.angle !== undefined
          ? o.angle + rand(-(o.spread ?? Math.PI), o.spread ?? Math.PI)
          : rand(0, Math.PI * 2);
      const sp = rand(...(o.speed ?? [60, 200]));
      p.shape = o.shape ?? 'glow';
      p.x = at.x;
      p.y = at.y;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp;
      p.size = rand(...(o.size ?? [4, 10]));
      p.life = rand(...(o.life ?? [0.35, 0.8]));
      p.gravity = o.gravity ?? 0;
      p.drag = o.drag ?? 2.5;
      p.grow = o.grow ?? 0.2;
      p.color = pickOne(o.color);
      p.additive = o.additive ?? true;
      p.angle = a;
      p.spin = rand(-8, 8);
    }
  }

  ring(at: Vec, color: string, radius: number, life = 0.45, width = 3) {
    const p = this.take();
    if (!p) return;
    p.shape = 'ring';
    p.x = at.x;
    p.y = at.y;
    p.size = Math.max(2, radius * 0.15);
    p.grow = radius / p.size;
    p.life = life;
    p.color = color;
    p.drag = 0;
    p.spin = width;
    p.additive = true;
  }

  bolt(from: Vec, to: Vec, color: string, life = 0.25) {
    const p = this.take();
    if (!p) return;
    p.shape = 'bolt';
    p.x = from.x;
    p.y = from.y;
    p.tx = to.x;
    p.ty = to.y;
    p.life = life;
    p.color = color;
    p.size = 3;
    p.additive = true;
  }

  text(at: Vec, text: string, o: TextOptions) {
    const p = this.take();
    if (!p) return;
    p.shape = 'text';
    p.text = text;
    p.x = at.x + rand(-14, 14);
    p.y = at.y;
    p.vx = rand(-12, 12);
    p.vy = -(o.rise ?? 70);
    p.drag = 1.6;
    p.size = o.size;
    p.life = o.life ?? 0.9;
    p.color = o.color;
    p.grow = o.big ? 1 : 0;
    p.additive = false;
  }

  emoji(at: Vec, text: string, size: number, vel: Vec, life: number, gravity = 0) {
    const p = this.take();
    if (!p) return;
    p.shape = 'emoji';
    p.text = text;
    p.x = at.x;
    p.y = at.y;
    p.vx = vel.x;
    p.vy = vel.y;
    p.size = size;
    p.life = life;
    p.gravity = gravity;
    p.drag = 0;
    p.spin = rand(-4, 4);
    p.additive = false;
  }

  /** A glowing ball that flies from one point to another, with a trail, then calls onHit. */
  projectile(
    from: Vec,
    to: Vec,
    color: string,
    ms: number,
    size: number,
    onHit?: () => void,
    arc = 0
  ) {
    const steps = Math.max(4, Math.round(ms / 16));
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      this.later(t * ms, () => {
        const x = from.x + (to.x - from.x) * t;
        const y = from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * arc;
        const head = this.take();
        if (head) {
          head.shape = 'glow';
          head.x = x;
          head.y = y;
          head.size = size;
          head.life = 0.16;
          head.grow = 0.4;
          head.color = color;
        }
        if (i % 2 === 0) {
          const tail = this.take();
          if (tail) {
            tail.shape = 'glow';
            tail.x = x + rand(-3, 3);
            tail.y = y + rand(-3, 3);
            tail.vx = rand(-20, 20);
            tail.vy = rand(-20, 20);
            tail.size = size * 0.55;
            tail.life = 0.35;
            tail.grow = 0;
            tail.color = color;
            tail.drag = 3;
          }
        }
      });
    }
    if (onHit) this.later(ms, onHit);
  }

  shake(amount: number) {
    if (this.density < 1) return;
    this.shakeAmp = Math.max(this.shakeAmp, amount);
  }

  flash(color: string, alpha: number) {
    this.flashColor = color;
    this.flashAlpha = Math.max(this.flashAlpha, alpha * this.density);
  }

  private frame(dt: number, t: number) {
    this.now += dt * 1000;
    if (this.queue.length > 0) {
      const due = this.queue.filter((q) => q.at <= this.now);
      if (due.length > 0) {
        this.queue = this.queue.filter((q) => q.at > this.now);
        due.forEach((q) => q.run());
      }
    }

    const { ctx, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    const def = this.ambient ? AMBIENT[this.ambient] : undefined;

    for (let i = 0; i < this.pool.length; i += 1) {
      const p = this.pool[i];
      if (p.alive) {
        p.age += dt;
        if (p.ambient) {
          p.angle += dt;
          p.x += (p.vx + Math.cos(p.angle) * p.sway) * dt;
          p.y += p.vy * dt;
          if (def && (p.y < -20 || p.y > this.h + 20 || p.x < -20 || p.x > this.w + 20)) {
            def.make(p, this.w, this.h, false);
            p.color = pickOne(def.colors);
          }
        } else if (p.age >= p.life) {
          p.alive = false;
        } else {
          const k = Math.max(0, 1 - p.drag * dt);
          p.vx *= k;
          p.vy = p.vy * k + p.gravity * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.angle += p.spin * dt;
        }
        if (p.alive) this.draw(p, t);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    if (this.flashAlpha > 0.01) {
      ctx.fillStyle = this.flashColor;
      ctx.globalAlpha = this.flashAlpha;
      ctx.fillRect(0, 0, this.w, this.h);
      ctx.globalAlpha = 1;
      this.flashAlpha *= Math.max(0, 1 - dt * 7);
    }

    if (this.shakeTarget) {
      if (this.shakeAmp > 0.3) {
        const x = rand(-1, 1) * this.shakeAmp;
        const y = rand(-1, 1) * this.shakeAmp;
        this.shakeTarget.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        this.shakeAmp *= Math.max(0, 1 - dt * 12);
      } else if (this.shakeAmp > 0) {
        this.shakeAmp = 0;
        this.shakeTarget.style.transform = '';
      }
    }
  }

  private draw(p: Particle, t: number) {
    const { ctx } = this;
    const k = p.ambient ? 1 : p.age / p.life;
    const fade = p.ambient ? 0.55 + 0.25 * Math.sin(t / 400 + p.angle * 3) : 1 - k;
    const size = p.size * (1 + (p.grow - 1) * k);
    ctx.globalCompositeOperation = p.additive ? 'lighter' : 'source-over';
    ctx.globalAlpha = Math.max(0, Math.min(1, fade));
    switch (p.shape) {
      case 'glow': {
        const s = size * 2.4;
        ctx.drawImage(glowSprite(p.color), p.x - s / 2, p.y - s / 2, s, s);
        break;
      }
      case 'spark': {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, size * 0.5);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
        ctx.stroke();
        break;
      }
      case 'ring': {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.ambient ? 1.2 : Math.max(1, p.spin * (1 - k));
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, size), 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'shard': {
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillRect(-size / 2, -size / 4, size, size / 2);
        ctx.restore();
        break;
      }
      case 'bolt': {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5 * (1 - k) + 0.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        const segs = 7;
        for (let i = 1; i < segs; i += 1) {
          const f = i / segs;
          ctx.lineTo(
            p.x + (p.tx - p.x) * f + rand(-12, 12),
            p.y + (p.ty - p.y) * f + rand(-12, 12)
          );
        }
        ctx.lineTo(p.tx, p.ty);
        ctx.stroke();
        break;
      }
      case 'text': {
        const pop = p.grow > 0 ? 1 + Math.max(0, 0.6 - k * 4) : 1;
        ctx.font = `900 ${Math.round(p.size * pop)}px InterVariable, Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = Math.max(0, Math.min(1, (1 - k) * 1.6));
        ctx.lineWidth = p.grow > 0 ? 4 : 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.75)';
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x, p.y);
        break;
      }
      case 'emoji': {
        ctx.font = `${Math.round(size)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillText(p.text, 0, 0);
        ctx.restore();
        break;
      }
      default:
        break;
    }
  }
}
