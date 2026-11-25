import { KeySets, PAUSE_KEYS, fromGamepad, fromKeys, keysIn, merge, typingIn } from './controls';
import { AUTO_FPS, AUTO_SECONDS, Graphics, Quality, lower } from './options';
import { DT, CHARGE_FULL } from './engine/data';
import { GameEvent, Input, MatchState, NO_INPUT, Phase, RestartKind, Side } from './engine/types';
import type { FootballScene } from './render/scene';
import type { MatchSource } from './source';

// Plays a match on a canvas: reads keys and gamepads, steps the match 60 times a second
// whatever the screen's refresh rate, draws, and tells React what the scoreboard shows a few
// times a second. The scene is handed in, so this file never imports three.js. The match comes
// from a source (source.ts): stepped here, played online with rollback, or watched.

export type Hud = {
  score: [number, number];
  minute: number;
  half: 1 | 2;
  phase: Phase;
  paused: boolean;
  // 0 to 1 while a person holds shoot or lob.
  charge: [number, number];
  restart: RestartKind | undefined;
  // The last goal, for the banner.
  goal: { side: Side; num: number; own: boolean } | undefined;
  // Online: waiting for the other player's inputs (or, watching, for the next ones).
  waiting: boolean;
};

export type RunnerOptions = {
  // Each side's input source: a person on this computer (P1 or P2 keys and pads) or the CPU.
  sides: ['p1' | 'p2' | 'cpu', 'p1' | 'p2' | 'cpu'];
  onHud: (hud: Hud) => void;
  onEvents?: (events: GameEvent[], m: MatchState) => void;
  onEnd: (m: MatchState) => void;
  keys: KeySets;
  graphics: Graphics;
  // Online the match can't stop: pausing only opens the menu, and the keys go quiet.
  freeze?: boolean;
};

const MAX_STEPS = 8;

export class FootballRunner {
  private held = new Set<string>();

  private raf = 0;

  private last = 0;

  private acc = 0;

  private paused = false;

  private hudAt = 0;

  private ended = false;

  private goal: Hud['goal'];

  private stopped = false;

  private keys: KeySets;

  private gameKeys = new Set<string>();

  private graphics: Graphics;

  private quality: Quality;

  // Auto quality: frames counted over the last second, and seconds in a row under the floor.
  private fps = { frames: 0, since: 0, slow: 0 };

  // Ticks in a row the source had to wait, for the "waiting" sign.
  private waited = 0;

  constructor(
    private source: MatchSource,
    private scene: FootballScene,
    private opts: RunnerOptions
  ) {
    this.keys = opts.keys;
    this.graphics = opts.graphics;
    this.quality = opts.graphics.quality === 'auto' ? 'high' : opts.graphics.quality;
    this.setKeys(opts.keys);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    this.raf = requestAnimationFrame(this.frame);
  }

  // Keys typed into a field (the search, a chat box) are not the game's; while paused, the
  // keys belong to the pause dialog, except the ones that resume.
  private onKeyDown = (e: KeyboardEvent) => {
    if (typingIn(e.target) || e.defaultPrevented) return;
    if (PAUSE_KEYS.includes(e.code)) {
      if (this.ended) return;
      this.setPaused(!this.paused);
      e.preventDefault();
      return;
    }
    if (this.paused || !this.gameKeys.has(e.code)) return;
    // Arrows and space would scroll the page.
    e.preventDefault();
    this.held.add(e.code);
  };

  setKeys(keys: KeySets): void {
    this.keys = keys;
    const twoPeople = this.opts.sides[0] !== 'cpu' && this.opts.sides[1] !== 'cpu';
    this.gameKeys = keysIn(twoPeople ? [keys.p1, keys.p2] : [keys.alone]);
    this.held.clear();
  }

  setGraphics(graphics: Graphics): void {
    this.graphics = graphics;
    if (graphics.quality !== 'auto') this.quality = graphics.quality;
    this.scene.setQuality(this.quality);
    this.scene.setCamera(graphics.camera);
    this.fps.slow = 0;
  }

  // Under the floor for a few seconds in a row: one step down, until low.
  private watchFrames(now: number) {
    const f = this.fps;
    f.frames += 1;
    if (!f.since) f.since = now;
    if (now - f.since < 1000) return;
    const rate = (f.frames * 1000) / (now - f.since);
    f.frames = 0;
    f.since = now;
    if (this.graphics.quality !== 'auto' || this.paused || this.quality === 'low') return;
    f.slow = rate < AUTO_FPS ? f.slow + 1 : 0;
    if (f.slow >= AUTO_SECONDS) {
      f.slow = 0;
      this.quality = lower(this.quality);
      this.scene.setQuality(this.quality);
    }
  }

  private onKeyUp = (e: KeyboardEvent) => {
    this.held.delete(e.code);
  };

  private onBlur = () => {
    this.held.clear();
    if (!this.ended && this.opts.freeze !== false) this.setPaused(true);
  };

  setPaused(paused: boolean): void {
    this.paused = paused;
    this.held.clear();
    this.pushHud(true);
  }

  private inputFor(side: Side, pads: (Gamepad | null)[]): Input {
    const who = this.opts.sides[side];
    if (who === 'cpu') return NO_INPUT;
    const twoPeople = this.opts.sides[0] !== 'cpu' && this.opts.sides[1] !== 'cpu';
    if (who === 'p1') {
      const keys = fromKeys(this.held, twoPeople ? this.keys.p1 : this.keys.alone);
      return merge(keys, fromGamepad(pads[0]));
    }
    return merge(fromKeys(this.held, this.keys.p2), fromGamepad(pads[twoPeople ? 1 : 0]));
  }

  private frame = (now: number) => {
    if (this.stopped) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 0;
    this.last = now;
    const frozen = this.paused && this.opts.freeze !== false;
    if (!frozen && !this.ended) {
      this.acc += dt;
      const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
      const inputs: [Input, Input] = this.paused
        ? [NO_INPUT, NO_INPUT]
        : [this.inputFor(0, pads), this.inputFor(1, pads)];
      let steps = 0;
      while (this.acc >= DT && steps < MAX_STEPS) {
        const events = this.source.advance(inputs);
        if (events === null) {
          this.waited += 1;
          this.acc = 0;
          break;
        }
        this.waited = 0;
        this.acc -= DT;
        steps += 1;
        const m = this.source.match;
        const goal = events.find((e) => e.type === 'goal');
        if (goal && goal.type === 'goal') {
          const p = m.players[goal.scorer];
          this.goal = { side: goal.side, num: p?.num ?? 0, own: goal.own };
          this.pushHud(true);
        }
        if (events.length) this.opts.onEvents?.(events, m);
        if (this.source.ended()) {
          this.ended = true;
          this.pushHud(true);
          this.opts.onEnd(m);
          break;
        }
      }
      if (steps === MAX_STEPS) this.acc = 0;
      if (this.source.match.phase === 'play' && this.goal) this.goal = undefined;
    }
    const m = this.source.match;
    this.scene.render(m, frozen ? 0 : dt, m.control);
    this.watchFrames(now);
    if (now - this.hudAt > 100) this.pushHud(false);
  };

  private pushHud(force: boolean) {
    const now = performance.now();
    if (!force && now - this.hudAt < 100) return;
    this.hudAt = now;
    const m = this.source.match;
    this.opts.onHud({
      score: [m.score[0], m.score[1]],
      minute: Math.floor(m.clock / 60),
      half: m.half,
      phase: m.phase,
      paused: this.paused,
      charge: [Math.min(1, m.charge[0] / CHARGE_FULL), Math.min(1, m.charge[1] / CHARGE_FULL)],
      restart: m.phase === 'restart' ? m.restart?.kind : undefined,
      goal: m.phase === 'goal' ? this.goal : undefined,
      // Half a second of waiting before saying so: a tick or two is normal online.
      waiting: this.waited > 30,
    });
  }

  stop(): void {
    this.stopped = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
  }
}
