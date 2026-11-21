export const PLAYBOOK_PATH = '/playbook/';
export const PLAYBOOK_GAME = 'cs2';

const LAST_MAP_KEY = 'blazeroom-playbook-map';

export const playbookMapPath = (map: string, search = ''): string =>
  `${PLAYBOOK_PATH}${PLAYBOOK_GAME}/${encodeURIComponent(map)}/${search ? `?${search}` : ''}`;
export const playbookNewPath = (map: string): string => `${playbookMapPath(map)}new/`;
export const playbookItemPath = (map: string, id: string): string =>
  `${playbookMapPath(map)}${encodeURIComponent(id)}/`;
export const playbookEditPath = (map: string, id: string): string =>
  `${playbookItemPath(map, id)}edit/`;

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // private mode: nothing remembered
  }
};

export const lastMap = (): string | null => read(LAST_MAP_KEY);
export const rememberMap = (map: string) => write(LAST_MAP_KEY, map);
export const savedFilters = (map: string): string | null => read(`${LAST_MAP_KEY}-filters-${map}`);
export const saveFilters = (map: string, query: string) =>
  write(`${LAST_MAP_KEY}-filters-${map}`, query);
