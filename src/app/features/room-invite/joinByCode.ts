import type { Redeemed, RedeemInput } from './roomCodesApi';

type Redeem = (input: RedeemInput) => Promise<Redeemed>;

// Redeems a code or link and joins what it opens. A room inside a space you aren't in comes
// with the space's invite first: join the space, then redeem again for the room's invite.
export const redeemAndJoin = async (
  redeem: Redeem,
  join: (roomId: string) => Promise<unknown>,
  input: RedeemInput
): Promise<Redeemed> => {
  let answer = await redeem(input);
  if (answer.spaceId) {
    await join(answer.spaceId);
    answer = await redeem(input);
    if (answer.spaceId) throw new Error('the space is still needed');
  }
  if (!answer.joined) await join(answer.roomId);
  return answer;
};
