import React, { useCallback, useEffect, useState } from 'react';
import { Navigate, Outlet, Route, useOutletContext, useParams } from 'react-router-dom';
import { tr } from '../translation/tr';
import { PlaybookMap } from './model';
import { usePlaybookApi } from './usePlaybook';
import { Browse } from './Browse';
import { ItemView } from './ItemView';
import { ItemForm } from './ItemForm';
import { PLAYBOOK_GAME, PLAYBOOK_PATH, lastMap, playbookMapPath } from './paths';
import * as css from './playbook.css';

type Maps = { maps: PlaybookMap[]; canManage: boolean; reload: () => void };
type Screen = 'browse' | 'new' | 'item' | 'edit';

function PlaybookStart() {
  const { maps } = useOutletContext<Maps>();
  const start = maps.find((m) => m.slug === lastMap()) ?? maps.find((m) => m.active) ?? maps[0];
  return start ? <Navigate to={playbookMapPath(start.slug)} replace /> : null;
}

function PlaybookScreen({ screen }: { screen: Screen }) {
  const api = usePlaybookApi();
  const { maps, canManage, reload } = useOutletContext<Maps>();
  const { game, map: slug, itemId = '' } = useParams();
  const map = maps.find((m) => m.slug === slug);
  if (game !== PLAYBOOK_GAME || !map) return <PlaybookStart />;
  if (screen === 'new') return <ItemForm key="new" api={api} map={map} />;
  if (screen === 'edit')
    return <ItemForm key={`edit-${itemId}`} api={api} map={map} itemId={itemId} />;
  if (screen === 'item') return <ItemView api={api} map={map} itemId={itemId} />;
  return <Browse api={api} maps={maps} map={map} canManage={canManage} onMapsChanged={reload} />;
}

export function PlaybookPage() {
  const api = usePlaybookApi();
  const [maps, setMaps] = useState<Omit<Maps, 'reload'>>();
  const [error, setError] = useState(false);

  const reload = useCallback(() => {
    api.maps().then(
      (m) => {
        setMaps(m);
        setError(false);
      },
      () => setError(true)
    );
  }, [api]);

  useEffect(reload, [reload]);

  return (
    <main className={css.Page}>
      <div className={css.Inner}>
        {error && (
          <div className={css.Empty}>
            <p className={css.Error}>
              {tr('playbook.error.maps', "Couldn't load the Playbook. Try again in a moment.")}
            </p>
            <button type="button" className={css.Button} onClick={reload}>
              {tr('playbook.retry', 'Try again')}
            </button>
          </div>
        )}
        {!error && !maps && <p className={css.Muted}>{tr('playbook.loading', 'Loading…')}</p>}
        {maps && <Outlet context={{ ...maps, reload } satisfies Maps} />}
      </div>
    </main>
  );
}

// Every path spelled out: Cinny's space route (/:space/:room/:event/) would otherwise win
// over a /playbook/* splat. :game is cs2, the only game; /playbook/ opens the last map.
export const playbookRoutes = (
  <Route path={PLAYBOOK_PATH} element={<PlaybookPage />}>
    <Route index element={<PlaybookStart />} />
    <Route path=":game/:map/" element={<PlaybookScreen screen="browse" />} />
    <Route path=":game/:map/new/" element={<PlaybookScreen screen="new" />} />
    <Route path=":game/:map/:itemId/" element={<PlaybookScreen screen="item" />} />
    <Route path=":game/:map/:itemId/edit/" element={<PlaybookScreen screen="edit" />} />
  </Route>
);
