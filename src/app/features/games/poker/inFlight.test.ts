import { describe, expect, it } from 'vitest';
import { createInFlight } from './inFlight';

describe('createInFlight', () => {
  it('skips a repeat of the same key while the first is running', async () => {
    const guard = createInFlight();
    let release: () => void = () => undefined;
    const first = guard(
      'act:1:2',
      () =>
        new Promise<void>((r) => {
          release = r;
        })
    );
    const second = await guard('act:1:2', async () => 'again');
    expect(second.skipped).toBe(true);
    release();
    expect((await first).skipped).toBe(false);
  });

  it('lets other keys through, and the same key again after it finishes or fails', async () => {
    const guard = createInFlight();
    await expect(
      guard('a', async () => {
        throw new Error('x');
      })
    ).rejects.toThrow();
    expect((await guard('a', async () => 1)).value).toBe(1);
    expect((await guard('b', async () => 2)).skipped).toBe(false);
  });
});
