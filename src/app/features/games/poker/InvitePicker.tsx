import React, { useEffect, useMemo, useState } from 'react';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useCallEmbed } from '../../../hooks/useCallEmbed';
import { friendDisplayName } from '../../friends/userDisplay';
import { useFriends } from '../../friends/useFriends';
import { tr } from '../../translation/tr';
import {
  Candidate,
  CandidateSource,
  invitable,
  matchesQuery,
  mergeCandidates,
  TableStatus,
} from './inviteCandidates';
import * as css from './pokerPage.css';

type Filter = 'all' | 'call' | 'friend';

// Whoever is in the voice call I'm in now, read once: the dialog is short-lived.
const useCallUserIds = (): string[] => {
  const mx = useMatrixClient();
  const embed = useCallEmbed();
  return useMemo(() => {
    if (!embed) return [];
    const session = mx.matrixRTC.getRoomSession(embed.room);
    return [...new Set(session.memberships.map((m) => m.sender).filter((s): s is string => !!s))];
  }, [mx, embed]);
};

// Everyone in rooms I'm in, plus what the server's directory finds for the search; same server only,
// since tables can only invite accounts here.
const useServerUserIds = (enabled: boolean, query: string): string[] => {
  const mx = useMatrixClient();
  const [found, setFound] = useState<string[]>([]);
  const domain = mx.getDomain();
  const local = useMemo(() => {
    if (!enabled) return [];
    const ids = new Set<string>();
    mx.getRooms()
      .filter((room) => room.getMyMembership() === 'join')
      .forEach((room) => room.getJoinedMembers().forEach((m) => ids.add(m.userId)));
    return [...ids];
  }, [mx, enabled]);

  useEffect(() => {
    const term = query.trim();
    if (!enabled || term.length < 2) {
      setFound([]);
      return undefined;
    }
    let live = true;
    const timer = setTimeout(() => {
      mx.searchUserDirectory({ term, limit: 50 })
        .then(({ results }) => live && setFound(results.map((r) => r.user_id)))
        .catch(() => undefined);
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [mx, enabled, query]);

  return useMemo(
    () => [...local, ...found].filter((id) => !domain || id.endsWith(`:${domain}`)),
    [local, found, domain]
  );
};

type InvitePickerProps = {
  /** The table lets members invite any account, not only friends. */
  everyone: boolean;
  /** Who is already at the table or invited; never selectable. */
  status: ReadonlyMap<string, TableStatus>;
  selected: string[];
  onChange: (selected: string[]) => void;
};

export function InvitePicker({ everyone, status, selected, onChange }: InvitePickerProps) {
  const mx = useMatrixClient();
  const myId = mx.getUserId() ?? '';
  const { lists } = useFriends();
  const [query, setQuery] = useState('');
  const callIds = useCallUserIds();
  const [filter, setFilter] = useState<Filter>(callIds.some((id) => id !== myId) ? 'call' : 'all');
  const serverIds = useServerUserIds(everyone, query);

  const candidates = useMemo(() => {
    const sources: { source: CandidateSource; userIds: string[] }[] = [
      { source: 'friend', userIds: (lists?.friends ?? []).map((f) => f.userId) },
      { source: 'server', userIds: serverIds },
    ];
    // Without "everyone", the call only helps pick friends: strangers would be refused.
    if (everyone) sources.push({ source: 'call', userIds: callIds });
    else {
      const friends = new Set(sources[0].userIds);
      sources.push({ source: 'call', userIds: callIds.filter((id) => friends.has(id)) });
    }
    return mergeCandidates(sources, (id) => friendDisplayName(mx, id), myId);
  }, [mx, myId, lists, serverIds, callIds, everyone]);

  const shown = candidates.filter(
    (c: Candidate) => (filter === 'all' || c.sources.includes(filter)) && matchesQuery(c, query)
  );
  const addable = invitable(shown, status);
  const callCount = callIds.filter((id) => id !== myId).length;
  const allPicked = addable.length > 0 && addable.every((id) => selected.includes(id));

  const toggle = (userId: string) =>
    onChange(
      selected.includes(userId) ? selected.filter((id) => id !== userId) : [...selected, userId]
    );
  const toggleAll = () =>
    onChange(
      allPicked
        ? selected.filter((id) => !addable.includes(id))
        : [...new Set([...selected, ...addable])]
    );

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: tr('games.invite.filter_all', 'All') },
    { key: 'call', label: tr('games.invite.filter_call', 'In my call') },
    { key: 'friend', label: tr('games.invite.filter_friends', 'Friends') },
  ];

  const statusText = (s: TableStatus) =>
    s === 'member'
      ? tr('games.invite.at_table', 'At the table')
      : tr('games.invite.already_invited', 'Invited');

  const empty = () => {
    if (filter === 'call' && callIds.length === 0) {
      return tr('games.invite.no_call', "You aren't in a voice call.");
    }
    if (query.trim()) return tr('games.invite.no_match', 'Nobody found with that name.');
    return everyone
      ? tr('games.invite.nobody', 'Nobody to invite. Search by name.')
      : tr('games.invite.no_friends', 'No friends here. The owner can open invites to everyone.');
  };

  return (
    <div className={css.Field}>
      <input
        className={css.TextInput}
        value={query}
        placeholder={tr('games.invite.search', 'Search by name')}
        aria-label={tr('games.invite.search', 'Search by name')}
        onChange={(evt) => setQuery(evt.target.value)}
      />
      <div className={css.Segmented} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            className={css.SegmentButton}
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            {f.key === 'call' && callCount > 0 ? ` (${callCount})` : ''}
          </button>
        ))}
      </div>
      <div className={css.FieldHeader}>
        <span className={css.Muted}>
          {tr('games.lobby.selected', '{{count}} selected', { count: selected.length })}
        </span>
        <button
          type="button"
          className={css.QuietButton}
          disabled={addable.length === 0}
          onClick={toggleAll}
        >
          {allPicked
            ? tr('games.invite.unselect_all', 'Unselect all')
            : tr('games.invite.select_all', 'Select all ({{count}})', { count: addable.length })}
        </button>
      </div>
      {shown.length === 0 ? (
        <p className={css.Note}>{empty()}</p>
      ) : (
        <div className={css.ContactList}>
          {shown.map((c) => {
            const s = status.get(c.userId);
            return (
              <label key={c.userId} className={css.CheckRow} htmlFor={`invite-${c.userId}`}>
                <input
                  id={`invite-${c.userId}`}
                  className={css.CheckInput}
                  type="checkbox"
                  disabled={!!s}
                  checked={!!s || selected.includes(c.userId)}
                  onChange={() => toggle(c.userId)}
                />
                <span style={{ flex: 1, opacity: s ? 0.6 : 1 }}>
                  {c.name}
                  {c.sources.includes('call') && (
                    <span className={css.Muted}>
                      {' '}
                      · {tr('games.invite.in_call', 'in the call')}
                    </span>
                  )}
                </span>
                {s && <span className={css.Muted}>{statusText(s)}</span>}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export type TableAccess = { isPublic: boolean; inviteAnyone: boolean };

type AccessFieldsProps = {
  value: TableAccess;
  disabled?: boolean;
  onChange: (value: TableAccess) => void;
};

/** The owner's choices: who may come in and whom members may invite. */
export function AccessFields({ value, disabled, onChange }: AccessFieldsProps) {
  const row = (key: keyof TableAccess, label: string, hint: string) => (
    <label className={css.CheckRow} htmlFor={`access-${key}`}>
      <input
        id={`access-${key}`}
        className={css.CheckInput}
        type="checkbox"
        disabled={disabled}
        checked={value[key]}
        onChange={() => onChange({ ...value, [key]: !value[key] })}
      />
      <span style={{ display: 'flex', flexDirection: 'column' }}>
        <span>{label}</span>
        <span className={css.Muted}>{hint}</span>
      </span>
    </label>
  );
  return (
    <div className={css.Field}>
      {row(
        'isPublic',
        tr('games.access.public', 'Public table'),
        tr('games.access.public_hint', 'Shows in everyone’s lobby and anyone can join.')
      )}
      {row(
        'inviteAnyone',
        tr('games.access.anyone', 'Invite anyone'),
        tr('games.access.anyone_hint', 'Members can invite anyone on the server, not just friends.')
      )}
    </div>
  );
}
