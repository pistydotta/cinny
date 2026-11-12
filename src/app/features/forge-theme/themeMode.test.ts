import { describe, expect, it } from 'vitest';
import { modeFromSettings, resolveThemeId, settingsForMode } from './themeMode';

describe('resolveThemeId', () => {
  it('keeps the two current ids', () => {
    expect(resolveThemeId('light-theme')).toBe('light-theme');
    expect(resolveThemeId('dark-theme')).toBe('dark-theme');
  });
  it('maps the removed themes by kind', () => {
    expect(resolveThemeId('silver-theme')).toBe('light-theme');
    expect(resolveThemeId('butter-theme')).toBe('dark-theme');
  });
  it('falls back to light for missing or unknown ids', () => {
    expect(resolveThemeId(undefined)).toBe('light-theme');
    expect(resolveThemeId('nope')).toBe('light-theme');
  });
});

describe('modeFromSettings', () => {
  it('is system whenever the system switch is on', () => {
    expect(modeFromSettings({ useSystemTheme: true, themeId: 'dark-theme' })).toBe('system');
  });
  it('reads the saved theme otherwise', () => {
    expect(modeFromSettings({ useSystemTheme: false, themeId: 'butter-theme' })).toBe('dark');
    expect(modeFromSettings({ useSystemTheme: false, themeId: 'silver-theme' })).toBe('light');
    expect(modeFromSettings({ useSystemTheme: false })).toBe('light');
  });
});

describe('settingsForMode', () => {
  it('round-trips each mode', () => {
    (['system', 'light', 'dark'] as const).forEach((mode) =>
      expect(modeFromSettings(settingsForMode(mode))).toBe(mode)
    );
  });
  it('leaves the saved theme alone for system', () => {
    expect(settingsForMode('system')).toEqual({ useSystemTheme: true, themeId: undefined });
  });
});
