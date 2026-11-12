export type ThemeMode = 'system' | 'light' | 'dark';

export const LIGHT_THEME_ID = 'light-theme';
export const DARK_THEME_ID = 'dark-theme';

// Silver and Butter were removed with the Forge redesign; a browser that saved one keeps its kind.
export function resolveThemeId(
  saved: string | undefined
): typeof LIGHT_THEME_ID | typeof DARK_THEME_ID {
  if (saved === DARK_THEME_ID || saved === 'butter-theme') return DARK_THEME_ID;
  return LIGHT_THEME_ID;
}

export function modeFromSettings(s: { useSystemTheme: boolean; themeId?: string }): ThemeMode {
  if (s.useSystemTheme) return 'system';
  return resolveThemeId(s.themeId) === DARK_THEME_ID ? 'dark' : 'light';
}

export function settingsForMode(mode: ThemeMode): {
  useSystemTheme: boolean;
  themeId: string | undefined;
} {
  if (mode === 'system') return { useSystemTheme: true, themeId: undefined };
  return { useSystemTheme: false, themeId: mode === 'dark' ? DARK_THEME_ID : LIGHT_THEME_ID };
}
