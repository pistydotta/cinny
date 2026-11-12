import { Action, Controls, actionsOf, isHeld, worldMove } from './controls';
import { MOVE, TICK, xpToNext } from './engine/data';
import { MetaSave, parseMeta } from './engine/meta';
import { choose, reroll, step } from './engine/run';
import { Choice, GameEvent, Input, PassiveId, Phase, RunState, WeaponId } from './engine/types';
import type { CameraView, HordeScene } from './render/scene';

// Plays a run on a canvas: reads the keys, the mouse and the touch stick, turns the camera,
// steps the engine 60 times a second whatever the screen's refresh rate, and tells React only
// what the HUD shows, a few times a second. The 3D scene is handed in, so this file never imports
// three.js itself.
//
// The engine knows nothing about the camera: this file turns "forward" into a direction in the
// world with the camera's angle, and that direction is the command the engine gets.

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
  // Horizontal speed, for the speedometer.
  speed: number;
  // Whether the mouse is captured and turns the camera.
  aiming: boolean;
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

export const hudOf = (run: RunState, paused: boolean, aiming = false): Hud => {
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
    dash: 1 - run.player.dashCd / MOVE.dashCooldown,
    speed: Math.hypot(run.player.vx, run.player.vz),
    aiming,
    rerolls: run.rerolls,
    choices: run.choices,
    weapons: run.weapons.map((w) => ({ id: w.id, level: w.level })),
    passives: run.passives.map((p) => ({ id: p.id, level: p.level })),
    boss: boss ? boss.hp / boss.maxHp : undefined,
  };
};

const STICK_REACH = 56;
const MAX_NUMBERS = 28;
const PITCH_MIN = 0.05;
const PITCH_MAX = 1.35;
// Touch drags turn the camera this much slower than a captured mouse.
const TOUCH_TURN = 2.2;

const TOUCH = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

type Drag = { id: number; x: number; y: number };

// Right click can be a key, so it doesn't open the browser's menu over the game.
const noMenu = (event: Event) => event.preventDefault();

export class HordeRunner {
  // Keys and mouse buttons held down, by code.
  private held = new Set<string>();

  private jump = false;

  private dash = false;

  // The touch jump button, held.
  private touchJump = false;

  private stick: { id: number; x: number; y: number; dx: number; dy: number } | undefined;

  // A finger, or a mouse with no pointer lock, dragging the camera around.
  private look: Drag | undefined;

  private view: CameraView;

  private paused = false;

  private locked = false;

  // When the pointer lock was last lost: the Esc that released it must not also resume.
  private unlockedAt = -1e9;

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
    private controls: Controls,
    private onHud: (hud: Hud) => void,
    private onEnd: (run: RunState) => void
  ) {
    this.view = { yaw: 0, pitch: 0.42, distance: controls.distance, fov: controls.fov };
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
    document.addEventListener('pointerlockchange', this.onLockChange);
    overlay.addEventListener('pointerdown', this.onPointerDown);
    overlay.addEventListener('pointermove', this.onPointerMove);
    overlay.addEventListener('pointerup', this.onPointerUp);
    overlay.addEventListener('pointercancel', this.onPointerUp);
    overlay.addEventListener('contextmenu', noMenu);
    this.observer = new ResizeObserver(() => this.scene.resize());
    this.observer.observe(overlay);

    this.sendHud();
    this.frame = requestAnimationFrame(this.loop);
  }

  stop() {
    cancelAnimationFrame(this.frame);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onBlur);
    document.removeEventListener('pointerlockchange', this.onLockChange);
    this.overlay.removeEventListener('pointerdown', this.onPointerDown);
    this.overlay.removeEventListener('pointermove', this.onPointerMove);
    this.overlay.removeEventListener('pointerup', this.onPointerUp);
    this.overlay.removeEventListener('pointercancel', this.onPointerUp);
    this.overlay.removeEventListener('contextmenu', noMenu);
    this.observer.disconnect();
    this.knob.remove();
    this.releasePointer();
    this.scene.dispose();
  }

  setControls(controls: Controls) {
    this.controls = controls;
    this.view.distance = controls.distance;
    this.view.fov = controls.fov;
  }

  setPaused(paused: boolean) {
    if (this.run.phase === 'dead' || this.run.phase === 'won') return;
    this.paused = paused;
    this.held.clear();
    if (paused) this.releasePointer();
    else this.capturePointer();
    this.sendHud();
  }

  pressDash() {
    this.dash = true;
  }

  // The touch jump button: pressed and let go, like the key.
  holdJump(down: boolean) {
    if (down && !this.touchJump) this.jump = true;
    this.touchJump = down;
  }

  choose(index: number) {
    if (choose(this.run, index)) {
      this.held.clear();
      if (this.run.phase === 'playing' && !this.paused) this.capturePointer();
      this.sendHud();
    }
  }

  reroll() {
    if (reroll(this.run)) this.sendHud();
  }

  private sendHud() {
    this.onHud(hudOf(this.run, this.paused, this.locked));
  }

  // The mouse turns the camera only while captured. Asking needs a click or a key, which every
  // caller here comes from; a refusal (too soon after Esc, or no support) leaves drag-to-turn.
  private capturePointer() {
    if (TOUCH || this.locked || this.run.phase !== 'playing' || !this.overlay.requestPointerLock) {
      return;
    }
    try {
      const asked = this.overlay.requestPointerLock() as unknown as Promise<void> | undefined;
      asked?.catch?.(() => undefined);
    } catch {
      // Some browsers throw instead of answering with a promise.
    }
  }

  private releasePointer() {
    if (document.pointerLockElement === this.overlay) document.exitPointerLock();
  }

  private onLockChange = () => {
    const locked = document.pointerLockElement === this.overlay;
    if (locked === this.locked) return;
    this.locked = locked;
    if (!locked) {
      this.unlockedAt = performance.now();
      // Esc releases the mouse before the page sees the key: that is the pause.
      if (this.run.phase === 'playing' && !this.paused) this.setPaused(true);
    }
    this.sendHud();
  };

  private act(action: Action, event: Event) {
    const { phase } = this.run;
    if (phase === 'choosing') {
      if (action === 'pick1' || action === 'pick2' || action === 'pick3') {
        this.choose(Number(action.slice(4)) - 1);
      } else if (action === 'reroll') this.reroll();
      return;
    }
    if (action === 'pause') {
      // The Esc that just let the mouse go already paused.
      if (this.paused && performance.now() - this.unlockedAt < 400) return;
      this.setPaused(!this.paused);
      event.preventDefault();
      return;
    }
    if (this.paused || phase !== 'playing') return;
    if (action === 'jump') this.jump = true;
    else if (action === 'dash') this.dash = true;
    event.preventDefault();
  }

  private press(code: string, event: Event) {
    const actions = actionsOf(this.controls, code);
    if (code === 'Escape' && !actions.includes('pause')) actions.push('pause');
    if (actions.length === 0) return;
    if (!this.paused && this.run.phase === 'playing') this.held.add(code);
    actions.forEach((action) => this.act(action, event));
  }

  private onKeyDown = (event: KeyboardEvent) => {
    if (event.repeat) {
      // Held keys that move still shouldn't scroll the page.
      if (actionsOf(this.controls, event.code).length > 0) event.preventDefault();
      return;
    }
    this.press(event.code, event);
  };

  private onKeyUp = (event: KeyboardEvent) => {
    this.held.delete(event.code);
  };

  // Leaving the window pauses: nobody should die while answering a message.
  private onBlur = () => {
    this.stick = undefined;
    this.look = undefined;
    this.touchJump = false;
    this.knob.style.display = 'none';
    if (this.run.phase === 'playing' && !this.paused) this.setPaused(true);
  };

  private turn(dx: number, dy: number) {
    const k = this.controls.sensitivity / 1000;
    this.view.yaw -= dx * k;
    this.view.pitch += dy * k * (this.controls.invertY ? -1 : 1);
    this.view.pitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, this.view.pitch));
  }

  private onPointerDown = (event: PointerEvent) => {
    if (event.target !== this.overlay) return;
    const box = this.overlay.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    if (event.pointerType === 'mouse') {
      if (this.locked) {
        this.press(`Mouse${event.button}`, event);
        return;
      }
      // Until the browser captures the mouse (or if it never does), dragging turns the camera.
      this.look = { id: event.pointerId, x: event.clientX, y: event.clientY };
      this.overlay.setPointerCapture(event.pointerId);
      this.capturePointer();
      return;
    }
    // On a touch screen the left half is the stick and the right half turns the camera.
    if (x > box.width / 2) {
      if (!this.look) {
        this.look = { id: event.pointerId, x: event.clientX, y: event.clientY };
        this.overlay.setPointerCapture(event.pointerId);
      }
      return;
    }
    if (this.stick) return;
    this.stick = { id: event.pointerId, x, y, dx: 0, dy: 0 };
    this.overlay.setPointerCapture(event.pointerId);
    this.knob.style.left = `${x}px`;
    this.knob.style.top = `${y}px`;
    this.knob.style.display = 'block';
    this.moveNub();
  };

  private onPointerMove = (event: PointerEvent) => {
    if (this.locked && event.pointerType === 'mouse') {
      if (!this.paused && this.run.phase === 'playing') this.turn(event.movementX, event.movementY);
      return;
    }
    const { look, stick } = this;
    if (look && look.id === event.pointerId) {
      const scale = event.pointerType === 'mouse' ? 1 : TOUCH_TURN;
      this.turn((event.clientX - look.x) * scale, (event.clientY - look.y) * scale);
      look.x = event.clientX;
      look.y = event.clientY;
      return;
    }
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
    if (event.pointerType === 'mouse' && this.locked) {
      this.held.delete(`Mouse${event.button}`);
      return;
    }
    if (this.look?.id === event.pointerId) {
      this.look = undefined;
      return;
    }
    if (this.stick?.id !== event.pointerId) return;
    this.stick = undefined;
    this.knob.style.display = 'none';
  };

  private moveNub() {
    const nub = this.knob.firstElementChild as HTMLElement;
    const { dx = 0, dy = 0 } = this.stick ?? {};
    nub.style.transform = `translate(${dx * STICK_REACH}px, ${dy * STICK_REACH}px)`;
  }

  private input(): Input {
    const { controls, held } = this;
    let right = 0;
    let forward = 0;
    if (isHeld(controls, 'right', held)) right += 1;
    if (isHeld(controls, 'left', held)) right -= 1;
    if (isHeld(controls, 'forward', held)) forward += 1;
    if (isHeld(controls, 'back', held)) forward -= 1;
    if (this.stick && Math.hypot(this.stick.dx, this.stick.dy) > 0.15) {
      right = this.stick.dx;
      forward = -this.stick.dy;
    }
    const { jump, dash } = this;
    this.jump = false;
    this.dash = false;
    return {
      ...worldMove(right, forward, this.view.yaw),
      jump,
      jumpHeld: isHeld(controls, 'jump', held) || this.touchJump,
      dash,
    };
  }

  // On touch screens, with nobody turning it, the camera swings slowly behind where the hero runs.
  private followHero(dt: number) {
    if (!TOUCH || !this.controls.autoCamera || this.look || !this.run.player.moving) return;
    const { dirX, dirZ } = this.run.player;
    const behind = Math.atan2(-dirX, -dirZ);
    let diff = behind - this.view.yaw;
    diff -= Math.round(diff / (Math.PI * 2)) * Math.PI * 2;
    // Running straight at the camera is a choice, not something to spin around.
    if (Math.abs(diff) > Math.PI * 0.75) return;
    this.view.yaw += diff * Math.min(1, dt * 1.6);
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
      this.followHero(dt);
      let input = this.input();
      while (this.debt >= TICK && this.run.phase === 'playing') {
        this.debt -= TICK;
        const events = step(this.run, input, TICK);
        // A press counts once, on the first tick of the frame.
        input = { ...input, jump: false, dash: false };
        this.scene.handle(events);
        this.showNumbers(events);
      }
    } else {
      this.debt = 0;
    }
    this.scene.render(this.paused ? 0 : dt, this.view);

    if (this.run.phase !== phaseBefore && this.run.phase !== 'playing') {
      // A choice or the end of the run: the mouse is needed for the buttons.
      this.held.clear();
      this.releasePointer();
    }
    this.sinceHud += dt;
    if (this.run.phase !== phaseBefore || this.sinceHud > 0.12) {
      this.sinceHud = 0;
      this.sendHud();
    }
    if (!this.ended && (this.run.phase === 'dead' || this.run.phase === 'won')) {
      this.ended = true;
      this.onEnd(this.run);
    }
  };
}
