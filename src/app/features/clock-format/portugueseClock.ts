import { getLanguage, Language } from '../translation/language';

const SETTINGS_KEY = 'settings';
const DONE_KEY = 'blazeroom_clock24_default';

// Cinny starts everyone on a 12-hour clock ("03:07 PM"), which reads as foreign in Brazil.
// Once per browser, someone using the app in Portuguese is moved to the 24-hour clock. It runs
// only once, so switching back in Settings sticks. English keeps Cinny's default.
export const migratePortugueseClock = (language?: Language, storage?: Storage): void => {
  try {
    const store = storage ?? localStorage;
    if (store.getItem(DONE_KEY) !== null) return;
    if ((language ?? getLanguage()) !== 'pt') return;
    const saved = store.getItem(SETTINGS_KEY);
    const settings = saved ? JSON.parse(saved) : {};
    store.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, hour24Clock: true }));
    store.setItem(DONE_KEY, '1');
  } catch {
    // Without storage (or with unreadable settings) Cinny's default stays.
  }
};
