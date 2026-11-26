import { describe, expect, it } from 'vitest';
import { rank } from './liveRank';

const circle = { call: new Set(['@ana:x']), friends: new Set(['@bia:x']) };
const t = (id: string, people: string[], extra = {}) => ({
  id,
  people,
  seated: false,
  invited: false,
  ...extra,
});

describe('rank', () => {
  it('puts your tables, then invites, then call, then friends, and drops strangers', () => {
    const out = rank(
      [
        t('stranger', ['@zed:x']),
        t('friend', ['@bia:x']),
        t('call', ['@ana:x', '@zed:x']),
        t('invite', ['@zed:x'], { invited: true }),
        t('mine', ['@me:x'], { seated: true }),
      ],
      circle
    );
    expect(out.map((r) => r.id)).toEqual(['mine', 'invite', 'call', 'friend']);
    expect(out[2].relevance).toBe('call');
  });

  it('breaks ties by the most recent change', () => {
    const out = rank(
      [t('old', ['@bia:x'], { updatedAt: 1 }), t('new', ['@bia:x'], { updatedAt: 2 })],
      circle
    );
    expect(out.map((r) => r.id)).toEqual(['new', 'old']);
  });

  it('prefers the last move by a person over the last change', () => {
    const out = rank(
      [
        t('bots-only', ['@bia:x'], { updatedAt: 9, activeAt: 1 }),
        t('played', ['@bia:x'], { updatedAt: 2, activeAt: 2 }),
      ],
      circle
    );
    expect(out.map((r) => r.id)).toEqual(['played', 'bots-only']);
  });

  it('puts stopped games below every live one, even your own', () => {
    const out = rank(
      [t('mine-stopped', ['@me:x'], { seated: true, idle: true }), t('friend', ['@bia:x'])],
      circle
    );
    expect(out.map((r) => r.id)).toEqual(['friend', 'mine-stopped']);
  });
});
