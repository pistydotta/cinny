import { describe, expect, it, vi } from 'vitest';
import {
  cleanCode,
  codeUsesLabel,
  createRoomCodesApi,
  linkTokenFrom,
  roomCodeErrorMessage,
} from './roomCodesApi';
import { ApiError } from '../../utils/blazeroomApi';

const respond = (status: number, body?: unknown) =>
  vi
    .fn()
    .mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status }));

describe('createRoomCodesApi', () => {
  it('lists by room, creates with the choice and redeems a code', async () => {
    const infoFetch = respond(200, { codes: [] });
    await createRoomCodesApi(() => 'tok', infoFetch).info('!r:blz');
    expect(infoFetch.mock.calls[0][0]).toBe('/api/room-codes?roomId=!r%3Ablz');

    const createFetch = respond(201, { code: '0420' });
    await createRoomCodesApi(() => 'tok', createFetch).create('!r:blz', {
      minutes: 60,
      uses: null,
    });
    expect(JSON.parse(createFetch.mock.calls[0][1].body)).toEqual({
      roomId: '!r:blz',
      minutes: 60,
      uses: null,
    });

    const redeemFetch = respond(200, { roomId: '!r:blz', name: 'Geral' });
    expect(await createRoomCodesApi(() => 'tok', redeemFetch).redeem({ code: '0420' })).toEqual({
      roomId: '!r:blz',
      name: 'Geral',
    });
  });

  it('rejects with the API error code', async () => {
    const api = createRoomCodesApi(() => 'tok', respond(404, { error: 'no_such_code' }));
    await expect(api.redeem({ code: '1111' })).rejects.toMatchObject({ code: 'no_such_code' });
  });
});

describe('code input', () => {
  it('keeps up to four digits', () => {
    expect(cleanCode(' 12-3a45 ')).toBe('1234');
  });

  it('takes the token out of a pasted link', () => {
    expect(linkTokenFrom('https://x.br/home/join/?link=AbCdEfGh23456789xyzw')).toBe(
      'AbCdEfGh23456789xyzw'
    );
    expect(linkTokenFrom('1234')).toBeUndefined();
  });
});

describe('labels', () => {
  it('describes uses and errors', () => {
    expect(codeUsesLabel({ uses: 2, usesAllowed: null })).toBe('used by 2');
    expect(codeUsesLabel({ uses: 1, usesAllowed: 5 })).toBe('1 of 5 used');
    expect(roomCodeErrorMessage(new ApiError('too_many_attempts', 429))).toMatch(/hour/);
  });
});
