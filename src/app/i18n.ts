import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import pt from './features/translation/pt.json';
import { getLanguage } from './features/translation/language';

// blazeroom: almost everyone here is Brazilian, so the app is in Portuguese unless someone
// picks English in Settings > General. pt.json is bundled instead of fetched, so it's there on
// the first render. A string missing from it shows the English text written next to its key
// (see features/translation/tr.ts).
const language = getLanguage();

i18n
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  // for all options read: https://www.i18next.com/overview/configuration-options
  .init({
    debug: false,
    lng: language,
    fallbackLng: 'en',
    resources: {
      pt: { translation: pt },
      // The only upstream key still read with t(); the rest of the English lives in the code.
      en: {
        translation: { Organisms: { RoomCommon: { changed_room_name: ' changed room name' } } },
      },
    },
    initImmediate: false,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
  });

if (language === 'pt') {
  dayjs.locale('pt-br');
  document.documentElement.lang = 'pt-BR';
}

export default i18n;
