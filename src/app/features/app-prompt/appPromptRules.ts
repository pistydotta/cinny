import { isAndroidApp } from '../android-app/androidApp';
import { isDesktopApp } from '../desktop-download/desktopDownload';

export type PromptedApp = 'android' | 'windows';

export type AppPromptState = {
  timesShown: number;
  lastShownAt: number;
  downloaded: boolean;
};

export const RETRY_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
// So someone who doesn't want the app isn't asked every week forever.
export const MAX_SHOWINGS = 3;

export const NEW_PROMPT_STATE: AppPromptState = {
  timesShown: 0,
  lastShownAt: 0,
  downloaded: false,
};

export const appPromptKey = (userId: string): string => `blazeroom_app_prompt:${userId}`;

export const promptedApp = (userAgent: string): PromptedApp | undefined => {
  if (userAgent.includes('Android')) return isAndroidApp(userAgent) ? undefined : 'android';
  if (userAgent.includes('Windows NT')) return isDesktopApp(userAgent) ? undefined : 'windows';
  return undefined;
};

export const shouldPrompt = (state: AppPromptState, now: number): boolean =>
  !state.downloaded && state.timesShown < MAX_SHOWINGS && now - state.lastShownAt >= RETRY_AFTER_MS;

// Counted when shown, not when answered: someone who just closes the tab isn't asked on every visit.
export const recordShown = (state: AppPromptState, now: number): AppPromptState => ({
  ...state,
  timesShown: state.timesShown + 1,
  lastShownAt: now,
});

export const recordDownload = (state: AppPromptState): AppPromptState => ({
  ...state,
  downloaded: true,
});

export const parsePromptState = (raw: string | null): AppPromptState => {
  if (!raw) return NEW_PROMPT_STATE;
  try {
    const { timesShown, lastShownAt, downloaded } = JSON.parse(raw) ?? {};
    return typeof timesShown === 'number' &&
      typeof lastShownAt === 'number' &&
      typeof downloaded === 'boolean'
      ? { timesShown, lastShownAt, downloaded }
      : NEW_PROMPT_STATE;
  } catch {
    return NEW_PROMPT_STATE;
  }
};
