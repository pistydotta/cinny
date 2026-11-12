import { describe, expect, it } from 'vitest';
import { scriptedFingerprint } from './recorded';

// Three minutes of a run with fixed commands end in one exact state. The same number came out
// of Chromium (see docs/brazilianbonk-replays.md for checking other browsers). When a rules
// change moves it, update it on purpose, like the regression test.
describe('horde determinism', () => {
  it('ends a scripted run in the same exact state', () => {
    expect(scriptedFingerprint()).toMatchInlineSnapshot(`"81d62916:10800:595"`);
  });
});
