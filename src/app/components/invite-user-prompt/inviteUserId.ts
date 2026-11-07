import { isUserId } from '../../utils/matrix';

// Accepts "ana", "@ana" or a full "@ana:server" and returns the full user ID, or undefined if
// the input can't be one. A name without a server belongs to our own homeserver.
export const resolveInviteUserId = (input: string, homeserver: string): string | undefined => {
  const value = input.trim();
  if (!value) return undefined;
  if (value.includes(':')) return isUserId(value) ? value : undefined;

  const localpart = value.startsWith('@') ? value.slice(1) : value;
  const userId = `@${localpart.toLowerCase()}:${homeserver}`;
  return localpart && isUserId(userId) ? userId : undefined;
};

// Synapse accepts invites for local usernames nobody registered, so the dialog looks the
// profile up first. Only "not found" means missing: any other error lets the invite try.
export const isMissingUserError = (e: unknown): boolean => {
  const err = e as { errcode?: string; httpStatus?: number } | undefined;
  return err?.errcode === 'M_NOT_FOUND' || err?.httpStatus === 404;
};

// Search term for the suggestions: the name without "@" or the server.
export const inviteSearchTerm = (input: string): string => {
  const value = input.trim();
  const name = value.startsWith('@') ? value.slice(1) : value;
  return name.split(':')[0];
};
