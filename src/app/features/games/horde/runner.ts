import { TICK, xpToNext } from './engine/data';
import { MetaSave, parseMeta } from './engine/meta';
import { choose, reroll, step } from './engine/run';
import { Choice, GameEvent, PassiveId, Phase, RunState, WeaponId } from './engine/types';
import type { HordeScene } from './render/scene';

// Plays a run on a canvas: reads the keys and the touch stick, steps the engine 60 times a
// second whatever the screen's refresh rate, and tells React only what the HUD shows, a few
// times a second. The 3D scene is handed in, so this file never imports three.js itself.

export type Hud = {
  phase: Phase;
  paused: boolean;
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  time: number;
  kills: number;
  gold: number;
  dash: number;
  rerolls: number;
  choices: Choice[] | undefined;
  weapons: { id: WeaponId; level: number }[];
  passives: { id: PassiveId; level: number }[];
  boss: number | undefined;
};

const storageKey = (userId: string) => `blazeroom.horde.v1:${userId}`;

export const loadMeta = (userId: string): MetaSave => {
  try {
    return parseMeta(localStorage.getItem(storageKey(userId)));
  } catch {
    return parseMeta(undefined);
  }
};

export const saveMeta = (userId: string, meta: MetaSave) => {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(meta));
  } catch {
    // Private mode or full storage: the game still plays, it just won't remember.
  }
};

export const hudOf = (run: RunState, paused: boolean): Hud => {
  const boss = run.enemies.find((e) => e.kind === 'boss');
  return {
    phase: run.phase,
    paused,
    hp: run.player.hp,
    maxHp: run.player.maxHp,
    level: run.player.level,
    xp: run.player.xp / xpToNext(run.player.level),
    time: run.time,
    kills: run.kills,
    gold: run.gold,
    dash: 1 - run.player.dashCd / 2.2,
    rerolls: run.rerolls,
    choices: run.choices,
    weapons: run.weapons.map((w) => ({ id: w.id, level: w.level })),
    passives: run.passives.map((p) => ({ id: p.id, level: p.level })),
    boss: boss ? boss.hp / boss.maxHp : undefined,
  };
};

const MOVE_KEYS: Record<string, [number, number]> = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

const STICK_REACH = 56;
const MAX_NUMBERS = 28;

export class HordeRunner {
  private keys = new Set<string>();

  private dash = false;

  private stick: { id: number; x: number; y: number; dx: number; dy: number } | undefined;

  private paused = false;

  private frame = 0;

  private last = 0;

  private debt = 0;

  private sinceHud = 0;

  private ended = false;

  private numbers = 0;

  private knob: HTMLDivElement;

  private observer: ResizeObserver;

  constructor(
    private run: RunState,
    private scene: HordeScene,
    private overlay: HTMLElement,
    private onHud: (hud: Hud) => void,
    private onEnd: (run: RunState) => void
  ) {
    this.knob = document.createElement('div');
    this.knob.style.cssText =
      'position:absolute;width:112px;height:112px;margin:-56px 0 0 -56px;border-radius:50%;' +
      'border:2px solid rgba(255,255,255,.35);background:rgba(255,255,255,.08);display:none;' +
      'pointer-events:none';
    const nub = document.createElement('div');
    nub.style.cssText =
      'position:absolute;left:50%;top:50%;width:44px;height:44px;margin:-22px 0 0 -22px;' +
      'border-radius:50%;background:rgba(255,255,255,.55)';
    this.knob.appendChild(nub);
    overlay.appendChild(this.knob);

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onBlur);
    overlay.addEventListener('pointerdown', this.onPointerDown);
    overlay.addEventListener('pointermove', this.onPointerMove);
    overlay.addEventListener('pointerup', this.onPointerUp);
    overlay.addEventListener('pointercancel', this.onPointerUp);
    this.observer = new ResizeObserver(() => this.scene.resize());
    this.observer.observe(overlay);

    this.onHud(hudOf(run, false));
    this.frame = requestAnimationFrame(this.loop);
  }

  stop() {
    cancelAnimationFrame(this.frame);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onBlur);
    this.overlay.removeEventListener('pointerdown', this.onPointerDown);
    this.overlay.removeEventListener('pointermove', this.onPointerMove);
    this.overlay.removeEventListener('pointerup', this.onPointerUp);
    this.overlay.removeEventListener('pointercancel', this.onPointerUp);
    this.observer.disconnect();
    this.knob.remove();
    this.scene.dispose();
  }

  setPaused(paused: boolean) {
    if (this.run.phase === 'dead' || this.run.phase === 'won') return;
    this.paused = paused;
    this.keys.clear();
    this.onHud(hudOf(this.run, paused));
  }

  pressDash() {
    this.dash = true;
  }

  choose(index: number) {
    if (choose(this.run, index)) {
      this.keys.clear();
      this.onHud(hudOf(this.run, this.paused));
    }
  }

  reroll() {
    if (reroll(this.run)) this.onHud(hudOf(this.run, this.paused));
  }

  private onKeyDown = (event: KeyboardEvent) => {
    if (event.repeat) return;
    const { code } = event;
    if (this.run.phase === 'choosing') {
      const index = ['Digit1', 'Digit2', 'Digit3'].indexOf(code);
      if (index >= 0) this.choose(index);
      else if (code === 'KeyR') this.reroll();
      return;
    }
    if (code === 'Escape' || code === 'KeyP') {
      this.setPaused(!this.paused);
      return;
    }
    if (code === 'Space' || code === 'ShiftLeft') {
      this.dash = true;
      event.preventDefault();
    } else if (MOVE_KEYS[code]) {
      this.keys.add(code);
      event.preventDefault();
    }
  };

  private onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
  };

  // Leaving the window pauses: nobody should die while answering a message.
  private onBlur = () => {
    this.stick = undefined;
    this.knob.style.display = 'none';
    if (this.run.phase === 'playing' && !this.paused) this.setPaused(true);
  };

  private onPointerDown = (event: PointerEvent) => {
    if (this.stick || event.target !== this.overlay) return;
    const box = this.overlay.getBoundingClientRect();
    this.stick = {
      id: event.pointerId,
      x: event.clientX - box.left,
      y: event.clientY - box.top,
      dx: 0,
      dy: 0,
    };
    this.overlay.setPointerCapture(event.pointerId);
    this.knob.style.left = `${this.stick.x}px`;
    this.knob.style.top = `${this.stick.y}px`;
    this.knob.style.display = 'block';
    this.moveNub();
  };

  private onPointerMove = (event: PointerEvent) => {
    const { stick } = this;
    if (!stick || stick.id !== event.pointerId) return;
    const box = this.overlay.getBoundingClientRect();
    stick.dx = (event.clientX - box.left - stick.x) / STICK_REACH;
    stick.dy = (event.clientY - box.top - stick.y) / STICK_REACH;
    const len = Math.hypot(stick.dx, stick.dy);
    if (len > 1) {
      stick.dx /= len;
      stick.dy /= len;
    }
    this.moveNub();
  };

  private onPointerUp = (event: PointerEvent) => {
    if (this.stick?.id !== event.pointerId) return;
    this.stick = undefined;
    this.knob.style.display = 'none';
  };

  private moveNub() {
    const nub = this.knob.firstElementChild as HTMLElement;
    const { dx = 0, dy = 0 } = this.stick ?? {};
    nub.style.transform = `translate(${dx * STICK_REACH}px, ${dy * STICK_REACH}px)`;
  }

  private input() {
    let moveX = 0;
    let moveZ = 0;
    this.keys.forEach((code) => {
      moveX += MOVE_KEYS[code][0];
      moveZ += MOVE_KEYS[code][1];
    });
    if (this.stick && Math.hypot(this.stick.dx, this.stick.dy) > 0.15) {
      moveX = this.stick.dx;
      moveZ = this.stick.dy;
    }
    const { dash } = this;
    this.dash = false;
    return { moveX, moveZ, dash };
  }

  private showNumbers(events: GameEvent[]) {
    for (let i = 0; i < events.length; i += 1) {
      const event = events[i];
      if (event.type === 'hit' && this.numbers < MAX_NUMBERS) {
        const at = this.scene.project(event.x, event.z, 1.8);
        const el = document.createElement('span');
        el.textContent = String(event.amount);
        el.style.cssText =
          `position:absolute;left:${at.x}px;top:${at.y}px;pointer-events:none;font-weight:900;` +
          `font-size:${event.crit ? 22 : 14}px;color:${event.crit ? '#ffd23a' : '#fff'};` +
          'text-shadow:0 2px 0 #000,0 0 4px #000;transform:translate(-50%,-50%)';
        this.overlay.appendChild(el);
        this.numbers += 1;
        const drift = (Math.random() - 0.5) * 30;
        el.animate(
          [
            { transform: 'translate(-50%,-50%) scale(1.5)', opacity: 1 },
            { transform: `translate(calc(-50% + ${drift}px),-190%) scale(1)`, opacity: 0 },
          ],
          { duration: 520, easing: 'ease-out' }
        ).onfinish = () => {
          el.remove();
          this.numbers -= 1;
        };
      }
    }
  }

  private loop = (now: number) => {
    this.frame = requestAnimationFrame(this.loop);
    const dt = Math.min(0.1, this.last ? (now - this.last) / 1000 : 0);
    this.last = now;
    const phaseBefore = this.run.phase;

    if (!this.paused && this.run.phase === 'playing') {
      this.debt += dt;
      let input = this.input();
      while (this.debt >= TICK && this.run.phase === 'playing') {
        this.debt -= TICK;
        const events = step(this.run, input, TICK);
        input = { ...input, dash: false };
        this.scene.handle(events);
        this.showNumbers(events);
      }
    } else {
      this.debt = 0;
    }
    this.scene.render(this.paused ? 0 : dt);

    this.sinceHud += dt;
    if (this.run.phase !== phaseBefore || this.sinceHud > 0.12) {
      this.sinceHud = 0;
      this.onHud(hudOf(this.run, this.paused));
    }
    if (!this.ended && (this.run.phase === 'dead' || this.run.phase === 'won')) {
      this.ended = true;
      this.onEnd(this.run);
    }
  };
}
