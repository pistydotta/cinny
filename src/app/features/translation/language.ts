export type Language = 'pt' | 'en';

const LANGUAGE_KEY = 'blazeroom_language';

// The app's language, chosen in Settings > General and saved per browser. Portuguese unless
// someone picked English.
export const getLanguage = (): Language => {
  try {
    return localStorage.getItem(LANGUAGE_KEY) === 'en' ? 'en' : 'pt';
  } catch {
    return 'pt';
  }
};

export const saveLanguage = (language: Language) => {
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // Without storage the choice only lasts until the page reloads.
  }
};
