import { describe, expect, it } from 'vitest';
import { patchElementCall } from './patchElementCall';

const original = 'j.pipe(ZJ(e=>e.length>0?PJ({spotlight:e,pip$:ce}):';
const voice = 'sink$:e.behavior(n.participant$.pipe(W(e=>t=>e?.setVolume(t))))';
const expand = 'ye.pipe(ZJ(e=>e?Te(!1):Ce(!1)))';
const devices = 'yKe=new eY(`audio-output`,void 0),';
const flat =
  'case`flat`:return xe.pipe(ZJ(e=>{switch(e){case`grid`:return Ce(!0);case`spotlight`:return Te(!0)}}))';
const all = `${original}${voice}${expand}${devices}${flat}`;

describe('patchElementCall', () => {
  it("patches the layout's share list and each person's volume", () => {
    const patched = patchElementCall(
      `before;${original}mid;${voice}mid;${expand}mid;${devices}mid;${flat}after`
    );
    expect(patched).toContain('blazeroomShares');
    expect(patched).toContain('blazeroomShares?.pipHidden?.()?void 0:t');
    expect(patched).toContain('blazeroomVoices?.volumeFor(n.userId,t)');
    expect(patched).toContain('blazeroomVoices?.observeParticipant?.(n.userId,n,e)');
    expect(patched).not.toContain(original);
    expect(patched).not.toContain(voice);
    expect(patched).toContain('peopleHidden?.()),KJ(),ZJ(e=>e?Te(!0):Ce(!0))');
    expect(patched).toContain('window.blazeroomDeviceSettings={audioInput:vKe,audioOutput:yKe}');
    expect(patched).toContain('peopleHidden?.()),KJ(),ZJ(t=>t?Ce(!0):Te(!0))');
    expect(patched).not.toContain(flat);
    expect(patched.startsWith('before;')).toBe(true);
    expect(patched.endsWith('after')).toBe(true);
  });

  it('throws when the text is missing', () => {
    expect(() => patchElementCall('x')).toThrow(/Element Call/);
    expect(() => patchElementCall(original)).toThrow(/voice volume/);
    expect(() => patchElementCall(`${original}${voice}`)).toThrow(/expanded share/);
    expect(() => patchElementCall(`${original}${voice}${expand}`)).toThrow(/audio devices/);
    expect(() => patchElementCall(`${original}${voice}${expand}${devices}`)).toThrow(/flat share/);
  });

  it('throws when the text appears twice', () => {
    expect(() => patchElementCall(`${original}${all}`)).toThrow(/Element Call/);
    expect(() => patchElementCall(`${all}${voice}`)).toThrow(/voice volume/);
    expect(() => patchElementCall(`${all}${expand}`)).toThrow(/expanded share/);
    expect(() => patchElementCall(`${all}${devices}`)).toThrow(/audio devices/);
    expect(() => patchElementCall(`${all}${flat}`)).toThrow(/flat share/);
  });
});
