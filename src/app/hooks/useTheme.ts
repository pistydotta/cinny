import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { forgeRadii, onDarkFontWeight, onLightFontWeight } from '../../config.css';
import { forgeDarkTheme, forgeLightTheme } from '../../colors.css';
import { DARK_THEME_ID, LIGHT_THEME_ID, resolveThemeId } from '../features/forge-theme/themeMode';
import { tr } from '../features/translation/tr';
import { settingsAtom } from '../state/settings';
import { useSetting } from '../state/hooks/settings';

export enum ThemeKind {
  Light = 'light',
  Dark = 'dark',
}

export type Theme = {
  id: string;
  kind: ThemeKind;
  classNames: string[];
};

// Forge is the only look, in a light and a dark mode. The ids and the `dark-theme` class are
// the old Cinny ones: saved settings and the name colours in index.css still key on them.
export const LightTheme: Theme = {
  id: LIGHT_THEME_ID,
  kind: ThemeKind.Light,
  classNames: ['light-theme', forgeLightTheme, forgeRadii, onLightFontWeight, 'prism-light'],
};

export const DarkTheme: Theme = {
  id: DARK_THEME_ID,
  kind: ThemeKind.Dark,
  classNames: ['dark-theme', forgeDarkTheme, forgeRadii, onDarkFontWeight, 'prism-dark'],
};

export const useThemes = (): Theme[] => {
  const themes: Theme[] = useMemo(() => [LightTheme, DarkTheme], []);

  return themes;
};

export const useThemeNames = (): Record<string, string> =>
  useMemo(
    () => ({
      [LightTheme.id]: tr('forge.light', 'Light'),
      [DarkTheme.id]: tr('forge.dark', 'Dark'),
    }),
    []
  );

export const useSystemThemeKind = (): ThemeKind => {
  const darkModeQueryList = useMemo(() => window.matchMedia('(prefers-color-scheme: dark)'), []);
  const [themeKind, setThemeKind] = useState<ThemeKind>(
    darkModeQueryList.matches ? ThemeKind.Dark : ThemeKind.Light
  );

  useEffect(() => {
    const handleMediaQueryChange = () => {
      setThemeKind(darkModeQueryList.matches ? ThemeKind.Dark : ThemeKind.Light);
    };

    darkModeQueryList.addEventListener('change', handleMediaQueryChange);
    return () => {
      darkModeQueryList.removeEventListener('change', handleMediaQueryChange);
    };
  }, [darkModeQueryList, setThemeKind]);

  return themeKind;
};

export const useActiveTheme = (): Theme => {
  const systemThemeKind = useSystemThemeKind();
  const [systemTheme] = useSetting(settingsAtom, 'useSystemTheme');
  const [themeId] = useSetting(settingsAtom, 'themeId');

  if (!systemTheme) {
    return resolveThemeId(themeId) === DARK_THEME_ID ? DarkTheme : LightTheme;
  }

  return systemThemeKind === ThemeKind.Dark ? DarkTheme : LightTheme;
};

const ThemeContext = createContext<Theme | null>(null);
export const ThemeContextProvider = ThemeContext.Provider;

export const useTheme = (): Theme => {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('No theme provided!');
  }

  return theme;
};
