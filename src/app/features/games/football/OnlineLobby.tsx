import React, { useEffect, useState } from 'react';
import { tr } from '../../translation/tr';
import { gameButton } from '../ui/gameUi.css';
import { teamById } from './engine/teams';
import { Shirt } from './MatchHud';
import { FootballApi, Room } from './online/api';
import * as css from './football.css';

// The online part of the menu: create a match with the team picked above, or join one that
// waits for a player, or watch one being played. The list refreshes every few seconds.

const REFRESH_MS = 4000;

export function OnlineLobby({
  api,
  userId,
  team,
  halfMinutes,
  nameOf,
  onOpen,
}: {
  api: FootballApi;
  userId: string;
  team: string;
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
      .create(team, halfMinutes)
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
            'You play with the team chosen above; send the link to a friend.'
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
          const [a, b] = r.seats;
          const mine = r.seats.some((s) => s?.userId === userId);
          return (
            <div key={r.id} className={css.MatchRow}>
              {a && <Shirt team={teamById(a.team)} />}
              <span className={css.MatchRowText}>
                {r.state === 'waiting'
                  ? tr(
                      'football.online.row_waiting',
                      '{{name}} ({{team}}) is waiting for a player',
                      {
                        name: nameOf(a?.userId ?? ''),
                        team: a ? teamById(a.team).name : '',
                      }
                    )
                  : tr(
                      'football.online.row_playing',
                      '{{a}} {{sa}} × {{sb}} {{b}} · {{minute}}′ · {{n}} watching',
                      {
                        a: a ? teamById(a.team).short : '',
                        b: b ? teamById(b.team).short : '',
                        sa: r.score[0],
                        sb: r.score[1],
                        minute: r.minute,
                        n: r.watchers.length,
                      }
                    )}
              </span>
              {b && <Shirt team={teamById(b.team)} />}
              {mine && (
                <button
                  type="button"
                  className={gameButton({ size: 'sm', variant: 'primary' })}
                  onClick={() => onOpen(r.id, 'play')}
                >
                  {tr('football.online.back_to', 'Go back')}
                </button>
              )}
              {!mine && r.state === 'waiting' && !b && (
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
