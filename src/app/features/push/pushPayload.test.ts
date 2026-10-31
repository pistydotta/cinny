import { describe, expect, it } from 'vitest';
import { callRingNotification, pushNotification } from './pushPayload';

const base = { event_id: '$e', room_id: '!r:x', sender_display_name: 'Ana', room_name: 'Geral' };

describe('pushNotification', () => {
  it('ignores a push with no event, like an unread count update', () => {
    expect(pushNotification({ room_id: '!r:x', unread: 2 })).toBeNull();
    expect(pushNotification(null)).toBeNull();
  });

  it('shows who wrote and where when the message is encrypted', () => {
    const shown = pushNotification({ ...base, type: 'm.room.encrypted', lang: 'pt' });
    expect(shown?.title).toBe('Geral');
    expect(shown?.body).toBe('Ana: nova mensagem');
    expect(shown?.tag).toBe('$e');
    expect(shown?.data).toEqual({ roomId: '!r:x', eventId: '$e' });
  });

  it('shows the text of an unencrypted message', () => {
    const content = { msgtype: 'm.text', body: 'oi' };
    expect(pushNotification({ ...base, content, lang: 'pt' })?.body).toBe('Ana: oi');
  });

  it('keeps the text of a direct message as it was written', () => {
    const { room_name: roomName, ...direct } = base;
    expect(roomName).toBe('Geral');
    const content = { msgtype: 'm.text', body: 'oi' };
    expect(pushNotification({ ...direct, content })?.body).toBe('oi');
  });

  it('shows no ciphertext from an encrypted message', () => {
    const content = { algorithm: 'm.megolm.v1.aes-sha2', ciphertext: 'abc' };
    const shown = pushNotification({ ...base, type: 'm.room.encrypted', content, lang: 'pt' });
    expect(shown?.body).toBe('Ana: nova mensagem');
  });

  it('titles a direct message with the sender', () => {
    const { room_name: roomName, ...direct } = base;
    expect(roomName).toBe('Geral');
    const shown = pushNotification({ ...direct, type: 'm.room.encrypted', lang: 'en' });
    expect(shown?.title).toBe('Ana');
    expect(shown?.body).toBe('New message');
  });

  it('falls back to Portuguese and to the sender ID', () => {
    const shown = pushNotification({ event_id: '$e', room_id: '!r:x', sender: '@ana:x' });
    expect(shown?.title).toBe('@ana:x');
    expect(shown?.body).toBe('Nova mensagem');
  });

  it('ignores fields of the wrong type', () => {
    const shown = pushNotification({ event_id: '$e', room_id: '!r:x', room_name: 5, content: 'x' });
    expect(shown?.title).toBe('blazeroom');
    expect(shown?.body).toBe('Nova mensagem');
  });
});

describe('pushNotification for a call', () => {
  const call = {
    event_id: '$e',
    room_id: '!r:x',
    sender_display_name: 'Ana',
    type: 'org.matrix.msc3401.call.member',
    lang: 'pt',
  };
  const joined = { application: 'm.call', device_id: 'D', scope: 'm.room' };

  it('shows who is calling', () => {
    const shown = pushNotification({ ...call, content: joined });
    expect(shown).toMatchObject({
      title: 'Ana',
      body: 'Ana está chamando',
      tag: 'call:!r:x',
      isCall: true,
    });
    expect(shown?.data).toEqual({ roomId: '!r:x', eventId: '$e' });
  });

  it('replaces it when the caller leaves', () => {
    const shown = pushNotification({ ...call, content: {} });
    expect(shown).toMatchObject({ body: 'Chamada encerrada', tag: 'call:!r:x', isCall: true });
  });

  it('tells a ring from its end', () => {
    expect(pushNotification({ ...call, content: joined })?.callEnded).toBe(false);
    expect(pushNotification({ ...call, content: {} })?.callEnded).toBe(true);
  });

  it('treats missing content as leaving', () => {
    expect(pushNotification(call)?.body).toBe('Chamada encerrada');
  });

  it('speaks English when the push does', () => {
    expect(pushNotification({ ...call, lang: 'en', content: joined })?.body).toBe('Ana is calling');
    expect(pushNotification({ ...call, lang: 'en', content: {} })?.body).toBe('Call ended');
  });

  it('turns the encrypted half of a call into its ring', () => {
    const encrypted = { ...call, type: 'm.room.encrypted', content: { ciphertext: 'abc' } };
    expect(callRingNotification(encrypted)).toMatchObject({
      body: 'Ana está chamando',
      tag: 'call:!r:x',
      callEnded: false,
    });
  });

  it('marks a message as not a call', () => {
    const shown = pushNotification({ event_id: '$e', room_id: '!r:x', sender: '@a:x' });
    expect(shown?.isCall).toBe(false);
  });
});
