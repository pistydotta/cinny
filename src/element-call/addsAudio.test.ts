import { describe, expect, it, vi } from 'vitest';
import { addsAudio } from './addsAudio';

const record = (...addedNodes: unknown[]) => ({ addedNodes } as unknown as MutationRecord);
const element = (nodeName: string, hasAudio = false) => ({
  nodeName,
  querySelector: vi.fn(() => (hasAudio ? {} : null)),
});

describe('addsAudio', () => {
  it('finds an added audio element', () => {
    expect(addsAudio([record(element('AUDIO'))])).toBe(true);
  });

  it('finds an audio element inside an added node', () => {
    expect(addsAudio([record(element('DIV')), record(element('DIV', true))])).toBe(true);
  });

  it('ignores unrelated mutations', () => {
    expect(addsAudio([record(element('VIDEO'), element('DIV'))])).toBe(false);
    expect(addsAudio([record()])).toBe(false);
  });

  it('ignores nodes that are not elements', () => {
    expect(addsAudio([record({ nodeName: '#text' })])).toBe(false);
  });
});
