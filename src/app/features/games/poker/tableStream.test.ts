import { describe, expect, it } from 'vitest';
import { newerView, parseSse } from './tableStream';
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
