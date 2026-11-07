import { ApiError, createApiRequest } from '../../utils/blazeroomApi';
import { tr } from '../translation/tr';

// `uses: null` means anyone with the code until it expires.
export type RoomCodeChoice = { minutes: number; uses: number | null };

export type RoomCode = {
  code: string;
  linkToken: string;
  link: string;
  roomId: string;
  createdAt: string;
  expiresAt: string;
  usesAllowed: number | null;
  uses: number;
};

export type RoomCodesInfo = {
  options: { minutes: number[]; uses: (number | null)[] };
  defaults: RoomCodeChoice;
  codes: RoomCode[];
};

// What redeeming answers. With `spaceId`, the room is inside a space you aren't in yet: you've
// been invited to the space, and must join it and redeem again to get the room's invite.
export type Redeemed = {
  roomId: string;
  name: string | null;
  joined?: boolean;
  spaceId?: string;
  spaceName?: string | null;
};

export type RedeemInput = { code: string } | { link: string };

// Invite codes and links for rooms and spaces (api/src/roomCodeRoutes.js).
export const createRoomCodesApi = (
  getToken: () => string | null,
  fetchImpl: typeof fetch = (...args) => fetch(...args)
) => {
  const request = createApiRequest(getToken, fetchImpl);

  return {
    async info(roomId: string): Promise<RoomCodesInfo> {
      const res = await request(`/api/room-codes?roomId=${encodeURIComponent(roomId)}`, 'GET');
      return (await res.json()) as RoomCodesInfo;
    },
    async create(roomId: string, choice: RoomCodeChoice): Promise<RoomCode> {
      const res = await request('/api/room-codes', 'POST', { roomId, ...choice });
      return (await res.json()) as RoomCode;
    },
    async revoke(linkToken: string): Promise<void> {
      await request(`/api/room-codes/${encodeURIComponent(linkToken)}`, 'DELETE');
    },
    async redeem(input: RedeemInput): Promise<Redeemed> {
      const res = await request('/api/room-codes/redeem', 'POST', input);
      return (await res.json()) as Redeemed;
    },
  };
};

// Digits only, at most four: what the code field keeps of what was typed or pasted.
export const cleanCode = (input: string): string => input.replace(/\D/g, '').slice(0, 4);

// The link token from a pasted invite link, or undefined if it isn't one.
export const linkTokenFrom = (input: string): string | undefined => {
  const match = input.trim().match(/[?&]link=([A-Za-z0-9]{16,64})(?:$|[&#])/);
  return match?.[1];
};

export const roomCodeErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'no_such_code':
        return tr('room_codes.error.no_such_code', "That code doesn't exist or has expired.");
      case 'invalid_code':
        return tr('room_codes.error.invalid_code', 'Type the four digits of the code.');
      case 'too_many_attempts':
        return tr(
          'room_codes.error.too_many_attempts',
          'Too many wrong codes. Try again in an hour.'
        );
      case 'code_unavailable':
        return tr(
          'room_codes.error.code_unavailable',
          "That invite doesn't work anymore. Ask for a new one."
        );
      case 'banned':
        return tr('room_codes.error.banned', "You're banned from there.");
      case 'cannot_invite':
        return tr('room_codes.error.cannot_invite', "You can't invite people here.");
      case 'too_many_codes':
        return tr(
          'room_codes.error.too_many_codes',
          'You have too many active codes. Revoke one first.'
        );
      case 'network':
        return tr('invites.error.network', "Couldn't reach the server.");
      default:
    }
  }
  return tr('common.went_wrong', 'Something went wrong. Try again in a moment.');
};

export const codeUsesLabel = ({ uses, usesAllowed }: Pick<RoomCode, 'uses' | 'usesAllowed'>) =>
  usesAllowed === null
    ? tr('room_codes.n_used', 'used by {{n}}', { n: uses })
    : tr('room_codes.n_of_m_used', '{{n}} of {{m}} used', { n: uses, m: usesAllowed });
