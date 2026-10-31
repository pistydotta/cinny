import React, { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import {
  GamesHub,
  LobbyTable,
  PokerLobby,
  PracticeScreen,
  TableScreen,
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
  return <PracticeScreen onBack={() => navigate(getGamesPokerPath())} />;
}

export function PokerTablePage() {
  const navigate = useNavigate();
  const { tableId = '' } = useParams();
  const goBack = useCallback(() => navigate(getGamesPokerPath()), [navigate]);

  return <TableScreen key={tableId} tableId={decodeURIComponent(tableId)} onBack={goBack} />;
}
