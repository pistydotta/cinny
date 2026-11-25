import React, { useEffect, useState } from 'react';
import { tr } from '../../translation/tr';
import { gameButton } from '../ui/gameUi.css';
import { teamById } from './engine/teams';
import { Shirt } from './MatchHud';
import { FootballApi, Room } from './online/api';
import * as css from './football.css';

// The online part of the menu: create a match with the teams picked above, or join one that
// waits for a player, or watch one being played. The list refreshes every few seconds.

const REFRESH_MS = 4000;

export function OnlineLobby({
  api,
  userId,
  home,
  away,
  perSide,
  halfMinutes,
  nameOf,
  onOpen,
}: {
  api: FootballApi;
  userId: string;
  home: string;
  away: string;
  perSide: number;
  halfMinutes: number;
  nameOf: (userId: string) => string;
  onOpen: (id: string, role: 'play' | 'watch') => void;
}) {
  const [rooms, setRooms] = useState<Room[]>();
  const [failed, setFailed] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let stop = false;
    const load = () =>
      api
        .list()
        .then((list) => {
          if (stop) return;
          setRooms(list);
          setFailed(false);
        })
        .catch(() => !stop && setFailed(true));
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [api]);

  const create = () => {
    setCreating(true);
    api
      .create({ home, away, halfMinutes, perSide })
      .then((room) => onOpen(room.id, 'play'))
      .catch(() => setFailed(true))
      .finally(() => setCreating(false));
  };

  const open = (rooms ?? []).filter((r) => r.state === 'waiting' || r.state === 'playing');

  return (
    <div className={css.Picker}>
      <span className={css.Label}>{tr('football.online.matches', 'Online matches')}</span>
      <div className={css.Row}>
        <button
          type="button"
          className={gameButton({ variant: 'primary', size: 'lg' })}
          onClick={create}
          disabled={creating}
        >
          {tr('football.online.create', 'Create a match')}
        </button>
        <span className={css.Note}>
          {tr(
            'football.online.create_help',
            'With the teams and sizes chosen above; then send the link to your friends.'
          )}
        </span>
      </div>
      {failed && (
        <p className={css.Note}>
          {tr('football.online.offline', 'The server didn’t answer. Trying again…')}
        </p>
      )}
      <div className={css.MatchList}>
        {rooms && open.length === 0 && (
          <p className={css.Note}>
            {tr('football.online.none', 'No matches right now. Create one!')}
          </p>
        )}
        {open.map((r) => {
          const rowHome = teamById(r.teams[0]);
          const rowAway = teamById(r.teams[1]);
          const mine = r.sides.some((list) => list.some((s) => s.userId === userId));
          const seated = r.sides[0].length + r.sides[1].length;
          const free = r.sides.some((list) => list.length < r.perSide);
          return (
            <div key={r.id} className={css.MatchRow}>
              <Shirt team={rowHome} />
              <span className={css.MatchRowText}>
                {r.state === 'waiting'
                  ? tr(
                      'football.online.row_waiting',
                      '{{home}} × {{away}} · {{name}}’s match · {{n}} of {{max}} players',
                      {
                        home: rowHome.short,
                        away: rowAway.short,
                        name: nameOf(r.host),
                        n: seated,
                        max: r.perSide * 2,
                      }
                    )
                  : tr(
                      'football.online.row_playing',
                      '{{a}} {{sa}} × {{sb}} {{b}} · {{minute}}′ · {{n}} watching',
                      {
                        a: rowHome.short,
                        b: rowAway.short,
                        sa: r.score[0],
                        sb: r.score[1],
                        minute: r.minute,
                        n: r.watchers.length,
                      }
                    )}
              </span>
              <Shirt team={rowAway} />
              {mine && (
                <button
                  type="button"
                  className={gameButton({ size: 'sm', variant: 'primary' })}
                  onClick={() => onOpen(r.id, 'play')}
                >
                  {tr('football.online.back_to', 'Go back')}
                </button>
              )}
              {!mine && r.state === 'waiting' && free && (
                <button
                  type="button"
                  className={gameButton({ size: 'sm', variant: 'primary' })}
                  onClick={() => onOpen(r.id, 'play')}
                >
                  {tr('football.online.play', 'Play')}
                </button>
              )}
              {!mine && (
                <button
                  type="button"
                  className={gameButton({ size: 'sm', variant: 'secondary' })}
                  onClick={() => onOpen(r.id, 'watch')}
                >
                  {tr('football.online.watch_short', 'Watch')}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
