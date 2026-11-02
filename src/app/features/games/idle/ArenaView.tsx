import React, { useMemo, useState } from 'react';
import {
  DuelResult,
  HeroSnapshot,
  ratingChange,
  rivalsFor,
  snapshotPower,
  toSnapshot,
} from './engine/arena';
import { getClass } from './engine/classes';
import { GameState } from './engine/types';
import { formatBig } from './format';
import { className } from './labels';
import * as css from './idle.css';
import { tr } from '../../translation/tr';

type ArenaViewProps = {
  state: GameState;
  userId: string;
  onFight: (rival: HeroSnapshot) => DuelResult | undefined;
};

type LastFight = { rival: HeroSnapshot; result: DuelResult; change: number };

export function ArenaView({ state, userId, onFight }: ArenaViewProps) {
  const [last, setLast] = useState<LastFight>();
  const day = new Date().toISOString().slice(0, 10);
  const played = state.arena.wins + state.arena.losses;
  // Rivals change after every fight and every day, not with every tick of the game.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rivals = useMemo(() => rivalsFor(state, userId, day), [userId, day, played]);
  const myPower = snapshotPower(toSnapshot(state, userId));

  const fight = (rival: HeroSnapshot) => {
    const before = state.arena.rating;
    const result = onFight(rival);
    if (result) {
      setLast({ rival, result, change: ratingChange(before, rival.rating, result.winner === 'a') });
    }
  };

  return (
    <div className={css.Columns}>
      <div className={css.Panel}>
        <h2 className={css.PanelTitle}>⚔️ {tr('games.idle.arena', 'Arena')}</h2>
        <span className={css.Muted}>
          {tr(
            'games.idle.arena_hint',
            'Duel other heroes. For now they are rivals made to match you; soon it will be your friends’ heroes.'
          )}
        </span>
        <div className={css.Row}>
          <span className={css.Pill}>
            🏆 {tr('games.idle.rating', 'Rating {{rating}}', { rating: state.arena.rating })}
          </span>
          <span className={css.Pill}>
            {tr('games.idle.record', '{{wins}}W · {{losses}}L', {
              wins: state.arena.wins,
              losses: state.arena.losses,
            })}
          </span>
          <span className={css.Pill}>
            {tr('games.idle.power', 'Power {{power}}', { power: formatBig(myPower) })}
          </span>
        </div>
        <div className={css.List}>
          {rivals.map((r) => {
            const cls = getClass(r.classId);
            return (
              <div key={r.id} className={css.ListItem}>
                <span className={css.ListIcon} style={{ background: `${cls.color}33` }}>
                  {cls.icon}
                </span>
                <div className={css.Grow}>
                  <div className={css.Strong}>{r.name}</div>
                  <div className={css.Muted}>
                    {className(r.classId)} ·{' '}
                    {tr('games.idle.lv', 'Lv {{level}}', { level: r.level })}
                    {' · '}
                    {tr('games.idle.power', 'Power {{power}}', {
                      power: formatBig(snapshotPower(r)),
                    })}
                    {' · '}🏆 {r.rating}
                  </div>
                </div>
                <button type="button" className={css.Button} onClick={() => fight(r)}>
                  {tr('games.idle.duel', 'Duel')}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className={css.Panel}>
        <h2 className={css.PanelTitle}>{tr('games.idle.last_duel', 'Last duel')}</h2>
        {last ? (
          <div
            className={css.ItemBox}
            style={{ borderColor: last.result.winner === 'a' ? '#4cd964' : '#ff5a4f' }}
          >
            <span className={css.ItemName}>
              {last.result.winner === 'a'
                ? tr('games.idle.duel_won', 'Victory against {{name}}!', { name: last.rival.name })
                : tr('games.idle.duel_lost', 'Defeated by {{name}}.', { name: last.rival.name })}
            </span>
            <span className={css.Muted}>
              {tr(
                'games.idle.duel_summary',
                '{{sec}}s · your life {{mine}}% · theirs {{theirs}}%',
                {
                  sec: Math.round(last.result.durationMs / 1000),
                  mine: Math.round(last.result.hpLeft.a * 100),
                  theirs: Math.round(last.result.hpLeft.b * 100),
                }
              )}
            </span>
            <span
              className={css.Strong}
              style={{ color: last.change >= 0 ? '#8be28f' : '#ff8a80' }}
            >
              🏆 {last.change >= 0 ? '+' : ''}
              {last.change}
            </span>
          </div>
        ) : (
          <span className={css.Muted}>
            {tr(
              'games.idle.no_duel',
              'Pick a rival. The duel is decided by your stats and some luck.'
            )}
          </span>
        )}
      </div>
    </div>
  );
}
