import { describe, expect, it } from 'vitest';
import { patchElementCall } from './patchElementCall';

const original = 'j.pipe(ZJ(e=>e.length>0?PJ({spotlight:e,pip$:ce}):';
const voice = 'sink$:e.behavior(n.participant$.pipe(W(e=>t=>e?.setVolume(t))))';

describe('patchElementCall', () => {
  it("patches the layout's share list and each person's volume", () => {
    const patched = patchElementCall(`before;${original}mid;${voice}after`);
    expect(patched).toContain('blazeroomShares');
    expect(patched).toContain('blazeroomVoices?.volumeFor(n.userId,t)');
    expect(patched).not.toContain(original);
    expect(patched).not.toContain(voice);
    expect(patched.startsWith('before;')).toBe(true);
    expect(patched.endsWith('after')).toBe(true);
  });

  it('throws when the text is missing', () => {
    expect(() => patchElementCall('x')).toThrow(/Element Call/);
    expect(() => patchElementCall(original)).toThrow(/voice volume/);
  });

  it('throws when the text appears twice', () => {
    expect(() => patchElementCall(`${original}${original}${voice}`)).toThrow(/Element Call/);
    expect(() => patchElementCall(`${original}${voice}${voice}`)).toThrow(/voice volume/);
  });
});
