import { describe, expect, it } from 'vitest';
import {
  MAX_SHOWINGS,
  NEW_PROMPT_STATE,
  RETRY_AFTER_MS,
  appPromptKey,
  parsePromptState,
  promptedApp,
  recordDownload,
  recordShown,
  shouldPrompt,
} from './appPromptRules';

const CHROME_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const DESKTOP_APP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Blazeroom/0.1.0 Chrome/140.0.0.0 Electron/45.1.0 Safari/537.36';
const CHROME_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';
const ANDROID_APP = `${CHROME_ANDROID} BlazeroomAndroid/1.0`;
const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const SAFARI_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';

const NOW = 1_800_000_000_000;

describe('promptedApp', () => {
  it('offers the app for the browser the person is in', () => {
    expect(promptedApp(CHROME_ANDROID)).toBe('android');
    expect(promptedApp(CHROME_WINDOWS)).toBe('windows');
  });

  it('offers nothing inside our apps', () => {
    expect(promptedApp(ANDROID_APP)).toBeUndefined();
    expect(promptedApp(DESKTOP_APP)).toBeUndefined();
  });

  it('offers nothing where there is no app yet', () => {
    expect(promptedApp(SAFARI_IPHONE)).toBeUndefined();
    expect(promptedApp(SAFARI_MAC)).toBeUndefined();
  });
});

describe('shouldPrompt', () => {
  it('shows the first time', () => {
    expect(shouldPrompt(NEW_PROMPT_STATE, NOW)).toBe(true);
  });

  it('waits a week after being shown, even if nobody answered', () => {
    const shown = recordShown(NEW_PROMPT_STATE, NOW);
    expect(shouldPrompt(shown, NOW)).toBe(false);
    expect(shouldPrompt(shown, NOW + RETRY_AFTER_MS - 1)).toBe(false);
    expect(shouldPrompt(shown, NOW + RETRY_AFTER_MS)).toBe(true);
  });

  it('never shows again after a download', () => {
    const state = recordDownload(recordShown(NEW_PROMPT_STATE, NOW));
    expect(shouldPrompt(state, NOW + RETRY_AFTER_MS * 10)).toBe(false);
  });

  it('gives up after the last showing', () => {
    let state = NEW_PROMPT_STATE;
    for (let i = 0; i < MAX_SHOWINGS; i += 1) {
      expect(shouldPrompt(state, NOW + RETRY_AFTER_MS * i)).toBe(true);
      state = recordShown(state, NOW + RETRY_AFTER_MS * i);
    }
    expect(shouldPrompt(state, NOW + RETRY_AFTER_MS * 100)).toBe(false);
  });
});

describe('parsePromptState', () => {
  it('reads back what was saved', () => {
    const state = recordShown(NEW_PROMPT_STATE, NOW);
    expect(parsePromptState(JSON.stringify(state))).toEqual(state);
  });

  it('starts over when nothing usable was saved', () => {
    expect(parsePromptState(null)).toEqual(NEW_PROMPT_STATE);
    expect(parsePromptState('not json')).toEqual(NEW_PROMPT_STATE);
    expect(parsePromptState('null')).toEqual(NEW_PROMPT_STATE);
    expect(parsePromptState('{"timesShown":"two"}')).toEqual(NEW_PROMPT_STATE);
  });
});

describe('appPromptKey', () => {
  it('is different for each user', () => {
    expect(appPromptKey('@ana:x')).not.toBe(appPromptKey('@bia:x'));
  });
});
