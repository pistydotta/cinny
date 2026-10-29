import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GamesHub, PokerGame, useMatrixGameWallet } from '../../../features/games';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { useUserProfile } from '../../../hooks/useUserProfile';
import { getMxIdLocalPart, mxcUrlToHttp } from '../../../utils/matrix';
import { ScreenSize, useScreenSizeContext } from '../../../hooks/useScreenSize';
import { getGamesPath, getGamesPokerPath, getHomePath } from '../../pathUtils';

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

export function PokerPage() {
  const mx = useMatrixClient();
  const navigate = useNavigate();
  const useAuthentication = useMediaAuthentication();
  const userId = mx.getUserId() as string;
  const profile = useUserProfile(userId);
  const wallet = useMatrixGameWallet();

  const displayName = profile.displayName ?? getMxIdLocalPart(userId) ?? userId;
  const avatarUrl = profile.avatarUrl
    ? mxcUrlToHttp(mx, profile.avatarUrl, useAuthentication, 128, 128, 'crop') ?? undefined
    : undefined;

  const hero = useMemo(
    () => ({ id: userId, name: displayName, avatarUrl }),
    [userId, displayName, avatarUrl]
  );

  return <PokerGame hero={hero} wallet={wallet} onBack={() => navigate(getGamesPath())} />;
}
