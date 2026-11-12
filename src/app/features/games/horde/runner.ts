import { Action, Controls, actionsOf, isHeld, worldMove } from './controls';
import { ABILITY_COOLDOWN, MOVE, SHRINE_RADIUS, TICK, xpToNext } from './engine/data';
import { MetaSave, parseMeta } from './engine/meta';
import { banish, choose, closeChest, reroll, runStats, skip, step } from './engine/run';
import { ReplayRecorder, packInput } from './engine/replay';
import { ReplayPlayer } from './engine/replayCheck';
import { Stats } from './engine/stats';
import { weaponSpec } from './engine/weapons';
import {
  Choice,
  GameEvent,
  Input,
  PassiveId,
  Phase,
  RunState,
  ShrineKind,
  WeaponId,
} from './engine/types';
import type { CameraView, HordeScene } from './render/scene';
import type { HordeAudio } from './audio/sound';
import { effectiveVolume } from './audio/mix';
import { groupHits } from './numbers';
import { bannerOf, eliteModLabel } from './labels';
import { MapHud } from './mapHud';

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
  overHp: number;
  shield: number;
  maxShield: number;
  // Seconds left of the powerups that last.
  buffs: { rage: number; freeze: number; star: number };
  level: number;
  xp: number;
  time: number;
  kills: number;
  gold: number;
  dash: number;
  // 1 when the hero's ability is ready.
  ability: number;
  banishes: number;
  skips: number;
  // What an open chest gave.
  chest: Choice[] | undefined;
  // A challenge shrine running: seconds and kills left.
  challenge: { seconds: number; kills: number } | undefined;
  // Seconds left of a cursed shrine.
  curse: number;
  // The kind of the unused shrine the hero stands on.
  shrine: ShrineKind | undefined;
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
    overHp: run.player.overHp,
    shield: run.player.shield,
    maxShield: runStats(run).shield,
    buffs: { ...run.buffs },
    level: run.player.level,
    xp: run.player.xp / xpToNext(run.player.level),
    time: run.time,
    kills: run.kills,
    gold: run.gold,
    dash: 1 - run.player.dashCd / MOVE.dashCooldown,
    ability: 1 - run.player.abilityCd / ABILITY_COOLDOWN[run.character],
    banishes: run.banishes,
    skips: run.skips,
    chest: run.chest,
    challenge: run.challenge && {
      seconds: Math.max(0, run.challenge.until - run.time),
      kills: Math.max(0, run.challenge.need - (run.kills - run.challenge.from)),
    },
    curse: Math.max(0, (run.curseUntil ?? 0) - run.time),
    shrine: run.shrines.find(
      (s) =>
        !s.used &&
        (s.x - run.player.x) ** 2 + (s.z - run.player.z) ** 2 < SHRINE_RADIUS * SHRINE_RADIUS
    )?.kind,
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

// Seconds between saves of a run in play.
const SAVE_EVERY = 4;
// Automatic quality steps down this ladder when frames run slow.
const AUTO_LEVELS = ['low', 'medium'] as const;

// The best thing on offer, for the sound of the offer.
const bestRarity = (choices: Choice[] | undefined): 'rare' | 'epic' | 'evolve' | undefined => {
  if (choices?.some((c) => c.kind === 'evolve')) return 'evolve';
  if (choices?.some((c) => 'rarity' in c && c.rarity === 'epic')) return 'epic';
  if (choices?.some((c) => 'rarity' in c && c.rarity === 'rare')) return 'rare';
  return undefined;
};

// Right click can be a key, so it doesn't open the browser's menu over the game.
const noMenu = (event: Event) => event.preventDefault();

export class HordeRunner {
  // Keys and mouse buttons held down, by code.
  private held = new Set<string>();

  private jump = false;

  private dash = false;

  private ability = false;

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

  private flashEl: HTMLDivElement;

  // Records every command for the server's check, or plays recorded ones when watching.
  private recorder: ReplayRecorder | undefined;

  private player: ReplayPlayer | undefined;

  // The recording has nothing more to play: it reached its last tick, or a run left mid-way.
  private watchOver = false;

  // The rounded move of the last input, as the recording keeps it.
  private move = { sector: 0, power: 0 };

  private sinceSave = 0;

  // Automatic quality: a step of AUTO_LEVELS, and frame times over the last few seconds.
  private autoLevel = 1;

  private frameTime = 0;

  private frames = 0;

  // The names over elites' heads, by enemy id.
  private eliteTags = new Map<number, HTMLDivElement>();

  private mapHud: MapHud;

  private observer: ResizeObserver;

  constructor(
    private run: RunState,
    private scene: HordeScene,
    private overlay: HTMLElement,
    private controls: Controls,
    private onHud: (hud: Hud) => void,
    private onEnd: (run: RunState) => void,
    // Sound is optional: without an AudioContext (or with it refused) the game plays silent.
    private sound: {
      audio?: HordeAudio;
      inCall?: boolean;
      // Keeps the run in the browser every few seconds and when the page goes away.
      onSave?: (run: RunState) => void;
      // Watching a recorded run: its commands drive it up to the tick it ended at, and the keys
      // only move the camera.
      watch?: { log: number[]; endTick: number };
    } = {}
  ) {
    this.view = { yaw: 0, pitch: 0.42, distance: controls.distance, fov: controls.fov };
    if (sound.watch) this.player = new ReplayPlayer(sound.watch.log);
    else this.recorder = new ReplayRecorder(run);
    this.flashEl = document.createElement('div');
    this.flashEl.style.cssText =
      'position:absolute;inset:0;pointer-events:none;opacity:0;mix-blend-mode:screen';
    overlay.appendChild(this.flashEl);
    this.applySettings();
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
    this.mapHud = new MapHud(overlay, run, scene);

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('pagehide', this.onPageHide);
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

  // Keeps a run that isn't over, for "Continue run".
  save() {
    const { phase } = this.run;
    if (phase === 'playing' || phase === 'choosing' || phase === 'chest')
      this.sound.onSave?.(this.run);
  }

  private onPageHide = () => this.save();

  // Given up: nothing is kept any more.
  discard() {
    this.ended = true;
    this.sound.onSave = undefined;
  }

  stop() {
    if (!this.ended) this.save();
    cancelAnimationFrame(this.frame);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('pagehide', this.onPageHide);
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
    this.flashEl.remove();
    this.eliteTags.forEach((el) => el.remove());
    this.mapHud.dispose();
    this.sound.audio?.dispose();
    this.scene.dispose();
  }

  // Joining or leaving a call while playing turns the game down or back up.
  setInCall(inCall: boolean) {
    this.sound.inCall = inCall;
    this.applySettings();
  }

  // The run's build, with each weapon's numbers now, for the build screen.
  build() {
    const stats = runStats(this.run);
    return {
      hero: this.run.character,
      weapons: this.run.weapons.map((weapon) => ({
        weapon: { ...weapon },
        spec: weaponSpec(weapon, stats),
      })),
      passives: this.run.passives.map((p) => ({ ...p })),
    };
  }

  // The hero's stats right now, for the stats screen.
  stats(): Stats {
    return runStats(this.run);
  }

  setControls(controls: Controls) {
    this.controls = controls;
    this.applySettings();
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

  pressAbility() {
    this.ability = true;
  }

  banish(index: number) {
    const { tick } = this.run;
    if (this.player || !banish(this.run, index)) return;
    this.recorder?.banish(tick, index);
    this.sendHud();
  }

  skip() {
    const { tick } = this.run;
    if (this.player || !skip(this.run)) return;
    this.recorder?.skip(tick);
    this.afterOffer();
  }

  // Back to the run after looking at a chest.
  closeChest() {
    const { tick } = this.run;
    if (this.player || !closeChest(this.run)) return;
    this.recorder?.closeChest(tick);
    this.afterOffer();
  }

  private afterOffer() {
    this.held.clear();
    if (this.run.phase === 'playing' && !this.paused) this.capturePointer();
    this.sendHud();
  }

  // The touch jump button: pressed and let go, like the key.
  holdJump(down: boolean) {
    if (down && !this.touchJump) this.jump = true;
    this.touchJump = down;
  }

  choose(index: number) {
    const { tick } = this.run;
    if (this.player || !choose(this.run, index)) return;
    this.recorder?.choose(tick, index);
    this.afterOffer();
  }

  reroll() {
    const { tick } = this.run;
    if (this.player || !reroll(this.run)) return;
    this.recorder?.reroll(tick);
    this.sendHud();
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
    if (phase === 'chest') {
      if (action === 'pick1' || action === 'pick2' || action === 'pick3' || action === 'jump') {
        this.closeChest();
      }
      return;
    }
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
    else if (action === 'ability') this.ability = true;
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
    this.save();
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
    const { jump, dash, ability } = this;
    this.jump = false;
    this.dash = false;
    this.ability = false;
    const { moveX, moveZ, sector, power } = worldMove(right, forward, this.view.yaw);
    this.move = { sector, power };
    return {
      moveX,
      moveZ,
      jump,
      jumpHeld: isHeld(controls, 'jump', held) || this.touchJump,
      dash,
      ability,
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

  private applySettings() {
    const { controls, sound } = this;
    this.scene.reduceMotion = controls.reduceMotion;
    if (controls.quality !== 'auto') this.scene.setQuality(controls.quality);
    else this.scene.setQuality(AUTO_LEVELS[this.autoLevel]);
    sound.audio?.setVolume(effectiveVolume(controls.volume, controls.muted, !!sound.inCall));
  }

  // A quick colored flash over the whole screen. Not with "reduce motion".
  private flash(color: string, strength: number) {
    if (this.controls.reduceMotion) return;
    this.flashEl.style.background = color;
    this.flashEl.animate([{ opacity: strength }, { opacity: 0 }], {
      duration: 260,
      easing: 'ease-out',
    });
  }

  // Big words across the screen: a boss, a horde event, a shrine's result.
  private warn(text: string, color = '#ff5a3a') {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText =
      'position:absolute;left:0;right:0;top:28%;text-align:center;pointer-events:none;' +
      `font-weight:900;font-size:clamp(20px,4.5vw,40px);letter-spacing:2px;color:${color};` +
      'text-shadow:0 3px 0 #000,0 0 18px rgba(255,60,30,.8)';
    this.overlay.appendChild(el);
    el.animate(
      [
        { opacity: 0, transform: 'scale(1.4)' },
        { opacity: 1, transform: 'scale(1)', offset: 0.15 },
        { opacity: 1, offset: 0.8 },
        { opacity: 0 },
      ],
      { duration: 2800, easing: 'ease-out' }
    ).onfinish = () => el.remove();
  }

  private effects(events: GameEvent[]) {
    for (let i = 0; i < events.length; i += 1) {
      const event = events[i];
      if (event.type === 'levelup' || event.type === 'shrine') this.flash('#6ae6ff', 0.35);
      else if (event.type === 'blast' && event.radius > 4.5) this.flash('#ffb060', 0.2);
      else if (event.type === 'powerup' && event.kind === 'bomb') this.flash('#ffffff', 0.7);
      else if (event.type === 'evolve') this.flash('#ff9a3a', 0.5);
      else if (event.type === 'ability') this.flash('#ffe08a', 0.25);
      else if (event.type === 'hurt') {
        this.flash('#ff2020', 0.18);
        if (this.controls.vibrate) navigator.vibrate?.(35);
      } else if (event.type === 'boss') this.flash('#ff3020', 0.4);
      const banner = bannerOf(event);
      if (banner) this.warn(banner.text, banner.color);
    }
  }

  // Watching: the recording's commands play the run at its own speed, choices and all.
  private watchFrame(dt: number) {
    const { player, run } = this;
    if (!player) return;
    this.debt += dt;
    const frameEvents: GameEvent[] = [];
    const endTick = this.sound.watch?.endTick ?? Infinity;
    while (this.debt >= TICK && run.phase !== 'dead' && run.phase !== 'won') {
      if (run.tick >= endTick || !player.apply(run)) {
        this.watchOver = true;
        break;
      }
      if (run.phase === 'playing') {
        this.debt -= TICK;
        const events = step(run, player.input, TICK);
        this.scene.handle(events);
        this.sound.audio?.handle(events);
        for (let i = 0; i < events.length; i += 1) frameEvents.push(events[i]);
      } else if (!player.waitsForCommand(run)) {
        // The recording stops here (the run was left at a choice).
        this.watchOver = true;
        break;
      }
    }
    this.showNumbers(frameEvents);
  }

  // With automatic quality, a few seconds under 40 frames a second steps down a level.
  private watchFrames(dt: number) {
    if (this.controls.quality !== 'auto' || dt <= 0) return;
    this.frameTime += dt;
    this.frames += 1;
    if (this.frameTime < 3) return;
    const average = this.frameTime / this.frames;
    this.frameTime = 0;
    this.frames = 0;
    if (average > 1 / 40 && this.autoLevel > 0) {
      this.autoLevel -= 1;
      this.scene.setQuality(AUTO_LEVELS[this.autoLevel]);
    }
  }

  // Each elite's twist, written over it. Few elites live at once, so DOM is fine.
  private placeEliteTags() {
    const seen = new Set<number>();
    this.run.enemies.forEach((e) => {
      if (!e.mod || e.hp <= 0 || seen.size >= 6) return;
      seen.add(e.id);
      let el = this.eliteTags.get(e.id);
      if (!el) {
        el = document.createElement('div');
        el.textContent = eliteModLabel(e.mod);
        el.style.cssText =
          'position:absolute;pointer-events:none;transform:translate(-50%,-100%);' +
          'font-size:12px;font-weight:900;color:#ffd23a;text-shadow:0 2px 0 #000';
        this.overlay.appendChild(el);
        this.eliteTags.set(e.id, el);
      }
      const at = this.scene.project(e.x, e.z, e.radius * 3.4);
      el.style.left = `${at.x}px`;
      el.style.top = `${at.y}px`;
    });
    this.eliteTags.forEach((el, id) => {
      if (!seen.has(id)) {
        el.remove();
        this.eliteTags.delete(id);
      }
    });
  }

  private showNumbers(events: GameEvent[]) {
    const hits = groupHits(events);
    for (let i = 0; i < hits.length; i += 1) {
      const event = hits[i];
      if (this.numbers < MAX_NUMBERS) {
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

    if (this.watchOver) {
      this.debt = 0;
    } else if (
      !this.paused &&
      this.player &&
      this.run.phase !== 'dead' &&
      this.run.phase !== 'won'
    ) {
      this.watchFrame(dt);
    } else if (!this.paused && this.run.phase === 'playing') {
      this.debt += dt;
      this.followHero(dt);
      let input = this.input();
      const frameEvents: GameEvent[] = [];
      while (this.debt >= TICK && this.run.phase === 'playing') {
        this.debt -= TICK;
        this.recorder?.input(this.run.tick, packInput(this.move.sector, this.move.power, input));
        const events = step(this.run, input, TICK);
        // A press counts once, on the first tick of the frame.
        input = { ...input, jump: false, dash: false, ability: false };
        this.scene.handle(events);
        this.sound.audio?.handle(events);
        this.effects(events);
        for (let i = 0; i < events.length; i += 1) frameEvents.push(events[i]);
      }
      this.showNumbers(frameEvents);
    } else {
      this.debt = 0;
    }
    this.scene.render(this.paused ? 0 : dt, this.view);
    this.placeEliteTags();
    this.mapHud.update(dt, this.view.yaw);

    if (this.run.phase !== phaseBefore && this.run.phase !== 'playing') {
      // A choice or the end of the run: the mouse is needed for the buttons.
      this.held.clear();
      this.releasePointer();
      if (this.run.phase === 'choosing') this.sound.audio?.offer(bestRarity(this.run.choices));
    }
    if (!this.paused && this.run.phase === 'playing') {
      this.sinceSave += dt;
      if (this.sinceSave > SAVE_EVERY) {
        this.sinceSave = 0;
        this.save();
      }
      this.watchFrames(dt);
    }
    this.sinceHud += dt;
    if (this.run.phase !== phaseBefore || this.sinceHud > 0.12) {
      this.sinceHud = 0;
      this.sendHud();
    }
    const over = this.run.phase === 'dead' || this.run.phase === 'won';
    if (!this.ended && (over || this.watchOver)) {
      this.ended = true;
      if (over) this.sound.audio?.end(this.run.phase === 'won');
      this.onEnd(this.run);
    }
  };
}
