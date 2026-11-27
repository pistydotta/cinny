import { useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { callEmbedAtom } from '../../state/callEmbed';
import { useFriends } from '../friends/useFriends';
import { createTableGamesApi } from './table-games/api';
import { GameKind, TableSummary } from './table-games/types';
import { useLobby } from './poker/useLobby';
import { isIdle } from './table-games/lobby';
import { rank, Relevance } from './liveRank';
import { Activity } from './liveText';
import { createFootballApi, Room as FootballRoom } from './football/online/api';
import { teamById } from './football/engine/teams';

export type LiveTable = {
  key: string;
  game: GameKind | 'poker' | 'football';
  tableId: string;
  name: string;
  // The people playing: seated at the table or on a side of the match.
  players: string[];
  seats?: number;
  phase?: TableSummary['phase'];
  // A FIFUMA match under way: its score and minute.
  score?: [number, number];
  minute?: number;
  // What the button does: go back to your seat, take a free one, or watch.
  role: 'seated' | 'open' | 'watch';
  relevance: Relevance;
  // The last thing that happened there (see `activity` for what), and whether that was long
  // enough ago to call the game stopped.
  activity: Activity;
  activeAt?: number;
  idle?: boolean;
};

const KINDS: GameKind[] = ['truco', 'fodinha', 'chess'];
const POLL_MS = 10_000;
// Hands come every minute or so: five minutes without one and the table has stopped.
export const POKER_IDLE_MS = 5 * 60_000;

const footballName = (room: FootballRoom) =>
  `${teamById(room.teams[0]).name} × ${teamById(room.teams[1]).name}`;

// The people in the call this app has joined, read on each render: the lobby re-renders
// on every poll, which is often enough for who is in the call.
const useCallPeople = (): Set<string> => {
  const mx = useMatrixClient();
  const embed = useAtomValue(callEmbedAtom);
  const room = embed ? mx.getRoom(embed.roomId) : null;
  const memberships = room ? mx.matrixRTC.getRoomSession(room).memberships : [];
  const me = mx.getUserId();
  return new Set(
    memberships.map((m: { sender?: string }) => m.sender ?? '').filter((u: string) => u && u !== me)
  );
};

// The tables that matter to you, for the hub: yours, invites, then the ones people in your
// call or your friends are at. Strangers' tables stay in each game's own lobby.
export function useLiveTables(): { tables: LiveTable[]; loaded: boolean } {
  const mx = useMatrixClient();
  const me = mx.getUserId() ?? '';
  const api = useMemo(() => createTableGamesApi(() => mx.getAccessToken()), [mx]);
  const footballApi = useMemo(() => createFootballApi(() => mx.getAccessToken()), [mx]);
  const { list: poker } = useLobby();
  const { lists: friendLists } = useFriends();
  const call = useCallPeople();
  const [summaries, setSummaries] = useState<TableSummary[]>();
  const [matches, setMatches] = useState<FootballRoom[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [football, ...lists] = await Promise.all([
        footballApi.list().catch(() => []),
        ...KINDS.map((k) => api.list(k).catch(() => [])),
      ]);
      if (cancelled) return;
      setSummaries(lists.flatMap((l) => (Array.isArray(l) ? l : [])));
      setMatches(Array.isArray(football) ? football : []);
    };
    load();
    const id = window.setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [api, footballApi]);

  const callKey = [...call].sort().join(' ');
  const tables = useMemo(() => {
    const friends = new Set(friendLists?.friends.map((f) => f.userId) ?? []);
    const circle = { call: new Set(callKey ? callKey.split(' ') : []), friends };
    // Recomputed on every poll, which is often enough for a three-minute threshold.
    const now = Date.now();
    const rows = (summaries ?? [])
      .filter((s) => s.phase !== 'finished')
      .map((s) => {
        const players = s.players ?? [];
        const seated = players.includes(me);
        let role: LiveTable['role'] = 'watch';
        if (seated) role = 'seated';
        else if (s.phase === 'waiting' && players.length < s.capacity) role = 'open';
        return {
          key: `${s.kind}:${s.id}`,
          game: s.kind as LiveTable['game'],
          tableId: s.id,
          name: s.name,
          players,
          seats: s.capacity,
          phase: s.phase,
          role,
          people: players,
          seated,
          invited: (s.invited ?? []).includes(me),
          updatedAt: s.updatedAt,
          activity: 'move' as const,
          activeAt: s.activeAt,
          idle: isIdle(s, now),
        };
      });
    // A poker table nobody sits at isn't happening, even if it's yours: the poker lobby keeps
    // it. An invite stays, since it's waiting on you.
    const pokerRows = (
      [
        [poker?.tables, true, false],
        [poker?.invites, false, true],
        [poker?.publicTables, false, false],
      ] as const
    ).flatMap(([list, member, invited]) =>
      (list ?? [])
        .filter((t) => invited || (t.seated ?? []).length > 0)
        .map((t) => {
          const players = t.seated ?? [];
          const lastHand = t.lastHandAt ?? undefined;
          return {
            key: `poker:${t.id}`,
            game: 'poker' as const,
            tableId: t.id,
            name: t.name,
            players,
            seats: undefined,
            phase: undefined,
            role: (players.includes(me) ? 'seated' : 'open') as LiveTable['role'],
            people: [t.ownerId, ...players],
            seated: member,
            invited,
            updatedAt: undefined,
            activity: 'hand' as const,
            activeAt: lastHand,
            idle: lastHand === undefined || now - lastHand >= POKER_IDLE_MS,
          };
        })
    );
    // FIFUMA rooms are open to everyone; like the other tables, only your circle's show here.
    const footballRows = matches
      .filter((m) => m.state === 'waiting' || m.state === 'playing')
      .map((m) => {
        const players = [...m.sides[0], ...m.sides[1]].map((s) => s.userId);
        const seated = players.includes(me);
        const full = m.sides.every((side) => side.length >= m.perSide);
        let role: LiveTable['role'] = 'watch';
        if (seated) role = 'seated';
        else if (m.state === 'waiting' && !full) role = 'open';
        return {
          key: `football:${m.id}`,
          game: 'football' as const,
          tableId: m.id,
          name: footballName(m),
          players,
          seats: m.perSide * 2,
          phase: undefined,
          score: m.state === 'playing' ? m.score : undefined,
          minute: m.state === 'playing' ? m.minute : undefined,
          role,
          people: players,
          seated,
          invited: false,
          updatedAt: m.createdAt,
          activity: 'created' as const,
          activeAt: m.createdAt,
          idle: false,
        };
      });
    return rank([...rows, ...pokerRows, ...footballRows], circle);
  }, [summaries, poker, matches, me, friendLists, callKey]);

  return { tables, loaded: summaries !== undefined };
}
