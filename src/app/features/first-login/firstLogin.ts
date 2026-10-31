// The server new accounts are invited to on their first login.
export const COMMUNITY_SPACE_ID = '!4-TMCNEJ7qrndlkFnowgZ8YaUtaTsY-X5fu_FJHX5ZI';

export const QUIET_ENCRYPTION_MS = 24 * 60 * 60 * 1000;

export type FirstLoginState = {
  registeredAt: number;
  communityOffered: boolean;
};

const firstLoginKey = (userId: string): string => `blazeroom_first_login:${userId}`;

export const parseFirstLogin = (raw: string | null): FirstLoginState | undefined => {
  if (!raw) return undefined;
  try {
    const { registeredAt, communityOffered } = JSON.parse(raw) ?? {};
    return typeof registeredAt === 'number' && typeof communityOffered === 'boolean'
      ? { registeredAt, communityOffered }
      : undefined;
  } catch {
    return undefined;
  }
};

// Someone who just signed up shouldn't meet a warning about recovery keys before anything else.
// The key stays one click away in the welcome card on Visão geral.
export const isEncryptionBannerQuiet = (state: FirstLoginState | undefined, now: number): boolean =>
  !!state && now - state.registeredAt < QUIET_ENCRYPTION_MS;

export const isCommunityOfferPending = (state: FirstLoginState | undefined): boolean =>
  !!state && !state.communityOffered;

export const readFirstLogin = (userId: string): FirstLoginState | undefined => {
  try {
    return parseFirstLogin(localStorage.getItem(firstLoginKey(userId)));
  } catch {
    return undefined;
  }
};

const writeFirstLogin = (userId: string, state: FirstLoginState) => {
  try {
    localStorage.setItem(firstLoginKey(userId), JSON.stringify(state));
  } catch {
    // Without storage the account just looks like an old one.
  }
};

// Written when the account is created, so accounts from before this never count as new.
export const markRegistered = (userId: string, now: number) =>
  writeFirstLogin(userId, { registeredAt: now, communityOffered: false });

export const markCommunityOffered = (userId: string) => {
  const state = readFirstLogin(userId);
  if (state) writeFirstLogin(userId, { ...state, communityOffered: true });
};
