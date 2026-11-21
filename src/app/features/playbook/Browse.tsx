import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon, Icons } from 'folds';
import { tr } from '../translation/tr';
import {
  ALL_FILTERS,
  Filters,
  KIND_COLOR,
  KINDS,
  PlaybookItem,
  PlaybookMap,
  SIDES,
  filterItems,
  filtersFromQuery,
  filtersToQuery,
  groupByArea,
  kindLabel,
} from './model';
import { PlaybookApi } from './api';
import { Radar } from './Radar';
import { MapAdmin } from './MapAdmin';
import { useFileUrl } from './usePlaybook';
import {
  playbookItemPath,
  playbookMapPath,
  playbookNewPath,
  rememberMap,
  saveFilters,
  savedFilters,
} from './paths';
import * as css from './playbook.css';

type BrowseProps = {
  api: PlaybookApi;
  maps: PlaybookMap[];
  map: PlaybookMap;
  canManage: boolean;
  onMapsChanged: () => void;
};

const toggle = <T,>(list: T[], v: T): T[] =>
  list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

// The photo if there is one, otherwise the still the server took from the video.
function Thumb({ api, item }: { api: PlaybookApi; item: PlaybookItem }) {
  const cover = useFileUrl(api, item.cover);
  const poster = useFileUrl(api, item.cover ? null : item.video, 'poster');
  const url = cover ?? poster;
  return (
    <span className={css.Thumb}>
      {url && <img className={css.ThumbImage} src={url} alt="" loading="lazy" />}
    </span>
  );
}

export function Browse({ api, maps, map, canManage, onMapsChanged }: BrowseProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState<PlaybookItem[]>();
  const [error, setError] = useState('');
  const [hot, setHot] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);
  const search = useRef<HTMLInputElement>(null);

  const filters: Filters = useMemo(
    () => filtersFromQuery(location.search) ?? ALL_FILTERS,
    [location.search]
  );

  // A map opened without filters in the address gets the ones last used there.
  useEffect(() => {
    rememberMap(map.slug);
    if (!location.search) {
      const saved = savedFilters(map.slug);
      if (saved) navigate(playbookMapPath(map.slug, saved), { replace: true });
    }
  }, [map.slug, location.search, navigate]);

  const setFilters = (next: Filters) => {
    const q = filtersToQuery(next);
    saveFilters(map.slug, q);
    navigate(playbookMapPath(map.slug, q), { replace: true });
  };

  useEffect(() => {
    let live = true;
    setItems(undefined);
    setError('');
    api.items(map.slug).then(
      (list) => live && setItems(list),
      () =>
        live &&
        setError(tr('playbook.error.load', "Couldn't load this map. Try again in a moment."))
    );
    return () => {
      live = false;
    };
  }, [api, map.slug]);

  const shown = useMemo(() => filterItems(items ?? [], filters), [items, filters]);
  const groups = useMemo(() => groupByArea(shown, map.areas), [shown, map.areas]);
  const open = (id: string) => navigate(playbookItemPath(map.slug, id));
  const add = () => navigate(playbookNewPath(map.slug));

  // "/" jumps to the search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName);
      if (e.key === '/' && !typing) {
        e.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <div className={css.Toolbar}>
        <h1 className={css.Title}>{tr('playbook.title', 'Playbook')}</h1>
        <select
          className={css.Input}
          aria-label={tr('playbook.map', 'Map')}
          value={map.slug}
          onChange={(e) => navigate(playbookMapPath(e.target.value))}
        >
          {maps.map((m) => (
            <option key={m.id} value={m.slug}>
              {m.name}
              {m.active ? '' : ` (${tr('playbook.hidden', 'hidden')})`}
            </option>
          ))}
        </select>
        <input
          ref={search}
          className={css.Search}
          type="search"
          value={filters.query}
          placeholder={tr('playbook.search', 'Search: window, jungle…  ( / )')}
          aria-label={tr('playbook.search_label', 'Search this map')}
          onChange={(e) => setFilters({ ...filters, query: e.target.value })}
        />
        <span className={css.Grow} />
        {canManage && (
          <button type="button" className={css.Button} onClick={() => setManaging((v) => !v)}>
            <Icon size="100" src={Icons.Setting} />
            {tr('playbook.manage_map', 'Manage map')}
          </button>
        )}
        <button type="button" className={`${css.Button} ${css.Primary}`} onClick={add}>
          <Icon size="100" src={Icons.Plus} />
          {tr('playbook.add', 'Add')}
        </button>
      </div>

      <div className={css.Toolbar}>
        {SIDES.map((s) => (
          <button
            key={s}
            type="button"
            className={css.Chip}
            aria-pressed={filters.sides.includes(s)}
            onClick={() => setFilters({ ...filters, sides: toggle(filters.sides, s) })}
          >
            {s}
          </button>
        ))}
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            className={css.Chip}
            aria-pressed={filters.kinds.includes(k)}
            onClick={() => setFilters({ ...filters, kinds: toggle(filters.kinds, k) })}
          >
            <span className={css.Dot} style={{ background: KIND_COLOR[k] }} />
            {kindLabel(k)}
          </button>
        ))}
        <select
          className={css.Input}
          aria-label={tr('playbook.area', 'Area')}
          value={filters.area ?? ''}
          onChange={(e) => setFilters({ ...filters, area: e.target.value || null })}
        >
          <option value="">{tr('playbook.all_areas', 'All areas')}</option>
          {map.areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {managing && canManage && (
        <MapAdmin
          api={api}
          map={map}
          onChanged={onMapsChanged}
          onClose={() => setManaging(false)}
        />
      )}

      <div className={map.radar ? css.Browse : undefined}>
        {map.radar && (
          <div className={css.RadarColumn}>
            <Radar api={api} map={map} pins={shown} hot={hot} onHover={setHot} onPick={open} />
          </div>
        )}

        <div className={css.Section}>
          {error && <p className={css.Error}>{error}</p>}
          {!error && !items && <p className={css.Muted}>{tr('playbook.loading', 'Loading…')}</p>}
          {items && items.length === 0 && (
            <div className={css.Empty}>
              <p className={css.Muted}>
                {tr('playbook.empty_map', 'Nobody has added anything to {{map}} yet.', {
                  map: map.name,
                })}
              </p>
              <button type="button" className={`${css.Button} ${css.Primary}`} onClick={add}>
                {tr('playbook.add', 'Add')}
              </button>
            </div>
          )}
          {items && items.length > 0 && shown.length === 0 && (
            <div className={css.Empty}>
              <p className={css.Muted}>
                {tr('playbook.empty_filters', 'Nothing matches these filters.')}
              </p>
              <button type="button" className={css.Button} onClick={() => setFilters(ALL_FILTERS)}>
                {tr('playbook.clear_filters', 'Clear filters')}
              </button>
            </div>
          )}
          {groups.map((g) => (
            <section key={g.area} className={css.Section} aria-label={g.area}>
              <h2 className={css.SectionTitle}>{g.area}</h2>
              <div className={css.Cards}>
                {g.items.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    className={css.Card}
                    data-hot={hot === i.id}
                    onPointerEnter={() => setHot(i.id)}
                    onPointerLeave={() => setHot(null)}
                    onFocus={() => setHot(i.id)}
                    onClick={() => open(i.id)}
                  >
                    <Thumb api={api} item={i} />
                    <span className={css.CardName}>{i.name}</span>
                    <span className={css.CardMeta}>
                      <span className={css.Dot} style={{ background: KIND_COLOR[i.kind] }} />
                      {kindLabel(i.kind)} · {i.side}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
