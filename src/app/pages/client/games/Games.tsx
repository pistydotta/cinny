import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { ClientEvent, Room } from 'matrix-js-sdk';
import {
  GamesHub,
  LobbyTable,
  PokerGame,
  PokerLobby,
  SharedPokerGame,
  createMatrixTableTransport,
  createPokerTableRoom,
  createTableConfig,
  getTableConfig,
  isPokerTableRoom,
  useMatrixGameWallet,
} from '../../../features/games';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { useUserProfile } from '../../../hooks/useUserProfile';
import { useDirectUsers } from '../../../hooks/useDirectUsers';
import { getMxIdLocalPart, mxcUrlToHttp } from '../../../utils/matrix';
import { ScreenSize, useScreenSizeContext } from '../../../hooks/useScreenSize';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { allInvitesAtom } from '../../../state/room-list/inviteList';
import {
  getGamesPath,
  getGamesPokerPath,
  getGamesPokerPracticePath,
  getGamesPokerTablePath,
  getHomePath,
} from '../../pathUtils';
import * as css from '../../../features/games/poker/pokerPage.css';
import { tr } from '../../../features/translation/tr';

const useMyProfile = () => {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const userId = mx.getUserId() as string;
  const profile = useUserProfile(userId);
  const name = profile.displayName ?? getMxIdLocalPart(userId) ?? userId;
  const avatarHttp = profile.avatarUrl
    ? mxcUrlToHttp(mx, profile.avatarUrl, useAuthentication, 128, 128, 'crop') ?? undefined
    : undefined;
  return { userId, name, avatarMxc: profile.avatarUrl, avatarHttp };
};

export function GamesHubPage() {
  const navigate = useNavigate();
  const screenSize = useScreenSizeContext();
  const wallet = useMatrixGameWallet();

  return (
    <GamesHub
      wallet={wallet}
      onOpenPoker={() => navigate(getGamesPokerPath())}
      onBack={screenSize === ScreenSize.Mobile ? () => navigate(getHomePath()) : undefined}
    />
  );
}

export function PokerLobbyPage() {
  const mx = useMatrixClient();
  const navigate = useNavigate();
  const wallet = useMatrixGameWallet();
  const me = useMyProfile();
  const joinedRooms = useAtomValue(allRoomsAtom);
  const invites = useAtomValue(allInvitesAtom);
  const directUsers = useDirectUsers();

  const tables: LobbyTable[] = useMemo(() => {
    const toTable = (roomId: string, invited: boolean): LobbyTable | undefined => {
      const room = mx.getRoom(roomId);
      if (!room || !isPokerTableRoom(room)) return undefined;
      const config = getTableConfig(room);
      const inviter = invited ? room.getMember(me.userId)?.events.member?.getSender() : undefined;
      return {
        roomId,
        name: room.name || config?.name || tr('games.table.default_name', 'Poker table'),
        smallBlind: config?.smallBlind,
        bigBlind: config?.bigBlind,
        members: room.getJoinedMemberCount(),
        invited,
        invitedBy: inviter ? mx.getUser(inviter)?.displayName ?? inviter : undefined,
      };
    };
    return [
      ...invites.map((id) => toTable(id, true)),
      ...joinedRooms.map((id) => toTable(id, false)),
    ].filter((t): t is LobbyTable => !!t);
  }, [mx, joinedRooms, invites, me.userId]);

  const contacts = useMemo(
    () =>
      directUsers.map((userId) => ({
        userId,
        name: mx.getUser(userId)?.displayName ?? getMxIdLocalPart(userId) ?? userId,
      })),
    [mx, directUsers]
  );

  return (
    <PokerLobby
      balance={wallet.balance}
      tables={tables}
      contacts={contacts}
      defaultTableName={tr('games.lobby.default_table_name', "{{name}}'s table", { name: me.name })}
      onBack={() => navigate(getGamesPath())}
      onPractice={() => navigate(getGamesPokerPracticePath())}
      onOpenTable={(roomId) => navigate(getGamesPokerTablePath(roomId))}
      onAcceptInvite={async (roomId) => {
        await mx.joinRoom(roomId);
        navigate(getGamesPokerTablePath(roomId));
      }}
      onCreateTable={async ({ name, smallBlind, bigBlind, invite }) => {
        const roomId = await createPokerTableRoom(mx, {
          config: createTableConfig(name, smallBlind, bigBlind),
          invite,
        });
        navigate(getGamesPokerTablePath(roomId));
      }}
    />
  );
}

export function PokerPracticePage() {
  const navigate = useNavigate();
  const wallet = useMatrixGameWallet();
  const me = useMyProfile();

  const hero = useMemo(
    () => ({ id: me.userId, name: me.name, avatarUrl: me.avatarHttp }),
    [me.userId, me.name, me.avatarHttp]
  );

  return <PokerGame hero={hero} wallet={wallet} onBack={() => navigate(getGamesPokerPath())} />;
}

/** The room of a table, once the client knows it (right after creating it, it may not yet). */
const useLiveRoom = (roomId: string): Room | undefined => {
  const mx = useMatrixClient();
  const [room, setRoom] = useState(() => mx.getRoom(roomId) ?? undefined);
  useEffect(() => {
    setRoom(mx.getRoom(roomId) ?? undefined);
    const onRoom = (r: Room) => {
      if (r.roomId === roomId) setRoom(r);
    };
    mx.on(ClientEvent.Room, onRoom);
    return () => {
      mx.removeListener(ClientEvent.Room, onRoom);
    };
  }, [mx, roomId]);
  return room;
};

function TableMessage({ text, onBack }: { text: string; onBack: () => void }) {
  return (
    <div className={css.Page}>
      <div className={css.Overlay} style={{ position: 'relative', flexGrow: 1 }}>
        <div className={css.Dialog}>
          <h2 className={css.DialogTitle}>{text}</h2>
          <button type="button" className={css.SecondaryButton} onClick={onBack}>
            {tr('games.action.back', 'Back')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PokerTablePage() {
  const mx = useMatrixClient();
  const navigate = useNavigate();
  const useAuthentication = useMediaAuthentication();
  const { roomId: encodedRoomId = '' } = useParams();
  const roomId = decodeURIComponent(encodedRoomId);
  const room = useLiveRoom(roomId);
  const wallet = useMatrixGameWallet();
  const me = useMyProfile();
  const goBack = useCallback(() => navigate(getGamesPokerPath()), [navigate]);

  const config = room ? getTableConfig(room) : undefined;
  const configKey = config ? JSON.stringify(config) : '';
  const transport = useMemo(
    () => (room && config ? createMatrixTableTransport(mx, room, config) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mx, room, configKey]
  );

  const resolveAvatar = useCallback(
    (url: string) =>
      url.startsWith('mxc://')
        ? mxcUrlToHttp(mx, url, useAuthentication, 128, 128, 'crop') ?? undefined
        : url,
    [mx, useAuthentication]
  );

  if (!room)
    return <TableMessage text={tr('games.table.loading', 'Loading the table…')} onBack={goBack} />;
  if (room.getMyMembership() !== 'join') {
    return (
      <TableMessage
        text={tr('games.table.accept_first', 'Accept the table invite on the Poker screen.')}
        onBack={goBack}
      />
    );
  }
  if (!transport) {
    return (
      <TableMessage
        text={tr('games.table.not_a_table', 'This room is not a poker table.')}
        onBack={goBack}
      />
    );
  }

  return (
    <SharedPokerGame
      key={roomId}
      transport={transport}
      tableKey={roomId}
      profile={{ name: me.name, avatarUrl: me.avatarMxc }}
      resolveAvatar={resolveAvatar}
      wallet={wallet}
      onBack={goBack}
    />
  );
}
