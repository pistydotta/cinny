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

// One online match, from its link: the waiting room until a second player sits down, then the
// match, played (with rollback, online/netplay.ts) or watched from the stands (any number of
// people, online/spectate.ts). Everyone can send cheers; the stands list who is watching.

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
  if (code === 'bad_team') return tr('football.online.bad_team', 'That team can’t play.');
  if (code === 'unauthorized')
    return tr('football.online.unauthorized', 'Your session expired: reload the page.');
  return tr('football.online.error', 'Something went wrong. Try again.');
};

export function OnlineMatch({
  matchId,
  wanted,
  myTeam,
  userId,
  getToken,
  nameOf,
  api,
  keys,
  graphics,
  inCall,
  optionsOpen,
  onOptions,
  onTeam,
  onLeave,
}: {
  matchId: string;
  // How the person came: from the lobby's Play or Watch, or a link (undefined: we ask).
  wanted: Role | undefined;
  myTeam: string;
  userId: string;
  getToken: () => string | null;
  nameOf: (userId: string) => string;
  api: FootballApi;
  keys: KeySets;
  graphics: Graphics;
  inCall: boolean;
  optionsOpen: boolean;
  onOptions: () => void;
  onTeam: (team: string) => void;
  onLeave: () => void;
}) {
  const [role, setRole] = useState<Role | undefined>(wanted);
  const [room, setRoom] = useState<Room>();
  const [status, setStatus] = useState<SocketStatus>('connecting');
  const [error, setError] = useState<string>();
  const [side, setSide] = useState<Side>();
  const [teams, setTeams] = useState<[string, string]>();
  const [source, setSource] = useState<MatchSource & { finish?: () => void }>();
  const [over, setOver] = useState<Over>();
  const [askedRematch, setAskedRematch] = useState(false);
  const [cheers, setCheers] = useState<Cheer[]>([]);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [copied, setCopied] = useState(false);
  const socketRef = useRef<FootballSocket>();
  const netRef = useRef<Netplay>();
  const feedRef = useRef<SpectatorFeed>();
  const sourceRef = useRef<typeof source>();
  sourceRef.current = source;
  const cheerId = useRef(0);

  // A link with no role: play if we hold a seat or one is free, otherwise watch.
  useEffect(() => {
    if (role) return;
    api
      .get(matchId)
      .then((r) => {
        setRoom(r);
        const seated = r.seats.some((s) => s?.userId === userId);
        if (seated) setRole('play');
        else if (r.state !== 'waiting' || r.seats[1]) setRole('watch');
      })
      .catch(() => setError('not_found'));
  }, [api, matchId, role, userId]);

  const onMessage = useCallback((msg: ServerMessage) => {
    const socket = socketRef.current;
    const out = {
      sendInput: (t: number, i: [number, number, number]) => socket?.send({ type: 'input', t, i }),
      sendHash: (t: number, h: number) => socket?.send({ type: 'hash', t, h }),
    };
    switch (msg.type) {
      case 'room':
        setRoom(msg.room);
        return;
      case 'start': {
        const net = new Netplay(msg.side, createMatch(msg.setup), out);
        netRef.current = net;
        feedRef.current = undefined;
        setSide(msg.side);
        setTeams(msg.setup.teams);
        setOver(undefined);
        setAskedRematch(false);
        setSource(netSource(net, msg.side, () => socket?.lagTicks() ?? 3));
        return;
      }
      case 'resume': {
        const net = netRef.current;
        if (net && net.side === msg.side) net.reset(msg.state, msg.pending);
        else {
          const fresh = new Netplay(msg.side, msg.state, out, msg.pending);
          netRef.current = fresh;
          setSide(msg.side);
          setTeams(msg.state.setup.teams);
          setSource(netSource(fresh, msg.side, () => socket?.lagTicks() ?? 3));
        }
        return;
      }
      case 'watch': {
        const feed = feedRef.current;
        if (feed) feed.reset(msg.state);
        else {
          const fresh = new SpectatorFeed(msg.state);
          feedRef.current = fresh;
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
        netRef.current?.remoteInput(msg.t, msg.i);
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
      () => ({ token: getToken() ?? '', match: matchId, role, team: myTeam }),
      onMessage,
      setStatus
    );
    socketRef.current = socket;
    return () => {
      socket.close();
      socketRef.current = undefined;
    };
    // The team only matters for the first hello; changing it later must not reconnect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, matchId, getToken, onMessage]);

  const teamPair = useMemo((): [Team, Team] | undefined => {
    const ids =
      teams ??
      (room?.seats[0] && room.seats[1] ? [room.seats[0].team, room.seats[1].team] : undefined);
    return ids ? [teamById(ids[0]), teamById(ids[1])] : undefined;
  }, [teams, room]);
  const kits = useMemo(
    () =>
      teamPair
        ? matchKits(teamPair[0], teamPair[1])
        : matchKits(teamById(myTeam), teamById(myTeam)),
    [teamPair, myTeam]
  );
  const playing = side !== undefined;
  let sides: ['p1' | 'cpu', 'p1' | 'cpu'] = ['cpu', 'cpu'];
  if (playing) sides = side === 0 ? ['p1', 'cpu'] : ['cpu', 'p1'];
  const view = useMatchCanvas({
    source,
    kits,
    people: [true, true],
    sides,
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
  const cheer = (e: number) => socketRef.current?.send({ type: 'cheer', e });
  const live = room?.state === 'playing' && !over;
  const back = () => {
    if (playing && live) setConfirmLeave(true);
    else onLeave();
  };
  const seatName = (s: 0 | 1) => {
    const seat = room?.seats[s];
    return seat ? nameOf(seat.userId) : '…';
  };
  const watchers = room?.watchers ?? [];
  const isHost = room?.seats[0]?.userId === userId;

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

  // Came by link to a match waiting for a player: play, with which team, or watch.
  if (!role)
    return (
      <div className={`${css.Page} ${LobbyScope}`}>
        <GameTopBar title={tr('football.online.title', 'Online match')} onBack={onLeave} />
        <div className={css.Menu}>
          {room ? (
            <>
              <p className={css.Note}>
                {tr('football.online.invited', '{{name}} is waiting for an opponent ({{team}}).', {
                  name: seatName(0),
                  team: room.seats[0] ? teamById(room.seats[0].team).name : '',
                })}
              </p>
              <TeamPicker
                title={tr('football.your_team', 'Your team')}
                value={myTeam}
                onChange={onTeam}
              />
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

  // Waiting for the second player.
  if (!source && (!room || room.state === 'waiting'))
    return (
      <div className={`${css.Page} ${LobbyScope}`}>
        <GameTopBar title={tr('football.online.title', 'Online match')} onBack={onLeave} />
        <div className={css.Menu}>
          <div className={css.Picker}>
            <span className={css.Label}>{tr('football.online.waiting_room', 'Waiting room')}</span>
            {room?.seats.map((seat) =>
              seat ? (
                <div key={seat.userId} className={css.Chosen}>
                  <Shirt team={teamById(seat.team)} big />
                  <span>
                    {nameOf(seat.userId)} · {teamById(seat.team).name}
                  </span>
                </div>
              ) : (
                <p key="empty" className={css.Loading}>
                  {tr('football.online.waiting', 'Waiting for an opponent…')}
                </p>
              )
            )}
            <p className={css.Note}>
              {tr(
                'football.online.share',
                'Send the link to a friend: whoever opens it can take the other side or watch.'
              )}
            </p>
            <div className={css.Row}>
              <button
                type="button"
                className={gameButton({ variant: 'primary' })}
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
          </div>
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

  const teamsShown = teamPair ?? [teamById(myTeam), teamById(myTeam)];
  const menuOpen = playing && !!view.hud?.paused && !optionsOpen && !over;

  return (
    <div className={`${css.Page} ${StageScope}`}>
      <GameTopBar
        title={`${seatName(0)} × ${seatName(1)}`}
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
          teams={teamsShown}
          kits={kits}
          waitingText={
            playing
              ? tr('football.online.waiting_player', 'Waiting for the other player…')
              : tr('football.online.buffering', 'Catching up…')
          }
        >
          {status === 'connecting' && (
            <span className={css.Hint}>{tr('football.online.reconnecting', 'Reconnecting…')}</span>
          )}
          {room?.seats.some((s) => s && !s.connected) && live && (
            <span className={css.Hint}>
              {tr('football.online.away', '{{name}} lost the connection; waiting a little.', {
                name: nameOf(room.seats.find((s) => s && !s.connected)?.userId ?? ''),
              })}
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
              onClick={() => cheer(i)}
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
                'Online the match keeps going. If you leave and don’t come back within 90 seconds, it ends.'
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
                  ? tr('football.online.abandoned', 'A player left and didn’t come back.')
                  : tr('football.online.cancelled', 'The host cancelled the match.')}
              </p>
            )}
            {source && <FinalScore match={source.match} teams={teamsShown} />}
            {playing && over.state === 'over' && (
              <button
                type="button"
                className={gameButton({ variant: 'primary' })}
                disabled={askedRematch}
                onClick={() => {
                  setAskedRematch(true);
                  socketRef.current?.send({ type: 'rematch' });
                }}
              >
                {askedRematch
                  ? tr('football.online.rematch_wait', 'Waiting for the other player…')
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
