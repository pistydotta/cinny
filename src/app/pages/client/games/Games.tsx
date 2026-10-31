import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GamesHub, PokerLobby, PracticeScreen, TableScreen } from '../../../features/games';
import { createPokerApi } from '../../../features/games/poker/api';
import { errorText } from '../../../features/games/poker/errorText';
import * as css from '../../../features/games/poker/pokerPage.css';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { ApiError } from '../../../utils/blazeroomApi';
import { ScreenSize, useScreenSizeContext } from '../../../hooks/useScreenSize';
import {
  getGamesPath,
  getGamesPokerPath,
  getGamesPokerPracticePath,
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
      onBack={screenSize === ScreenSize.Mobile ? () => navigate(getHomePath()) : undefined}
    />
  );
}

export function PokerLobbyPage() {
  const navigate = useNavigate();

  return (
    <PokerLobby
      onBack={() => navigate(getGamesPath())}
      onPractice={() => navigate(getGamesPokerPracticePath())}
      onOpenTable={(tableId) => navigate(getGamesPokerTablePath(tableId))}
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
