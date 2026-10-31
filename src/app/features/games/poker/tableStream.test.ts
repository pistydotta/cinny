import { describe, expect, it, vi } from 'vitest';
import { newerView, parseSse, readWithTimeout } from './tableStream';
import type { TableView } from './types';

const view = (version: number) => ({ id: 't', version } as unknown as TableView);

describe('parseSse', () => {
  it('parses events split across chunks and skips heartbeats', () => {
    const first = parseSse(': ping\n\ndata: {"version":1}\n\ndata: {"ver');
    expect(first.events).toEqual([{ event: 'message', data: '{"version":1}' }]);
    expect(first.rest).toBe('data: {"ver');

    const second = parseSse(`${first.rest}sion":2}\n\nevent: closed\ndata: {}\n\n`);
    expect(second.events).toEqual([
      { event: 'message', data: '{"version":2}' },
      { event: 'closed', data: '{}' },
    ]);
    expect(second.rest).toBe('');
  });

  it('accepts CRLF line endings', () => {
    expect(parseSse('data: 1\r\n\r\n').events).toEqual([{ event: 'message', data: '1' }]);
  });

  it('produces nothing for comments and empty lines', () => {
    expect(parseSse(': ping\n\n\n\n')).toEqual({ events: [], rest: '' });
  });
});

describe('newerView', () => {
  it('ignores a view older than the current one', () => {
    const current = view(5);
    expect(newerView(current, view(4))).toBe(current);
  });

  it('takes a newer or equal view, or any view when there is none', () => {
    const incoming = view(6);
    expect(newerView(view(5), incoming)).toBe(incoming);
    expect(newerView(undefined, incoming)).toBe(incoming);
    const same = view(5);
    expect(newerView(view(5), same)).toBe(same);
  });
});

describe('readWithTimeout', () => {
  it('gives the value of a read that finishes in time', async () => {
    await expect(readWithTimeout(Promise.resolve(7), 50)).resolves.toEqual({
      timedOut: false,
      value: 7,
    });
  });

  it('gives up on a read that never finishes', async () => {
    vi.useFakeTimers();
    const never = new Promise<number>(() => {
      // Never settles.
    });
    const result = readWithTimeout(never, 60_000);
    vi.advanceTimersByTime(60_000);
    await expect(result).resolves.toEqual({ timedOut: true });
    vi.useRealTimers();
  });

  it('passes a failed read on', async () => {
    await expect(readWithTimeout(Promise.reject(new Error('reset')), 50)).rejects.toThrow('reset');
  });
});
