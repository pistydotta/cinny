import { describe, expect, it } from 'vitest';
import { advance, newGame } from './engine/progress';
import { serialize } from './engine/save';
import { SaveEnvelope, parseEnvelope, parseLocal, pickSave } from './cloudSync';

const game = (playedMs: number) => {
  const s = newGame('Hero', 'monk', 1, 1000);
  advance(s, playedMs);
  return serialize(s);
};

const env = (over: Partial<SaveEnvelope>): SaveEnvelope => ({
  save: game(0),
  gameId: 'g1',
  savedAt: 100,
  writer: 'a',
  ...over,
});

describe('parse', () => {
  it('reads an envelope and rejects anything else', () => {
    expect(parseEnvelope(env({}))).toBeDefined();
    expect(parseEnvelope({ save: 1 })).toBeUndefined();
    expect(parseEnvelope(undefined)).toBeUndefined();
  });

  it('still reads a browser save from before the cloud', () => {
    const local = parseLocal(game(0));
    expect(local?.gameId).toBe('local');
    expect(local?.savedAt).toBe(1000);
    expect(parseLocal('junk')).toBeUndefined();
    expect(parseLocal(null)).toBeUndefined();
  });
});

describe('pickSave', () => {
  it('takes whichever exists', () => {
    expect(pickSave(undefined, env({}))).toBe('remote');
    expect(pickSave(env({}), undefined)).toBe('local');
    expect(pickSave(undefined, undefined)).toBe('same');
  });

  it('takes the newest copy of the same hero', () => {
    expect(pickSave(env({ savedAt: 1 }), env({ savedAt: 2 }))).toBe('remote');
    expect(pickSave(env({ savedAt: 3 }), env({ savedAt: 2 }))).toBe('local');
    expect(pickSave(env({}), env({}))).toBe('same');
  });

  it('follows a deletion of the same hero only', () => {
    expect(pickSave(env({ savedAt: 1 }), env({ save: null, savedAt: 2 }))).toBe('remote');
    expect(pickSave(env({ gameId: 'g2', savedAt: 1 }), env({ save: null, savedAt: 2 }))).toBe(
      'local'
    );
  });

  it('keeps the hero played longest when two different ones meet', () => {
    const veteran = env({ gameId: 'home', save: game(60000), savedAt: 1 });
    const rookie = env({ gameId: 'work', save: game(1000), savedAt: 9 });
    expect(pickSave(rookie, veteran)).toBe('remote');
    expect(pickSave(veteran, rookie)).toBe('local');
  });
});
