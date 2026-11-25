import { describe, expect, it } from 'vitest';
import { DEFAULT_KEYS, bindKey, fromKeys, keyLabel, keysIn, parseKeys } from './controls';
import { DEFAULT_GRAPHICS, parseGraphics } from './options';

describe('football keys', () => {
  it('moves a key to its new action and keeps it out of the other player', () => {
    const k = bindKey(DEFAULT_KEYS, 'p1', 'pass', 0, 'Numpad1');
    expect(k.p1.pass).toEqual(['Numpad1']);
    expect(k.p2.pass).toEqual(['Comma']);
    const again = bindKey(k, 'p1', 'shoot', 1, 'KeyJ');
    expect(again.p1.shoot).toEqual(['KeyK', 'KeyJ']);
    expect(again.p1.pass).toEqual(['Numpad1']);
    // Playing alone has its own set: player 1's change leaves it alone.
    expect(again.alone.pass).toEqual(['KeyJ', 'Space']);
  });

  it('clears a slot', () => {
    const k = bindKey(DEFAULT_KEYS, 'alone', 'pass', 1, undefined);
    expect(k.alone.pass).toEqual(['KeyJ']);
  });

  it('reads saved keys and falls back on bad ones', () => {
    const saved = JSON.stringify({ alone: { pass: ['KeyZ', 'Escape', 'Bad Key!'] } });
    const k = parseKeys(saved);
    expect(k.alone.pass).toEqual(['KeyZ']);
    expect(k.alone.shoot).toEqual(['KeyK']);
    expect(parseKeys('nonsense')).toEqual(DEFAULT_KEYS);
  });

  it('plays with whatever keys are bound', () => {
    const k = bindKey(DEFAULT_KEYS, 'alone', 'shoot', 0, 'KeyQ');
    expect(fromKeys(new Set(['KeyQ', 'KeyD']), k.alone)).toMatchObject({ shoot: true, mx: 100 });
    expect(keysIn([k.alone]).has('KeyQ')).toBe(true);
  });

  it('names keys by what the keyboard prints', () => {
    expect(keyLabel('Semicolon', new Map([['Semicolon', 'ç']]))).toBe('Ç');
    expect(keyLabel('KeyJ')).toBe('J');
    expect(keyLabel('Numpad2')).toBe('Num 2');
    expect(keyLabel('ArrowUp')).toBe('↑');
  });

  it('reads saved graphics options', () => {
    expect(parseGraphics(JSON.stringify({ quality: 'low', camera: 'far' }))).toEqual({
      quality: 'low',
      camera: 'far',
    });
    expect(parseGraphics('{"quality":"ultra"}')).toEqual(DEFAULT_GRAPHICS);
  });
});
