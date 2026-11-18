import { describe, expect, it } from 'vitest';
import { playFighter } from './fighter';
import { createRun } from './run';

// Two minutes of one known run. When a change to the numbers moves this, the diff shows it:
// update the expected values on purpose, and say why in the PR (with the balance report).
describe('horde regression', () => {
  it('plays a known run the same way', () => {
    const run = playFighter(createRun(42, 'lula'), 120);
    expect({
      time: Math.round(run.time),
      phase: run.phase,
      kills: run.kills,
      level: run.player.level,
      hp: Math.round(run.player.hp),
      gold: Math.round(run.gold),
      weapons: run.weapons.map((w) => `${w.id}${w.level}`).join(','),
      boletos: run.passives.map((p) => `${p.id}${p.level}`).join(','),
    }).toMatchInlineSnapshot(`
      {
        "boletos": "",
        "gold": 38,
        "hp": 100,
        "kills": 275,
        "level": 4,
        "phase": "playing",
        "time": 120,
        "weapons": "card2,urns2",
      }
    `);
  });
});
