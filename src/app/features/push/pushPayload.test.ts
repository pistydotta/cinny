import { describe, expect, it } from 'vitest';
import { pushNotification } from './pushPayload';

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
