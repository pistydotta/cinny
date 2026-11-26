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

export type LiveTable = {
  key: string;
  game: GameKind | 'poker';
  tableId: string;
  name: string;
  players: string[];
  seats?: number;
  phase?: TableSummary['phase'];
  // What the button does: go back to your seat, take a free one, or watch.
  role: 'seated' | 'open' | 'watch';
  relevance: Relevance;
  // When a person last moved, and whether that was long enough ago to call the game stopped.
  activeAt?: number;
  idle?: boolean;
};

const KINDS: GameKind[] = ['truco', 'fodinha', 'chess'];
const POLL_MS = 10_000;

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
  const { list: poker } = useLobby();
  const { lists: friendLists } = useFriends();
  const call = useCallPeople();
  const [summaries, setSummaries] = useState<TableSummary[]>();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const lists = await Promise.all(KINDS.map((k) => api.list(k).catch(() => [])));
      if (!cancelled) setSummaries(lists.flatMap((l) => (Array.isArray(l) ? l : [])));
    };
    load();
    const id = window.setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [api]);

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
          activeAt: s.activeAt,
          idle: isIdle(s, now),
        };
      });
    // The poker lobby names no players, only the owner.
    const pokerRows = (
      [
        [poker?.tables, true, false],
        [poker?.invites, false, true],
        [poker?.publicTables, false, false],
      ] as const
    ).flatMap(([list, seated, invited]) =>
      (list ?? []).map((t) => ({
        key: `poker:${t.id}`,
        game: 'poker' as const,
        tableId: t.id,
        name: t.name,
        players: [] as string[],
        seats: undefined,
        phase: undefined,
        role: (seated ? 'seated' : 'open') as LiveTable['role'],
        people: [t.ownerId],
        seated,
        invited,
        updatedAt: undefined,
      }))
    );
    return rank([...rows, ...pokerRows], circle);
  }, [summaries, poker, me, friendLists, callKey]);

  return { tables, loaded: summaries !== undefined };
}
