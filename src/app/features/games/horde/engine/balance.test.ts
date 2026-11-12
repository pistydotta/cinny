import { describe, expect, it } from 'vitest';
import { RunRow, summarize } from './balance';
import { pickChoice } from './fighter';
import { createRun } from './run';

describe('horde balance tools', () => {
  it('the fighter heals when hurt, and otherwise takes weapons over gold', () => {
    const run = createRun(1, 'lula');
    run.phase = 'choosing';
    run.choices = [{ kind: 'gold' }, { kind: 'weapon', id: 'card', level: 2 }, { kind: 'heal' }];
    expect(pickChoice(run)).toBe(1);
    run.player.hp = 10;
    expect(pickChoice(run)).toBe(2);
    expect(pickChoice(run, (c) => c.kind === 'gold')).toBe(0);
  });

  it('never picks the difficulty Boleto when something else is offered', () => {
    const run = createRun(1, 'lula');
    run.choices = [
      { kind: 'passive', id: 'curse', level: 1 },
      { kind: 'passive', id: 'luck', level: 1 },
    ];
    expect(pickChoice(run)).toBe(1);
  });

  it('sums up runs: time, wins, deaths per minute and damage shares', () => {
    const row = (time: number, won: boolean, card: number, bolt: number): RunRow => ({
      ...{ hero: 'lula', seed: 1, time, won, level: 5, kills: 10, gold: 1 },
      damageBy: { card, bolt },
    });
    const s = summarize([row(130, false, 30, 10), row(650, true, 50, 10)]);
    expect(s.avgTime).toBe(390);
    expect(s.winRate).toBe(0.5);
    expect(s.deathsByMinute[2]).toBe(1);
    expect(s.deathsByMinute.reduce((a, b) => a + b, 0)).toBe(1);
    expect(s.damageShare.card).toBeCloseTo(0.8);
  });
});
