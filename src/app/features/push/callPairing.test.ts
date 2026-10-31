import { describe, expect, it } from 'vitest';
import { createCallPairing } from './callPairing';

const room = '!r:x';
const ana = '@ana:x';

describe('createCallPairing', () => {
  it('finds nothing with no join', () => {
    expect(createCallPairing().isCallNotification(room, ana, 1000)).toBe(false);
  });

  it('pairs a join with the encrypted event that follows', () => {
    const pairing = createCallPairing();
    pairing.join(room, ana, 1000);
    expect(pairing.isCallNotification(room, ana, 4000)).toBe(true);
  });

  it('pairs only once, so the next message is a message', () => {
    const pairing = createCallPairing();
    pairing.join(room, ana, 1000);
    pairing.isCallNotification(room, ana, 4000);
    expect(pairing.isCallNotification(room, ana, 5000)).toBe(false);
  });

  it('leaves out another person', () => {
    const pairing = createCallPairing();
    pairing.join(room, ana, 1000);
    expect(pairing.isCallNotification(room, '@bia:x', 2000)).toBe(false);
  });

  it('leaves out another room', () => {
    const pairing = createCallPairing();
    pairing.join(room, ana, 1000);
    expect(pairing.isCallNotification('!s:x', ana, 2000)).toBe(false);
  });

  it('leaves out a message long after the join', () => {
    const pairing = createCallPairing();
    pairing.join(room, ana, 1000);
    expect(pairing.isCallNotification(room, ana, 12000)).toBe(false);
  });

  it('forgets a join when the call ends', () => {
    const pairing = createCallPairing();
    pairing.join(room, ana, 1000);
    pairing.forget(room);
    expect(pairing.isCallNotification(room, ana, 2000)).toBe(false);
  });
});
