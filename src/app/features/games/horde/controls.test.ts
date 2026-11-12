import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONTROLS,
  actionsOf,
  bindKey,
  conflicts,
  fallbackKeyName,
  isHeld,
  parseControls,
  worldMove,
} from './controls';

describe('horde controls', () => {
  it('has Space to jump and Shift to dodge by default, with no clashes', () => {
    expect(DEFAULT_CONTROLS.keys.jump).toContain('Space');
    expect(DEFAULT_CONTROLS.keys.dash).toContain('ShiftLeft');
    expect(conflicts(DEFAULT_CONTROLS).size).toBe(0);
  });

  it('reads its own save back', () => {
    const changed = { ...bindKey(DEFAULT_CONTROLS, 'jump', 1, 'Mouse2'), fov: 70, invertY: true };
    expect(parseControls(JSON.stringify(changed))).toEqual(changed);
  });

  it('falls back to the defaults for a broken or partial save', () => {
    expect(parseControls('{oops')).toEqual(DEFAULT_CONTROLS);
    expect(parseControls(null)).toEqual(DEFAULT_CONTROLS);
    const partial = parseControls(
      JSON.stringify({
        keys: { jump: ['KeyJ', ''], dash: ['', ''], left: 'KeyQ', right: ['<script>', 'KeyL'] },
        sensitivity: 1e9,
        fov: 'wide',
      })
    );
    expect(partial.keys.jump).toEqual(['KeyJ', '']);
    // An action can't be left with no key at all, nor take junk.
    expect(partial.keys.dash).toEqual(DEFAULT_CONTROLS.keys.dash);
    expect(partial.keys.left).toEqual(DEFAULT_CONTROLS.keys.left);
    expect(partial.keys.right).toEqual(['', 'KeyL']);
    expect(partial.keys.forward).toEqual(DEFAULT_CONTROLS.keys.forward);
    expect(partial.sensitivity).toBe(8);
    expect(partial.fov).toBe(DEFAULT_CONTROLS.fov);
  });

  it('shows a clash instead of moving the other key', () => {
    const clashing = bindKey(DEFAULT_CONTROLS, 'jump', 0, 'KeyW');
    expect(conflicts(clashing)).toEqual(new Set(['KeyW']));
    expect(actionsOf(clashing, 'KeyW')).toEqual(['forward', 'jump']);
    expect(clashing.keys.forward[0]).toBe('KeyW');
  });

  it('keeps one copy when a key goes in both slots of an action', () => {
    const twice = bindKey(DEFAULT_CONTROLS, 'dash', 1, 'ShiftLeft');
    expect(twice.keys.dash).toEqual(['', 'ShiftLeft']);
  });

  it('knows which actions are held', () => {
    const held = new Set(['ArrowUp']);
    expect(isHeld(DEFAULT_CONTROLS, 'forward', held)).toBe(true);
    expect(isHeld(DEFAULT_CONTROLS, 'jump', held)).toBe(false);
  });

  it('names keys', () => {
    expect(fallbackKeyName('KeyW')).toBe('W');
    expect(fallbackKeyName('Digit2')).toBe('2');
    expect(fallbackKeyName('ShiftLeft')).toBe('Shift');
    expect(fallbackKeyName('ArrowLeft')).toBe('←');
  });

  it('turns the keys by the camera', () => {
    const near = (a: { moveX: number; moveZ: number }, x: number, z: number) => {
      expect(a.moveX).toBeCloseTo(x, 5);
      expect(a.moveZ).toBeCloseTo(z, 5);
    };
    // Camera behind on +z: forward is -z, right is +x.
    near(worldMove(0, 1, 0), 0, -1);
    near(worldMove(1, 0, 0), 1, 0);
    // A quarter turn to the right: forward is now +x.
    near(worldMove(0, 1, -Math.PI / 2), 1, 0);
    near(worldMove(0, 0, 1), 0, 0);
    const diagonal = worldMove(1, 1, 0);
    expect(Math.hypot(diagonal.moveX, diagonal.moveZ)).toBeCloseTo(1, 5);
  });

  it('rounds the direction to a fixed set, so a replay sends the same commands', () => {
    const a = worldMove(0.3, 0.8, 1.23456);
    const b = worldMove(0.3, 0.8, 1.23457);
    expect(a).toEqual(b);
  });
});
