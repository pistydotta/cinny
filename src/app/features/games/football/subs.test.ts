import { describe, expect, it } from 'vitest';
import { MAX_SUBS } from './engine/data';
import { createMatch, step } from './engine/match';
import { packInput, unpackInput, sameInput } from './engine/net';
import { SUB_CANCEL, subCode } from './engine/scenes';
import { NO_INPUT } from './engine/types';
import { squadOf } from './subs';

const match = () =>
  createMatch({
    seed: 5,
    teams: ['flamengo', 'palmeiras'],
    slots: [0, 1],
    halfMinutes: 4,
    difficulty: 'normal',
  });

const index = (m: ReturnType<typeof match>, side: 0 | 1, num: number) =>
  m.players.findIndex((p) => p.side === side && p.num === num);

describe('football substitutions chosen by people', () => {
  it('packs a substitution into an input and back', () => {
    const input = { ...NO_INPUT, pass: true, sub: subCode(7, 30) };
    const back = unpackInput(packInput(input));
    expect(back).toEqual(input);
    expect(unpackInput(packInput(NO_INPUT))).toEqual(NO_INPUT);
    expect(sameInput(back, { ...input, sub: undefined })).toBe(false);
  });

  it('takes a change from a person only for their own side, once', () => {
    const m = match();
    const out = index(m, 0, 7);
    const on = index(m, 0, 14);
    const theirs = index(m, 1, 7);
    const code = subCode(out, on);
    // Side 1's person can't change side 0's players, nor side 0's person side 1's.
    step(m, [NO_INPUT, { ...NO_INPUT, sub: code }]);
    step(m, [{ ...NO_INPUT, sub: subCode(theirs, index(m, 1, 14)) }, NO_INPUT]);
    expect(m.subQueue).toEqual([]);
    for (let k = 0; k < 5; k += 1) step(m, [{ ...NO_INPUT, sub: code }, NO_INPUT]);
    expect(m.subs.length + m.subQueue.length + (m.scene?.kind === 'sub' ? 1 : 0)).toBe(1);
    // The input's sub isn't kept from tick to tick.
    expect(m.people[0].prev.sub).toBeUndefined();
  });

  it('calls off a waiting change', () => {
    const m = match();
    m.phase = 'play';
    m.restart = undefined;
    const out = index(m, 1, 9);
    const on = index(m, 1, 16);
    step(m, [NO_INPUT, { ...NO_INPUT, sub: subCode(out, on) }]);
    expect(m.subQueue).toEqual([{ side: 1, out, on }]);
    step(m, [NO_INPUT, { ...NO_INPUT, sub: subCode(out, SUB_CANCEL) }]);
    expect(m.subQueue).toEqual([]);
  });

  it('the CPU coach leaves a side people play alone', () => {
    const m = createMatch({
      seed: 4,
      teams: ['flamengo', 'palmeiras'],
      slots: [0],
      halfMinutes: 2,
      difficulty: 'normal',
    });
    while (m.phase !== 'over') step(m, [NO_INPUT]);
    expect(m.subs.filter((s) => s.side === 0)).toEqual([]);
    expect(m.subs.filter((s) => s.side === 1).length).toBeGreaterThan(0);
  });

  it('shows the squad, the changes waiting and how many are left', () => {
    const m = match();
    const out = index(m, 0, 7);
    const on = index(m, 0, 14);
    const view = squadOf(m, 0, [{ side: 0, out, on }]);
    expect(view.onPitch).toHaveLength(11);
    expect(view.onPitch[0].role).toBe('gk');
    expect(view.bench.map((p) => p.num)).toContain(14);
    expect(view.waiting).toEqual([
      { out: expect.objectContaining({ num: 7 }), on: expect.objectContaining({ num: 14 }) },
    ]);
    expect(view.left).toBe(MAX_SUBS - 1);
    // Asked here and already in the match count once.
    m.subQueue.push({ side: 0, out, on });
    expect(squadOf(m, 0, [{ side: 0, out, on }]).waiting).toHaveLength(1);
  });
});
