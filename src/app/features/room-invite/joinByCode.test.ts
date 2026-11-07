import { describe, expect, it, vi } from 'vitest';
import { redeemAndJoin } from './joinByCode';

describe('redeemAndJoin', () => {
  it('joins the room the code opens', async () => {
    const join = vi.fn().mockResolvedValue(undefined);
    const redeem = vi.fn().mockResolvedValue({ roomId: '!r', name: 'Geral' });
    expect(await redeemAndJoin(redeem, join, { code: '1234' })).toEqual({
      roomId: '!r',
      name: 'Geral',
    });
    expect(join.mock.calls).toEqual([['!r']]);
  });

  it('joins the space first, then asks again for the room', async () => {
    const join = vi.fn().mockResolvedValue(undefined);
    const redeem = vi
      .fn()
      .mockResolvedValueOnce({ roomId: '!r', name: 'Geral', spaceId: '!s' })
      .mockResolvedValueOnce({ roomId: '!r', name: 'Geral' });
    await redeemAndJoin(redeem, join, { link: 'x' });
    expect(join.mock.calls).toEqual([['!s'], ['!r']]);
    expect(redeem).toHaveBeenCalledTimes(2);
  });

  it("doesn't join again when already in", async () => {
    const join = vi.fn();
    const redeem = vi.fn().mockResolvedValue({ roomId: '!r', name: null, joined: true });
    await redeemAndJoin(redeem, join, { code: '1234' });
    expect(join).not.toHaveBeenCalled();
  });
});
