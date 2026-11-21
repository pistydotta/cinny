import { tr } from '../translation/tr';

// The API's lists (api/src/playbook/rules.js): change both together.
export const KINDS = ['smoke', 'flash', 'molotov', 'he', 'bang', 'execute', 'spot'] as const;
export type Kind = typeof KINDS[number];
export const SIDES = ['T', 'CT'] as const;
export type Side = typeof SIDES[number];
export const TECHNIQUES = [
  'jumpthrow',
  'left',
  'right',
  'middle',
  'run_jump',
  'walk',
  'crouch',
  'other',
] as const;
export type Technique = typeof TECHNIQUES[number];

export type Point = { x: number; y: number };

export type PlaybookMap = {
  id: string;
  game: string;
  slug: string;
  name: string;
  areas: string[];
  radar: string | null;
  sortOrder: number;
  active: boolean;
};

export type PlaybookItem = {
  id: string;
  mapId: string;
  kind: Kind;
  side: Side;
  area: string;
  name: string;
  technique: Technique | null;
  techniqueNote: string | null;
  fromLabel: string | null;
  note: string | null;
  video: string;
  // The photo shown before the video: where it's done, usually with the description on it.
  cover: string | null;
  stand: string | null;
  aim: string | null;
  result: string | null;
  from: Point | null;
  to: Point | null;
  author: string;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
};

// Colour says only what was thrown, the same in dots, pins and chips. Side is never a colour.
export const KIND_COLOR: Record<Kind, string> = {
  smoke: '#9aa9b8',
  flash: '#f2c94c',
  molotov: '#f08a3c',
  he: '#6fbf5a',
  bang: '#e85d75',
  execute: '#4fb3d9',
  spot: '#a78bfa',
};

export const kindLabel = (kind: Kind): string =>
  ({
    smoke: tr('playbook.kind.smoke', 'Smoke'),
    flash: tr('playbook.kind.flash', 'Flash'),
    molotov: tr('playbook.kind.molotov', 'Molotov'),
    he: tr('playbook.kind.he', 'HE'),
    bang: tr('playbook.kind.bang', 'Wallbang'),
    execute: tr('playbook.kind.execute', 'Execute'),
    spot: tr('playbook.kind.spot', 'Spot'),
  }[kind]);

export const techniqueLabel = (t: Technique): string =>
  ({
    jumpthrow: tr('playbook.technique.jumpthrow', 'Jumpthrow'),
    left: tr('playbook.technique.left', 'Left click'),
    right: tr('playbook.technique.right', 'Right click'),
    middle: tr('playbook.technique.middle', 'Both buttons'),
    run_jump: tr('playbook.technique.run_jump', 'Run + jump'),
    walk: tr('playbook.technique.walk', 'Walk + throw'),
    crouch: tr('playbook.technique.crouch', 'Crouch + throw'),
    other: tr('playbook.technique.other', 'Other'),
  }[t]);

// How it's done and from where ("Jumpthrow, from T spawn"), or '' when nobody said.
export const howText = (item: PlaybookItem): string => {
  const how =
    item.technique && item.technique !== 'other'
      ? techniqueLabel(item.technique)
      : item.techniqueNote ?? '';
  if (!item.fromLabel) return how;
  if (!how) return tr('playbook.from_only', 'From {{place}}', { place: item.fromLabel });
  return tr('playbook.how_from', '{{how}}, from {{place}}', { how, place: item.fromLabel });
};

export type Filters = {
  sides: Side[];
  kinds: Kind[];
  area: string | null;
  query: string;
};

export const ALL_FILTERS: Filters = { sides: [...SIDES], kinds: [...KINDS], area: null, query: '' };

// "janela" finds "Janela", and "fogao" finds "fogão".
export const fold = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const filterItems = (items: PlaybookItem[], f: Filters): PlaybookItem[] => {
  const q = fold(f.query.trim());
  return items.filter(
    (i) =>
      f.sides.includes(i.side) &&
      f.kinds.includes(i.kind) &&
      (!f.area || i.area === f.area) &&
      (!q ||
        fold([i.name, i.fromLabel ?? '', i.note ?? '', i.techniqueNote ?? ''].join(' ')).includes(
          q
        ))
  );
};

// In the map's own area order; areas the map no longer lists go last.
export const groupByArea = (
  items: PlaybookItem[],
  areas: string[]
): { area: string; items: PlaybookItem[] }[] => {
  const order = [...areas, ...items.map((i) => i.area).filter((a) => !areas.includes(a))];
  return [...new Set(order)]
    .map((area) => ({
      area,
      items: items
        .filter((i) => i.area === area)
        .sort((a, b) => a.name.localeCompare(b.name, 'pt')),
    }))
    .filter((g) => g.items.length > 0);
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export const pointIn = (
  rect: { left: number; top: number; width: number; height: number },
  x: number,
  y: number
): Point => ({
  x: clamp01((x - rect.left) / rect.width),
  y: clamp01((y - rect.top) / rect.height),
});

// Filters in the address, so a filtered view can be sent as a link.
export const filtersToQuery = (f: Filters): string => {
  const p = new URLSearchParams();
  if (f.sides.length !== SIDES.length) p.set('side', f.sides.join(','));
  if (f.kinds.length !== KINDS.length) p.set('kind', f.kinds.join(','));
  if (f.area) p.set('area', f.area);
  if (f.query) p.set('q', f.query);
  return p.toString();
};

export const filtersFromQuery = (search: string): Filters | null => {
  const p = new URLSearchParams(search);
  if (![...p.keys()].some((k) => ['side', 'kind', 'area', 'q'].includes(k))) return null;
  const list = <T extends string>(value: string | null, all: readonly T[]): T[] =>
    value === null
      ? [...all]
      : (value.split(',').filter((v) => (all as readonly string[]).includes(v)) as T[]);
  return {
    sides: list(p.get('side'), SIDES),
    kinds: list(p.get('kind'), KINDS),
    area: p.get('area'),
    query: p.get('q') ?? '',
  };
};
