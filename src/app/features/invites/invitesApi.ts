import { ApiError, createApiRequest } from '../../utils/blazeroomApi';
import { tr } from '../translation/tr';

// `uses: null` means no limit (admins only).
export type InviteChoice = { uses: number | null; minutes: number };

export type Invite = {
  token: string;
  link: string;
  usesAllowed: number | null;
  used: number;
  createdAt: string;
  expiresAt: string;
};

// What GET /api/invites returns. perDay and remaining are null for admins (no limit).
export type InvitesInfo = {
  perDay: number | null;
  remaining: number | null;
  options: { uses: (number | null)[]; minutes: number[] };
  defaults: InviteChoice;
  invites: Invite[];
};

export type CreatedInvite = Invite & { remaining: number | null };

// Sign-up links for people who aren't on blazeroom yet (api/src/inviteRoutes.js).
export const createInvitesApi = (
  getToken: () => string | null,
  fetchImpl: typeof fetch = (...args) => fetch(...args)
) => {
  const request = createApiRequest(getToken, fetchImpl);

  return {
    async info(): Promise<InvitesInfo> {
      const res = await request('/api/invites', 'GET');
      return (await res.json()) as InvitesInfo;
    },
    async create(choice: InviteChoice): Promise<CreatedInvite> {
      const res = await request('/api/invites', 'POST', choice);
      return (await res.json()) as CreatedInvite;
    },
    async revoke(token: string): Promise<void> {
      await request(`/api/invites/${encodeURIComponent(token)}`, 'DELETE');
    },
  };
};

export const inviteErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    if (error.code === 'daily_limit') {
      return tr('invites.error.daily_limit', "That's more people than you have left today.");
    }
    if (error.code === 'invalid_option') {
      return tr('invites.error.invalid_option', "That option isn't available to you.");
    }
    if (error.code === 'no_such_invite') {
      return tr('invites.error.no_such_invite', 'That link was already revoked.');
    }
    if (error.code === 'network') return tr('invites.error.network', "Couldn't reach the server.");
  }
  return tr('common.went_wrong', 'Something went wrong. Try again in a moment.');
};

export const usesLabel = (uses: number | null): string => {
  if (uses === null) return tr('invites.no_limit', 'No limit');
  return uses === 1
    ? tr('invites.one_person', '1 person')
    : tr('invites.n_people', '{{n}} people', { n: uses });
};

export const minutesLabel = (minutes: number): string => {
  if (minutes < 60) return tr('invites.n_minutes', '{{n}} minutes', { n: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return hours === 1
      ? tr('invites.one_hour', '1 hour')
      : tr('invites.n_hours', '{{n}} hours', { n: hours });
  }
  const days = Math.round(hours / 24);
  return days === 1
    ? tr('invites.one_day', '1 day')
    : tr('invites.n_days', '{{n}} days', { n: days });
};

// "expires in 3 hours", "expires in 2 days"; under a minute counts as a minute.
export const expiresInLabel = (expiresAt: string, now = Date.now()): string => {
  const minutes = Math.max(1, Math.round((Date.parse(expiresAt) - now) / 60_000));
  if (minutes < 60) return tr('invites.expires_in_min', 'expires in {{n}} min', { n: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 48) {
    return hours === 1
      ? tr('invites.expires_in_hour', 'expires in 1 hour')
      : tr('invites.expires_in_hours', 'expires in {{n}} hours', { n: hours });
  }
  return tr('invites.expires_in_days', 'expires in {{n}} days', { n: Math.round(hours / 24) });
};

export const usageLabel = ({ used, usesAllowed }: Pick<Invite, 'used' | 'usesAllowed'>): string => {
  if (usesAllowed === null) return tr('invites.n_joined', '{{used}} joined', { used });
  if (used >= usesAllowed) return tr('invites.used_up', 'Used up');
  return tr('invites.n_of_m_joined', '{{used}} of {{usesAllowed}} joined', { used, usesAllowed });
};

export const inviteShareText = (
  invite: Pick<Invite, 'link' | 'usesAllowed' | 'expiresAt'>
): string => {
  const until = new Date(invite.expiresAt).toLocaleString();
  return invite.usesAllowed === 1
    ? tr(
        'invites.share_once',
        'Join me on blazeroom: {{link}}\nIt works once and expires {{until}}.',
        {
          link: invite.link,
          until,
        }
      )
    : tr(
        'invites.share_group',
        'Join me on blazeroom: {{link}}\nIt works for a group and expires {{until}}.',
        { link: invite.link, until }
      );
};
