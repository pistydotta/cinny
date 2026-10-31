import type { TableView } from './types';

export type SseEvent = { event: string; data: string };

// Takes decoded text, so the caller owns the decoding. Whatever follows the last blank line is an
// event still arriving: it comes back as `rest` for the caller to prepend to the next chunk.
export const parseSse = (buffer: string): { events: SseEvent[]; rest: string } => {
  const blocks = buffer.replace(/\r\n?/g, '\n').split('\n\n');
  const rest = blocks.pop() ?? '';
  const events: SseEvent[] = [];
  blocks.forEach((block) => {
    let event = 'message';
    const data: string[] = [];
    block.split('\n').forEach((line) => {
      if (line.startsWith(':')) return;
      const colon = line.indexOf(':');
      const field = colon === -1 ? line : line.slice(0, colon);
      const value = colon === -1 ? '' : line.slice(colon + 1).replace(/^ /, '');
      if (field === 'event') event = value;
      else if (field === 'data') data.push(value);
    });
    if (data.length > 0 || event !== 'message') events.push({ event, data: data.join('\n') });
  });
  return { events, rest };
};

// Views can arrive out of order: a play reply races the stream.
export const newerView = (current: TableView | undefined, incoming: TableView): TableView =>
  current && incoming.version < current.version ? current : incoming;
