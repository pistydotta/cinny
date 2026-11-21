import { describe, expect, it } from 'vitest';
import {
  ALL_FILTERS,
  PlaybookItem,
  filterItems,
  filtersFromQuery,
  filtersToQuery,
  groupByArea,
  howText,
  pointIn,
} from './model';

const item = (over: Partial<PlaybookItem>): PlaybookItem => ({
  id: 'x',
  mapId: 'cs2-mirage',
  kind: 'smoke',
  side: 'T',
  area: 'Mid',
  name: 'Smoke janela',
  technique: 'jumpthrow',
  techniqueNote: null,
  fromLabel: 'spawn T',
  note: null,
  video: 'v',
  cover: null,
  stand: 's',
  aim: 'a',
  result: null,
  from: { x: 0.5, y: 0.9 },
  to: { x: 0.4, y: 0.4 },
  author: '@ana:blazeroom.com.br',
  createdAt: '',
  updatedAt: '',
  canEdit: false,
  ...over,
});

const items = [
  item({ id: '1', name: 'Smoke janela' }),
  item({ id: '2', name: 'Flash palácio', kind: 'flash', area: 'A' }),
  item({ id: '3', name: 'Smoke apts', side: 'CT', area: 'B', note: 'Cobre o fogão' }),
  item({ id: '4', name: 'Molotov firebox', kind: 'molotov', area: 'A' }),
  item({ id: '5', name: 'Old spot', kind: 'spot', area: 'Connector', to: null }),
];

describe('filterItems', () => {
  it('keeps everything with no filters', () => {
    expect(filterItems(items, ALL_FILTERS)).toHaveLength(5);
  });

  it('filters by side, kind and area together', () => {
    expect(
      filterItems(items, { ...ALL_FILTERS, sides: ['T'], kinds: ['smoke', 'flash'] }).map(
        (i) => i.id
      )
    ).toEqual(['1', '2']);
    expect(filterItems(items, { ...ALL_FILTERS, area: 'A' }).map((i) => i.id)).toEqual(['2', '4']);
  });

  it('searches name and note ignoring case and accents', () => {
    expect(filterItems(items, { ...ALL_FILTERS, query: 'PALACIO' }).map((i) => i.id)).toEqual([
      '2',
    ]);
    expect(filterItems(items, { ...ALL_FILTERS, query: 'fogao' }).map((i) => i.id)).toEqual(['3']);
    expect(filterItems(items, { ...ALL_FILTERS, query: 'spawn' })).toHaveLength(5);
  });
});

describe('groupByArea', () => {
  it("follows the map's area order, sorts by name, and puts unknown areas last", () => {
    const groups = groupByArea(items, ['A', 'Mid', 'B']);
    expect(groups.map((g) => g.area)).toEqual(['A', 'Mid', 'B', 'Connector']);
    expect(groups[0].items.map((i) => i.name)).toEqual(['Flash palácio', 'Molotov firebox']);
  });

  it('leaves out empty areas', () => {
    expect(groupByArea([items[0]], ['A', 'Mid', 'B']).map((g) => g.area)).toEqual(['Mid']);
  });
});

describe('filters in the address', () => {
  it('round-trips and stays empty when nothing is filtered', () => {
    expect(filtersToQuery(ALL_FILTERS)).toBe('');
    expect(filtersFromQuery('')).toBeNull();
    const f = { sides: ['CT' as const], kinds: ['smoke' as const], area: 'B', query: 'apts' };
    expect(filtersFromQuery(filtersToQuery(f))).toEqual(f);
  });

  it('drops values it does not know', () => {
    expect(filtersFromQuery('kind=smoke,decoy')?.kinds).toEqual(['smoke']);
  });
});

describe('radar points', () => {
  it('are 0–1 of the radar and clamped to it', () => {
    const rect = { left: 100, top: 50, width: 200, height: 200 };
    expect(pointIn(rect, 200, 150)).toEqual({ x: 0.5, y: 0.5 });
    expect(pointIn(rect, 0, 400)).toEqual({ x: 0, y: 1 });
  });
});

describe('howText', () => {
  it('names the throw and where from, or what was written, or nothing', () => {
    expect(howText(items[0])).toBe('Jumpthrow, from spawn T');
    expect(howText(item({ technique: null, techniqueNote: 'AWP', fromLabel: null }))).toBe('AWP');
    expect(howText(item({ technique: null, fromLabel: 'meio' }))).toBe('From meio');
    expect(howText(item({ technique: null, fromLabel: null }))).toBe('');
  });
});
