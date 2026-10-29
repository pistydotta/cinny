import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import pt from './features/translation/pt.json';

// blazeroom: almost everyone here is Brazilian, so the app is in Portuguese for everyone.
// pt.json is bundled instead of fetched, so it's there on the first render. A string missing
// from it shows the English text written next to its key (see features/translation/tr.ts).
i18n
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  // for all options read: https://www.i18next.com/overview/configuration-options
  .init({
    debug: false,
    lng: 'pt',
    fallbackLng: 'en',
    resources: {
      pt: { translation: pt },
    },
    initImmediate: false,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
  });

dayjs.locale('pt-br');
document.documentElement.lang = 'pt-BR';

export default i18n;
