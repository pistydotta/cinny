import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { tr } from '../../translation/tr';
import { getGamesFootballMatchPath } from '../../../pages/pathUtils';
import { GameDialog } from '../ui/GameDialog';
import { GameTopBar } from '../ui/GameTopBar';
import { LobbyScope, StageScope } from '../ui/gameTheme.css';
import { gameButton } from '../ui/gameUi.css';
import { createMatch } from './engine/match';
import { Team, matchKits, teamById } from './engine/teams';
import { Side } from './engine/types';
import { KeySets } from './controls';
import { Graphics } from './options';
import { FinalScore, MatchHud, Shirt } from './MatchHud';
import { TeamPicker } from './TeamPicker';
import { MatchSource, netSource, watchSource } from './source';
import { useMatchCanvas } from './useMatchCanvas';
import { Netplay } from './online/netplay';
import { SpectatorFeed } from './online/spectate';
import { CHEERS, FootballApi, Room, ServerMessage } from './online/api';
import { FootballSocket, SocketStatus } from './online/socket';
import * as css from './football.css';

// One online match, from its link: the waiting room, where people pick a side (up to four a
// side) and the host kicks off, then the match, played (each person one player, with rollback,
// online/netplay.ts) or watched from the stands (any number of people, online/spectate.ts).
// Everyone can send cheers; the stands list who is watching.

type Role = 'play' | 'watch';

type Over = { state: 'over' | 'abandoned' | 'cancelled'; score: [number, number] };

type Cheer = { id: number; userId: string; e: number };

const CHEER_SHOW_MS = 2600;
const STANDS_SHOWN = 8;

const errorText = (code: string): string => {
  if (code === 'not_found')
    return tr('football.online.not_found', 'This match is over or never existed.');
  if (code === 'full') return tr('football.online.full', 'The stands are full.');
  if (code === 'replaced')
    return tr('football.online.replaced', 'You opened this match somewhere else.');
  if (code === 'unauthorized')
    return tr('football.online.unauthorized', 'Your session expired: reload the page.');
  return tr('football.online.error', 'Something went wrong. Try again.');
};

export function OnlineMatch({
  matchId,
  wanted,
  userId,
  getToken,
  nameOf,
  api,
  keys,
  graphics,
  inCall,
  optionsOpen,
  onOptions,
  onLeave,
}: {
  matchId: string;
  // How the person came: from the lobby's Play or Watch, or a link (undefined: we ask).
  wanted: Role | undefined;
  userId: string;
  getToken: () => string | null;
  nameOf: (userId: string) => string;
  api: FootballApi;
  keys: KeySets;
  graphics: Graphics;
  inCall: boolean;
  optionsOpen: boolean;
  onOptions: () => void;
  onLeave: () => void;
}) {
  const [role, setRole] = useState<Role | undefined>(wanted);
  const [room, setRoom] = useState<Room>();
  const [status, setStatus] = useState<SocketStatus>('connecting');
  const [error, setError] = useState<string>();
  const [slot, setSlot] = useState<number>();
  const [slots, setSlots] = useState<Side[]>([]);
  const [teams, setTeams] = useState<[string, string]>();
  const [source, setSource] = useState<MatchSource & { finish?: () => void }>();
  const [over, setOver] = useState<Over>();
  const [askedRematch, setAskedRematch] = useState(false);
  const [cheers, setCheers] = useState<Cheer[]>([]);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState<0 | 1>();
  const socketRef = useRef<FootballSocket>();
  const netRef = useRef<Netplay>();
  const feedRef = useRef<SpectatorFeed>();
  const sourceRef = useRef<typeof source>();
  sourceRef.current = source;
  const cheerId = useRef(0);

  // A link with no role: play while a seat is free before kick-off, otherwise watch.
  useEffect(() => {
    if (role) return;
    api
      .get(matchId)
      .then((r) => {
        setRoom(r);
        const seated = r.sides.some((list) => list.some((s) => s.userId === userId));
        const free = r.sides.some((list) => list.length < r.perSide);
        if (seated) setRole('play');
        else if (r.state !== 'waiting' || !free) setRole('watch');
      })
      .catch(() => setError('not_found'));
  }, [api, matchId, role, userId]);

  const onMessage = useCallback((msg: ServerMessage) => {
    const socket = socketRef.current;
    const out = {
      sendInput: (t: number, i: [number, number, number]) => socket?.send({ type: 'input', t, i }),
      sendHash: (t: number, h: number) => socket?.send({ type: 'hash', t, h }),
    };
    const play = (net: Netplay) => {
      netRef.current = net;
      feedRef.current = undefined;
      setSlot(net.slot);
      setSlots(net.match.setup.slots);
      setTeams(net.match.setup.teams);
      setSource(netSource(net, () => socket?.lagTicks() ?? 3));
    };
    switch (msg.type) {
      case 'room':
        setRoom(msg.room);
        return;
      case 'start':
        setOver(undefined);
        setAskedRematch(false);
        play(new Netplay(msg.slot, createMatch(msg.setup), out));
        return;
      case 'resume': {
        const net = netRef.current;
        if (net && net.slot === msg.slot) net.reset(msg.state, msg.pending);
        else play(new Netplay(msg.slot, msg.state, out, msg.pending));
        return;
      }
      case 'watch': {
        const feed = feedRef.current;
        if (feed) feed.reset(msg.state);
        else {
          const fresh = new SpectatorFeed(msg.state);
          feedRef.current = fresh;
          setSlots(msg.state.setup.slots);
          setTeams(msg.state.setup.teams);
          setSource(watchSource(fresh));
        }
        if (msg.state.phase !== 'over') setOver(undefined);
        return;
      }
      case 'frames':
        feedRef.current?.push(msg.from, msg.frames);
        return;
      case 'input':
        netRef.current?.remoteInput(msg.s, msg.t, msg.i);
        return;
      case 'over':
        sourceRef.current?.finish?.();
        setOver({ state: msg.state, score: msg.score });
        return;
      case 'cheer': {
        cheerId.current += 1;
        const cheer = { id: cheerId.current, userId: msg.userId, e: msg.e };
        setCheers((list) => [...list.slice(-11), cheer]);
        setTimeout(() => setCheers((list) => list.filter((c) => c.id !== cheer.id)), CHEER_SHOW_MS);
        return;
      }
      case 'replaced':
        setError('replaced');
        return;
      case 'error':
        setError(msg.code);
        break;
      default:
    }
  }, []);

  useEffect(() => {
    if (!role) return undefined;
    const socket = new FootballSocket(
      () => ({ token: getToken() ?? '', match: matchId, role }),
      onMessage,
      setStatus
    );
    socketRef.current = socket;
    return () => {
      socket.close();
      socketRef.current = undefined;
    };
  }, [role, matchId, getToken, onMessage]);

  const teamIds = teams ?? room?.teams;
  const teamPair = useMemo(
    (): [Team, Team] =>
      teamIds ? [teamById(teamIds[0]), teamById(teamIds[1])] : [teamById(''), teamById('')],
    [teamIds]
  );
  const kits = useMemo(() => matchKits(teamPair[0], teamPair[1]), [teamPair]);
  const playing = slot !== undefined;
  // The people in slot order, as the API made them at kick-off: side 0's seats, then side 1's.
  const seatedOrder = room ? [...room.sides[0], ...room.sides[1]] : [];
  const labels =
    slots.length > 1 ? seatedOrder.map((s) => nameOf(s.userId)).slice(0, slots.length) : undefined;
  const view = useMatchCanvas({
    source,
    kits,
    devices: playing ? ['p1'] : [],
    mine: playing ? [slot] : [],
    labels,
    keys,
    graphics,
    inCall,
    freeze: false,
  });

  const link = `${window.location.origin}${getGamesFootballMatchPath(matchId)}`;
  const copyLink = () => {
    navigator.clipboard
      ?.writeText(link)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => undefined);
  };
  const send = (msg: object) => socketRef.current?.send(msg);
  const live = room?.state === 'playing' && !over;
  const back = () => {
    if (playing && live) setConfirmLeave(true);
    else onLeave();
  };
  const watchers = room?.watchers ?? [];
  const isHost = room?.host === userId;
  const mySide = room?.sides.findIndex((list) => list.some((s) => s.userId === userId));
  const sideNames = (side: 0 | 1) =>
    room?.sides[side].map((s) => nameOf(s.userId)).join(', ') || '—';

  if (error)
    return (
      <div className={`${css.Page} ${LobbyScope}`}>
        <GameTopBar title={tr('football.online.title', 'Online match')} onBack={onLeave} />
        <div className={css.Menu}>
          <p className={css.Loading}>{errorText(error)}</p>
          <div className={css.Row}>
            <button type="button" className={gameButton({ variant: 'primary' })} onClick={onLeave}>
              {tr('football.back_menu', 'Back to the menu')}
            </button>
          </div>
        </div>
      </div>
    );

  // Came by link to a match with a free seat: play or watch.
  if (!role)
    return (
      <div className={`${css.Page} ${LobbyScope}`}>
        <GameTopBar title={tr('football.online.title', 'Online match')} onBack={onLeave} />
        <div className={css.Menu}>
          {room ? (
            <>
              <div className={css.Chosen}>
                <Shirt team={teamPair[0]} big />
                <span>
                  {teamPair[0].name} × {teamPair[1].name}
                </span>
                <Shirt team={teamPair[1]} big />
              </div>
              <p className={css.Note}>
                {tr('football.online.invited', '{{name}} invites you: up to {{n}} a side.', {
                  name: nameOf(room.host),
                  n: room.perSide,
                })}
              </p>
              <div className={css.Row}>
                <button
                  type="button"
                  className={gameButton({ variant: 'primary', size: 'lg' })}
                  onClick={() => setRole('play')}
                >
                  {tr('football.online.play', 'Play')}
                </button>
                <button
                  type="button"
                  className={gameButton({ variant: 'secondary', size: 'lg' })}
                  onClick={() => setRole('watch')}
                >
                  {tr('football.online.watch', 'Watch from the stands')}
                </button>
              </div>
            </>
          ) : (
            <p className={css.Loading}>{tr('football.online.connecting', 'Connecting…')}</p>
          )}
        </div>
      </div>
    );

  // The waiting room: two sides, their seats, the host's kick-off.
  if (!source && (!room || room.state === 'waiting')) {
    const ready = !!room && room.sides.every((list) => list.some((s) => s.connected));
    return (
      <div className={`${css.Page} ${LobbyScope}`}>
        <GameTopBar
          title={tr('football.online.waiting_room', 'Waiting room')}
          subtitle={
            room
              ? tr('football.online.room_info', 'Up to {{n}} a side · {{m}} min halves', {
                  n: room.perSide,
                  m: room.halfMinutes,
                })
              : undefined
          }
          onBack={onLeave}
        />
        <div className={css.Menu}>
          <div className={css.Pickers}>
            {([0, 1] as const).map((side) => {
              const team = teamPair[side];
              const list = room?.sides[side] ?? [];
              const free = room ? room.perSide - list.length : 0;
              return (
                <div key={side} className={css.Picker}>
                  <div className={css.Chosen}>
                    <Shirt team={team} big />
                    <span>{team.name}</span>
                  </div>
                  {list.map((s) => (
                    <span key={s.userId} className={css.SeatName}>
                      {nameOf(s.userId)}
                      {s.userId === room?.host && ` · ${tr('football.online.host', 'host')}`}
                      {s.userId === userId && ` · ${tr('football.online.you', 'you')}`}
                      {!s.connected && ` · ${tr('football.online.away_short', 'away')}`}
                    </span>
                  ))}
                  {Array.from({ length: free }, (_, k) => (
                    <span key={`free${k}`} className={css.Note}>
                      {tr('football.online.free_seat', 'Free seat')}
                    </span>
                  ))}
                  <div className={css.Row}>
                    {mySide !== side && free > 0 && (
                      <button
                        type="button"
                        className={gameButton({ size: 'sm', variant: 'primary' })}
                        onClick={() => send({ type: 'seat', side })}
                      >
                        {tr('football.online.take_side', 'Play on this side')}
                      </button>
                    )}
                    {isHost && (
                      <button
                        type="button"
                        className={gameButton({ size: 'sm', variant: 'ghost' })}
                        onClick={() => setEditing(editing === side ? undefined : side)}
                      >
                        {tr('football.online.change_team', 'Change team')}
                      </button>
                    )}
                  </div>
                  {isHost && editing === side && room && (
                    <TeamPicker
                      title={tr('football.online.team_for', 'Team')}
                      value={room.teams[side]}
                      onChange={(id) => {
                        const next: [string, string] = [...room.teams];
                        next[side] = id;
                        send({ type: 'teams', home: next[0], away: next[1] });
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className={css.Row}>
            {isHost ? (
              <button
                type="button"
                className={gameButton({ variant: 'primary', size: 'lg' })}
                disabled={!ready}
                onClick={() => send({ type: 'kickoff' })}
              >
                {tr('football.online.kickoff', 'Start the match')}
              </button>
            ) : (
              <span className={css.Note}>
                {tr('football.online.wait_host', 'Waiting for {{name}} to start the match…', {
                  name: room ? nameOf(room.host) : '',
                })}
              </span>
            )}
            <button
              type="button"
              className={gameButton({ variant: 'secondary' })}
              onClick={copyLink}
            >
              {copied
                ? tr('football.online.copied', 'Link copied')
                : tr('football.online.copy', 'Copy link')}
            </button>
            {isHost && (
              <button
                type="button"
                className={gameButton({ variant: 'ghost' })}
                onClick={() => {
                  api.cancel(matchId).catch(() => undefined);
                  onLeave();
                }}
              >
                {tr('football.online.cancel', 'Cancel the match')}
              </button>
            )}
          </div>
          {isHost && !ready && (
            <p className={css.Note}>
              {tr('football.online.need_both', 'Each side needs at least one person to start.')}
            </p>
          )}
          <p className={css.Note}>
            {tr(
              'football.online.share',
              'Send the link: whoever opens it can take a free seat or watch from the stands.'
            )}
          </p>
          {watchers.length > 0 && (
            <p className={css.Note}>
              {tr('football.online.in_stands', 'In the stands: {{names}}', {
                names: watchers.map(nameOf).join(', '),
              })}
            </p>
          )}
          {status === 'connecting' && (
            <p className={css.Note}>{tr('football.online.connecting', 'Connecting…')}</p>
          )}
        </div>
      </div>
    );
  }

  const menuOpen = playing && !!view.hud?.paused && !optionsOpen && !over;
  const away = room?.sides.flat().find((s) => !s.connected);

  return (
    <div className={`${css.Page} ${StageScope}`}>
      <GameTopBar
        title={`${sideNames(0)} × ${sideNames(1)}`}
        subtitle={
          playing
            ? tr('football.online.subtitle_play', 'Online · {{n}} in the stands', {
                n: watchers.length,
              })
            : tr('football.online.subtitle_watch', 'Watching · {{n}} in the stands', {
                n: watchers.length,
              })
        }
        onBack={back}
      >
        <button
          type="button"
          className={gameButton({ size: 'sm', variant: 'secondary' })}
          onClick={copyLink}
        >
          {copied
            ? tr('football.online.copied', 'Link copied')
            : tr('football.online.copy', 'Copy link')}
        </button>
        <button
          type="button"
          className={gameButton({ size: 'sm', variant: 'secondary' })}
          onClick={onOptions}
        >
          {tr('football.options_title', 'Options')}
        </button>
      </GameTopBar>
      <div className={css.Stage}>
        <canvas ref={view.canvasRef} className={css.Canvas} />
        <MatchHud
          hud={view.hud}
          loading={view.loading}
          failed={view.failed}
          teams={teamPair}
          kits={kits}
          waitingText={
            playing
              ? tr('football.online.waiting_player', 'Waiting for the other players…')
              : tr('football.online.buffering', 'Catching up…')
          }
        >
          {status === 'connecting' && (
            <span className={css.Hint}>{tr('football.online.reconnecting', 'Reconnecting…')}</span>
          )}
          {away && live && (
            <span className={css.Hint}>
              {tr(
                'football.online.away',
                '{{name}} lost the connection; their player stands still.',
                {
                  name: nameOf(away.userId),
                }
              )}
            </span>
          )}
          <div className={css.Stands}>
            <span className={css.Label}>
              {tr('football.online.stands', 'Stands ({{n}})', { n: watchers.length })}
            </span>
            {watchers.slice(0, STANDS_SHOWN).map((w) => (
              <span key={w}>{nameOf(w)}</span>
            ))}
            {watchers.length > STANDS_SHOWN && <span>+{watchers.length - STANDS_SHOWN}</span>}
          </div>
          <div className={css.Cheers} aria-live="polite">
            {cheers.map((c) => (
              <span key={c.id} className={css.CheerPop}>
                {CHEERS[c.e]} <small className={css.CheerName}>{nameOf(c.userId)}</small>
              </span>
            ))}
          </div>
        </MatchHud>
        <div className={css.CheerBar}>
          {CHEERS.map((e, i) => (
            <button
              key={e}
              type="button"
              className={gameButton({ size: 'sm', variant: 'ghost' })}
              onClick={() => send({ type: 'cheer', e: i })}
              aria-label={tr('football.online.cheer', 'Cheer {{e}}', { e })}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {(menuOpen || confirmLeave) && (
        <GameDialog
          title={
            confirmLeave
              ? tr('football.online.leave_title', 'Leave the match?')
              : tr('football.online.menu', 'Menu')
          }
          onClose={() => {
            setConfirmLeave(false);
            view.runnerRef.current?.setPaused(false);
          }}
          size="sm"
        >
          <div className={css.DialogBody}>
            <p className={css.Note}>
              {tr(
                'football.online.no_pause',
                'Online the match keeps going. If you leave, your player stands still until you come back.'
              )}
            </p>
            <button
              type="button"
              className={gameButton({ variant: 'primary' })}
              onClick={() => {
                setConfirmLeave(false);
                view.runnerRef.current?.setPaused(false);
              }}
            >
              {tr('football.resume', 'Resume')}
            </button>
            <button
              type="button"
              className={gameButton({ variant: 'secondary' })}
              onClick={onLeave}
            >
              {tr('football.quit', 'Leave the match')}
            </button>
          </div>
        </GameDialog>
      )}

      {over && (
        <GameDialog
          title={
            over.state === 'over'
              ? tr('football.full_time', 'Full time')
              : tr('football.online.ended', 'Match ended')
          }
          onClose={onLeave}
          size="sm"
        >
          <div className={css.DialogBody}>
            {over.state !== 'over' && (
              <p className={css.Note}>
                {over.state === 'abandoned'
                  ? tr('football.online.abandoned', 'A side left and didn’t come back.')
                  : tr('football.online.cancelled', 'The host cancelled the match.')}
              </p>
            )}
            {source && <FinalScore match={source.match} teams={teamPair} />}
            {playing && over.state === 'over' && (
              <button
                type="button"
                className={gameButton({ variant: 'primary' })}
                disabled={askedRematch}
                onClick={() => {
                  setAskedRematch(true);
                  send({ type: 'rematch' });
                }}
              >
                {askedRematch
                  ? tr('football.online.rematch_wait', 'Waiting for the others…')
                  : tr('football.rematch', 'Rematch')}
              </button>
            )}
            <button
              type="button"
              className={gameButton({ variant: 'secondary' })}
              onClick={onLeave}
            >
              {tr('football.back_menu', 'Back to the menu')}
            </button>
          </div>
        </GameDialog>
      )}
    </div>
  );
}
