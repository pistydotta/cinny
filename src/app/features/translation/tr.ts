import i18n from 'i18next';

export type TrValues = Record<string, string | number>;

export const fillValues = (text: string, values?: TrValues): string =>
  values
    ? text.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
        name in values ? String(values[name]) : match
      )
    : text;

// UI text in the app's language (src/app/i18n.ts). `en` is the English text: it shows when
// pt.json has no translation for `key`, and in tests, where i18n isn't started.
export const tr = (key: string, en: string, values?: TrValues): string =>
  i18n.isInitialized
    ? (i18n.t(key, { ...values, defaultValue: en }) as string)
    : fillValues(en, values);
