import { expect, it } from 'vitest';
import {
  AUDIO_STATUS_TTL,
  AudioReport,
  audioKey,
  userAudioStatus,
  validAudioReport,
} from './audioStatus';

const now = 100_000;
const room = '!call:test';
const members = [{ userId: '@a:test', deviceId: 'phone', memberId: 'session-1' }];
const report: AudioReport = {
  roomId: room,
  deviceId: 'phone',
  memberId: 'session-1',
  at: now,
  microphone: false,
  sound: false,
};

it('accepts only current members, exact call sessions, valid flags and fresh reports', () => {
  expect(validAudioReport('@a:test', report, room, members, now)).toBe(true);
  expect(validAudioReport('@attacker:test', report, room, members, now)).toBe(false);
  expect(validAudioReport('@a:test', report, '!other:test', members, now)).toBe(false);
  expect(
    validAudioReport('@a:test', { ...report, memberId: 'previous-call' }, room, members, now)
  ).toBe(false);
  expect(validAudioReport('@a:test', { ...report, deviceId: 'other' }, room, members, now)).toBe(
    false
  );
  expect(
    validAudioReport('@a:test', { ...report, at: now - AUDIO_STATUS_TTL }, room, members, now)
  ).toBe(false);
  expect(validAudioReport('@a:test', { ...report, at: now + 60_000 }, room, members, now)).toBe(
    false
  );
  expect(validAudioReport('@a:test', { ...report, sound: undefined }, room, members, now)).toBe(
    false
  );
});

it('does not confuse a users own mute/deafen state with absent data, old calls or local listening volume', () => {
  const reports = new Map([[audioKey('@a:test', 'phone'), report]]);
  expect(userAudioStatus(reports, members, '@a:test', now)).toEqual({
    muted: true,
    deafened: true,
  });
  expect(userAudioStatus(new Map(), members, '@a:test', now)).toEqual({
    muted: false,
    deafened: false,
  });
  expect(
    userAudioStatus(reports, [{ ...members[0], memberId: 'new-call' }], '@a:test', now)
  ).toEqual({ muted: false, deafened: false });
  expect(userAudioStatus(reports, members, '@a:test', now + AUDIO_STATUS_TTL)).toEqual({
    muted: false,
    deafened: false,
  });
});

it('aggregates multiple devices without declaring someone muted when another device can speak', () => {
  const multiple = [...members, { ...members[0], deviceId: 'pc', memberId: 'session-2' }];
  const reports = new Map([[audioKey('@a:test', 'phone'), report]]);
  expect(userAudioStatus(reports, multiple, '@a:test', now).muted).toBe(false);
  reports.set(audioKey('@a:test', 'pc'), {
    ...report,
    deviceId: 'pc',
    memberId: 'session-2',
    microphone: true,
    sound: true,
  });
  expect(userAudioStatus(reports, multiple, '@a:test', now)).toEqual({
    muted: false,
    deafened: false,
  });
});
