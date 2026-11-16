import { describe, expect, it } from 'vitest';
import { patchElementCall } from './patchElementCall';

const original = 'j.pipe(ZJ(e=>e.length>0?PJ({spotlight:e,pip$:ce}):';
const voice = 'sink$:e.behavior(n.participant$.pipe(W(e=>t=>e?.setVolume(t))))';
const expand = 'ye.pipe(ZJ(e=>e?Te(!1):Ce(!1)))';
const devices = 'yKe=new eY(`audio-output`,void 0),';
const flat =
  'case`flat`:return xe.pipe(ZJ(e=>{switch(e){case`grid`:return Ce(!0);case`spotlight`:return Te(!0)}}))';
const narrow =
  'case`narrow`:return Oe.pipe(ZJ(e=>e===null?IJ([le,fe],(e,t)=>e.length>uot||t.some(e=>e.type===`screen share`)?we:Se).pipe(lKe()):PJ(e)));';
const grid =
  'le=e.behavior(ne.pipe(ZJ(e=>{let t=e.map(e=>e.bin$.pipe(W(t=>[e,t])));return t.length===0?PJ([]):IJ(t,(...e)=>e.sort(([,e],[,t])=>e-t).map(([e])=>e))}),KJ(r9)))';
const tile =
  'return o.type===`ringing`?(0,B.jsx)(Kit,{ref:a,vm:o,displayName:s,mxcAvatarUrl:c,...i})';
const oneOnOne = 'return PJ(null)})),De=Ee.pipe(';
const six = `${original}${voice}${expand}${devices}${flat}${narrow}`;
const all = `${six}${grid}${tile}${oneOnOne}`;

describe('patchElementCall', () => {
  it("patches the layout's share list and each person's volume", () => {
    const patched = patchElementCall(
      `before;${original}mid;${voice}mid;${expand}mid;${devices}mid;${flat}mid;${narrow}mid;${grid}mid;${tile}mid;${oneOnOne}after`
    );
    expect(patched).toContain('blazeroomShares');
    expect(patched).toContain('blazeroomShares?.pipHidden?.()?void 0:t');
    expect(patched).toContain('blazeroomVoices?.volumeFor(n.userId,t)');
    expect(patched).toContain('blazeroomVoices?.observeParticipant?.(n.userId,n,e)');
    expect(patched).not.toContain(original);
    expect(patched).not.toContain(voice);
    expect(patched).toContain('pipHidden?.()),KJ(),ZJ(e=>e?Te(!0):Ce(!0))');
    expect(patched).toContain('window.blazeroomDeviceSettings={audioInput:vKe,audioOutput:yKe}');
    expect(patched).toContain('pipHidden?.()),KJ(),ZJ(t=>t?Ce(!0):Te(!0))');
    expect(patched).not.toContain(flat);
    expect(patched).toContain('ZJ(t=>t?Te(!0):Oe.pipe(');
    expect(patched).not.toContain(narrow);
    expect(patched).toContain('blazeroomShares?.gridShares?.(e,t)??e');
    expect(patched).toContain('"data-blazeroom-share":o.shareId');
    expect(patched).not.toContain(grid);
    expect(patched).toContain('W(([t,n])=>t||n?e:null)');
    expect(patched).not.toContain(oneOnOne);
    expect(patched.startsWith('before;')).toBe(true);
    expect(patched.endsWith('after')).toBe(true);
  });

  it('throws when the text is missing', () => {
    expect(() => patchElementCall('x')).toThrow(/Element Call/);
    expect(() => patchElementCall(original)).toThrow(/voice volume/);
    expect(() => patchElementCall(`${original}${voice}`)).toThrow(/expanded share/);
    expect(() => patchElementCall(`${original}${voice}${expand}`)).toThrow(/audio devices/);
    expect(() => patchElementCall(`${original}${voice}${expand}${devices}`)).toThrow(/flat share/);
    expect(() => patchElementCall(`${original}${voice}${expand}${devices}${flat}`)).toThrow(
      /narrow share/
    );
    expect(() => patchElementCall(six)).toThrow(/grid share/);
    expect(() => patchElementCall(`${six}${grid}`)).toThrow(/share tile/);
    expect(() => patchElementCall(`${six}${grid}${tile}`)).toThrow(/one-on-one/);
  });

  it('throws when the text appears twice', () => {
    expect(() => patchElementCall(`${original}${all}`)).toThrow(/Element Call/);
    expect(() => patchElementCall(`${all}${voice}`)).toThrow(/voice volume/);
    expect(() => patchElementCall(`${all}${expand}`)).toThrow(/expanded share/);
    expect(() => patchElementCall(`${all}${devices}`)).toThrow(/audio devices/);
    expect(() => patchElementCall(`${all}${flat}`)).toThrow(/flat share/);
    expect(() => patchElementCall(`${all}${narrow}`)).toThrow(/narrow share/);
    expect(() => patchElementCall(`${all}${grid}`)).toThrow(/grid share/);
    expect(() => patchElementCall(`${all}${tile}`)).toThrow(/share tile/);
    expect(() => patchElementCall(`${all}${oneOnOne}`)).toThrow(/one-on-one/);
  });
});
