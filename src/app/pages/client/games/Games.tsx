import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import {
  GamesHub,
  PokerLobby,
  PracticeScreen,
  TableScreen,
  TournamentSetup,
} from '../../../features/games';
import { IdleGame } from '../../../features/games/idle';
import { HordeGame } from '../../../features/games/horde';
import { FootballGame } from '../../../features/games/football';
import { callEmbedAtom } from '../../../state/callEmbed';
import { createPokerApi } from '../../../features/games/poker/api';
import { errorText } from '../../../features/games/poker/errorText';
import * as css from '../../../features/games/poker/pokerPage.css';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { ApiError } from '../../../utils/blazeroomApi';
import { ScreenSize, useScreenSizeContext } from '../../../hooks/useScreenSize';
import {
  getGamesPath,
  getGamesIdlePath,
  getGamesHordePath,
  getGamesFootballPath,
  getGamesFootballMatchPath,
  getGamesTableGamePath,
  getGamesPokerPath,
  getGamesPokerPracticePath,
  getGamesPokerTournamentPath,
  getGamesPokerTablePath,
  getHomePath,
} from '../../pathUtils';
import { tr } from '../../../features/translation/tr';

export function GamesHubPage() {
  const navigate = useNavigate();
  const screenSize = useScreenSizeContext();

  return (
    <GamesHub
      onOpenPoker={() => navigate(getGamesPokerPath())}
      onOpenIdle={() => navigate(getGamesIdlePath())}
      onOpenHorde={() => navigate(getGamesHordePath())}
      onOpenFootball={() => navigate(getGamesFootballPath())}
      onOpenTableGame={(kind) => navigate(getGamesTableGamePath(kind))}
      onOpenPokerTable={(id) => navigate(getGamesPokerTablePath(id))}
      onOpenGameTable={(kind, id) => navigate(getGamesTableGamePath(kind, id))}
      onOpenFootballMatch={(id) => navigate(getGamesFootballMatchPath(id))}
      onBack={screenSize === ScreenSize.Mobile ? () => navigate(getHomePath()) : undefined}
    />
  );
}

export function IdleGamePage() {
  const mx = useMatrixClient();
  const navigate = useNavigate();
  const userId = mx.getUserId() ?? '';
  const defaultName = mx.getUser(userId)?.displayName ?? userId.replace(/^@|:.*$/g, '');

  return (
    <IdleGame userId={userId} defaultName={defaultName} onBack={() => navigate(getGamesPath())} />
  );
}

export function HordeGamePage() {
  const mx = useMatrixClient();
  const navigate = useNavigate();
  const getToken = useCallback(() => mx.getAccessToken(), [mx]);
  const nameOf = useCallback(
    (userId: string) => mx.getUser(userId)?.displayName ?? userId.replace(/^@|:.*$/g, ''),
    [mx]
  );

  // A call this app has joined: the game then plays quietly, under the voices.
  const inCall = useAtomValue(callEmbedAtom) !== undefined;

  return (
    <HordeGame
      userId={mx.getUserId() ?? ''}
      getToken={getToken}
      nameOf={nameOf}
      onBack={() => navigate(getGamesPath())}
      inCall={inCall}
    />
  );
}

export function FootballGamePage() {
  const mx = useMatrixClient();
  const navigate = useNavigate();
  const { matchId } = useParams();
  const [search] = useSearchParams();
  const as = search.get('as');
  const getToken = useCallback(() => mx.getAccessToken(), [mx]);
  const nameOf = useCallback(
    (userId: string) => mx.getUser(userId)?.displayName ?? userId.replace(/^@|:.*$/g, ''),
    [mx]
  );
  // In a call the stadium plays quietly, under the voices.
  const inCall = useAtomValue(callEmbedAtom) !== undefined;
  return (
    <FootballGame
      onBack={() => navigate(getGamesPath())}
      inCall={inCall}
      userId={mx.getUserId() ?? ''}
      getToken={getToken}
      nameOf={nameOf}
      matchId={matchId ? decodeURIComponent(matchId) : undefined}
      matchRole={as === 'play' || as === 'watch' ? as : undefined}
      onOpenMatch={(id, role) => navigate(`${getGamesFootballMatchPath(id)}?as=${role}`)}
      onCloseMatch={() => navigate(getGamesFootballPath())}
    />
  );
}

export function PokerLobbyPage() {
  const navigate = useNavigate();

  return (
    <PokerLobby
      onBack={() => navigate(getGamesPath())}
      onPractice={() => navigate(getGamesPokerPracticePath())}
      onTournament={() => navigate(getGamesPokerTournamentPath())}
      onOpenTable={(tableId) => navigate(getGamesPokerTablePath(tableId))}
    />
  );
}

export function PokerPracticePage() {
  const navigate = useNavigate();
  return <PracticeScreen onBack={() => navigate(getGamesPokerPath())} />;
}

export function PokerTournamentPage() {
  const navigate = useNavigate();
  const open = useCallback(
    (tableId: string) => navigate(getGamesPokerTablePath(tableId), { replace: true }),
    [navigate]
  );
  return <TournamentSetup onBack={() => navigate(getGamesPokerPath())} onOpen={open} />;
}

export function PokerTablePage() {
  const navigate = useNavigate();
  const { tableId = '' } = useParams();
  const goBack = useCallback(() => navigate(getGamesPokerPath()), [navigate]);
  const newTournament = useCallback(() => navigate(getGamesPokerTournamentPath()), [navigate]);

  return (
    <TableScreen
      key={tableId}
      tableId={decodeURIComponent(tableId)}
      onBack={goBack}
      onNewTournament={newTournament}
      onOpenTable={(id) => navigate(getGamesPokerTablePath(id))}
    />
  );
}

// Joining twice (a remount) is harmless: the API answers the same table either way.
export function PokerJoinPage() {
  const mx = useMatrixClient();
  const navigate = useNavigate();
  const { token = '' } = useParams();
  const [error, setError] = useState<string>();
  const posted = useRef<string>();

  useEffect(() => {
    if (posted.current === token) return;
    posted.current = token;
    createPokerApi(() => mx.getAccessToken())
      .join(decodeURIComponent(token))
      .then((id) => navigate(getGamesPokerTablePath(id), { replace: true }))
      .catch((e) => setError(errorText(e instanceof ApiError ? e.code : 'unknown')));
  }, [mx, navigate, token]);

  return (
    <div className={css.Page}>
      <div className={css.Overlay} style={{ position: 'relative', flexGrow: 1 }}>
        <div
          className={css.Dialog}
          role="dialog"
          aria-label={tr('games.join.title', 'Join a table')}
        >
          <h2 className={css.DialogTitle}>{tr('games.join.title', 'Join a table')}</h2>
          {error ? (
            <>
              <p className={css.ErrorText}>{error}</p>
              <button
                type="button"
                className={css.PrimaryButton}
                onClick={() => navigate(getGamesPokerPath())}
              >
                {tr('games.join.back', 'Go to the lobby')}
              </button>
            </>
          ) : (
            <p className={css.DialogText}>{tr('games.join.joining', 'Joining the table…')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
