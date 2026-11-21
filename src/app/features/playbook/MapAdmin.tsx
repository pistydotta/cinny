import React, { useState } from 'react';
import { tr } from '../translation/tr';
import { PlaybookApi } from './api';
import { PlaybookMap } from './model';
import { uploadAndWait, uploadError } from './upload';
import * as css from './playbook.css';

type MapAdminProps = {
  api: PlaybookApi;
  map: PlaybookMap;
  onChanged: () => void;
  onClose: () => void;
};

// Superadmins only (the API checks): the map's radar image, its areas, whether it's listed,
// and new maps. Radar images are the game's art, so they're uploaded here, never put in git.
export function MapAdmin({ api, map, onChanged, onClose }: MapAdminProps) {
  const [areas, setAreas] = useState(map.areas.join(', '));
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const run = async (what: string, fn: () => Promise<unknown>) => {
    setBusy(what);
    setError('');
    try {
      await fn();
      onChanged();
    } catch (e) {
      setError(uploadError(e));
    } finally {
      setBusy('');
    }
  };

  return (
    <div className={css.Panel}>
      <div className={css.Toolbar}>
        <h2>{tr('playbook.admin.title', 'Manage {{map}}', { map: map.name })}</h2>
        <span className={css.Grow} />
        <button type="button" className={css.Button} onClick={onClose}>
          {tr('playbook.close', 'Close')}
        </button>
      </div>
      <label className={css.Field} htmlFor="pb-admin-1">
        {tr('playbook.admin.radar', 'Radar image (square, top-down)')}
        <input
          id="pb-admin-1"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={!!busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file)
              run('radar', async () => {
                const id = await uploadAndWait(api, file, 'image', () => undefined);
                await api.updateMap(map.id, { radar: id });
              });
          }}
        />
      </label>
      <div className={css.Toolbar}>
        <label className={`${css.Field} ${css.Grow}`} htmlFor="pb-admin-2">
          {tr('playbook.admin.areas', 'Areas, in order, separated by commas')}
          <input
            id="pb-admin-2"
            className={css.Input}
            value={areas}
            onChange={(e) => setAreas(e.target.value)}
          />
        </label>
        <button
          type="button"
          className={css.Button}
          disabled={!!busy}
          onClick={() =>
            run('areas', () =>
              api.updateMap(map.id, {
                areas: areas
                  .split(',')
                  .map((a) => a.trim())
                  .filter(Boolean),
              })
            )
          }
        >
          {tr('playbook.admin.save_areas', 'Save areas')}
        </button>
        <button
          type="button"
          className={css.Button}
          disabled={!!busy}
          onClick={() => run('active', () => api.updateMap(map.id, { active: !map.active }))}
        >
          {map.active
            ? tr('playbook.admin.hide', 'Hide map')
            : tr('playbook.admin.show', 'Show map')}
        </button>
      </div>
      <div className={css.Toolbar}>
        <label className={css.Field} htmlFor="pb-admin-3">
          {tr('playbook.admin.new_slug', 'New map: id (letters and numbers)')}
          <input
            id="pb-admin-3"
            className={css.Input}
            value={slug}
            placeholder="vertigo"
            onChange={(e) => setSlug(e.target.value)}
          />
        </label>
        <label className={css.Field} htmlFor="pb-admin-4">
          {tr('playbook.admin.new_name', 'Name')}
          <input
            id="pb-admin-4"
            className={css.Input}
            value={name}
            placeholder="Vertigo"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button
          type="button"
          className={css.Button}
          disabled={!!busy || !slug || !name}
          onClick={() =>
            run('map', async () => {
              await api.addMap(slug.trim().toLowerCase(), name.trim());
              setSlug('');
              setName('');
            })
          }
        >
          {tr('playbook.admin.add_map', 'Add map')}
        </button>
      </div>
      {busy && <p className={css.Muted}>{tr('playbook.saving', 'Saving…')}</p>}
      {error && (
        <p role="alert" className={css.Error}>
          {error}
        </p>
      )}
    </div>
  );
}
