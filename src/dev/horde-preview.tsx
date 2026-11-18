import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/variable.css';
import { HordeRun } from '../app/features/games/horde/HordeGame';
import { createRun } from '../app/features/games/horde/engine/run';
import { playFighter } from '../app/features/games/horde/engine/fighter';
import { newMeta } from '../app/features/games/horde/engine/meta';
import { DEFAULT_CONTROLS } from '../app/features/games/horde/controls';
import { PickupKind } from '../app/features/games/horde/engine/types';
import { xpToNext } from '../app/features/games/horde/engine/data';

// Local look at a run in play (`/src/dev/horde-preview.html` under `npx vite`), with no login or API: a fighter bot plays to `?t=` seconds,
// then one of every drop is laid around the hero.
const params = new URLSearchParams(window.location.search);
const run = createRun(Number(params.get('seed') ?? 7), (params.get('hero') ?? 'eneas') as never);
playFighter(run, Number(params.get('t') ?? 150));
run.phase = 'playing';
if (params.has('clean')) run.enemies.length = 0;
// `?items` gives a few Muambas; `?camelo` opens the Camelô's offer at once.
if (params.has('items')) {
  run.items = { whey: 2, coffee: 1, backpack: 1, kite: 1, jeitinho: 1, pepper: 1, cachaca: 3 };
}
if (params.has('camelo')) run.pendingItems = 1;
// `?shrines` puts one shrine of each kind in a ring in front of the hero.
if (params.has('shrines')) {
  const kinds = ['blessing', 'curse', 'gold', 'heal', 'challenge', 'camelo', 'agiota', 'treta'];
  run.shrines = kinds.map((kind, i) => {
    const a = Math.PI + ((i - 3.5) / 8) * 2.4;
    return {
      id: i,
      x: run.player.x + Math.sin(a) * 13,
      z: run.player.z + Math.cos(a) * 13,
      charge: 0,
      used: false,
      kind: kind as never,
    };
  });
}
// `?levelup` opens a level-up offer as soon as the run starts.
if (params.has('levelup'))
  run.pickups.push({
    id: 89999,
    kind: 'xp',
    x: run.player.x,
    z: run.player.z,
    value: xpToNext(run.player.level),
    pulled: false,
  });
const ring: [PickupKind, number][] = [
  ['xp', 1],
  ['xp', 4],
  ['xp', 30],
  ['gold', 1],
  ['heart', 1],
  ['chest', 1],
  ['magnet', 1],
  ['bomb', 1],
  ['rage', 1],
  ['freeze', 1],
  ['star', 1],
  ['goldrain', 1],
];
// In two rows in front of the camera, or around the hero.
ring.forEach(([kind, value], i) => {
  const a = (i / ring.length) * Math.PI * 2;
  const row = i < 6 ? 0 : 1;
  run.pickups.push({
    id: 90000 + i,
    kind,
    x: params.has('row') ? run.player.x + ((i % 6) - 2.5) * 1.9 : run.player.x + Math.cos(a) * 5.5,
    z: params.has('row') ? run.player.z - 4.5 - row * 2.4 : run.player.z + Math.sin(a) * 5.5,
    value,
    pulled: false,
  });
});
if (!params.has('row'))
  for (let i = 0; i < 24; i += 1) {
    run.pickups.push({
      id: 91000 + i,
      kind: i % 5 === 0 ? 'gold' : 'xp',
      x: run.player.x - 3 + (i % 6) * 0.9,
      z: run.player.z - 8 - Math.floor(i / 6) * 0.9,
      value: i % 3 === 0 ? 8 : 1,
      pulled: false,
    });
  }
const noop = () => undefined;
// The hero doesn't die while the page is looked at.
setInterval(() => {
  run.player.hp = Math.max(run.player.hp, run.player.maxHp * 0.72);
}, 50);
createRoot(document.getElementById('root') as HTMLElement).render(
  <div style={{ position: 'fixed', inset: 0 }}>
    <HordeRun
      setup={{
        seed: 7,
        character: run.character,
        upgrades: run.meta,
        tier: 0,
        locked: [],
        mastery: 0,
        before: newMeta(),
        resume: run,
        attempt: 1,
      }}
      rank={undefined}
      controls={{
        ...DEFAULT_CONTROLS,
        quality: 'high',
        distance: Number(params.get('dist') ?? DEFAULT_CONTROLS.distance),
      }}
      onControls={noop}
      onEnd={noop}
      onAgain={noop}
      onExit={noop}
      onSave={noop}
      onForget={noop}
      onRecover={noop}
      inCall={false}
    />
  </div>
);
