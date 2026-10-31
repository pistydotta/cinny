import { describe, expect, it } from 'vitest';
import { matchingRooms, parseShare, shareFileUrl, textDraft } from './share';

describe('shareFileUrl', () => {
  it('builds the files to fetch', () => {
    expect(shareFileUrl('https://x', 's1', 'f1')).toBe('https://x/__android_share/s1/f1');
  });
});

describe('parseShare', () => {
  const file = { id: 'f1', name: 'a.png', mime: 'image/png', size: 3 };

  it('reads what the app shared', () => {
    expect(parseShare({ type: 'share', id: 's1', text: 'oi', files: [file] })).toEqual({
      id: 's1',
      text: 'oi',
      files: [file],
    });
  });

  it('finds nothing in an empty answer', () => {
    expect(parseShare({ type: 'share' })).toBeUndefined();
    expect(parseShare({ type: 'share', id: '' })).toBeUndefined();
  });

  it('finds nothing in a share with nothing in it', () => {
    expect(parseShare({ type: 'share', id: 's1', files: [] })).toBeUndefined();
  });

  it('drops malformed files', () => {
    const share = parseShare({
      type: 'share',
      id: 's1',
      text: 'oi',
      files: [file, { id: 3 }, null],
    });
    expect(share?.files).toEqual([file]);
  });

  it('treats a missing text as none', () => {
    expect(parseShare({ type: 'share', id: 's1', files: [file] })?.text).toBeUndefined();
  });
});

describe('matchingRooms', () => {
  const rooms = [
    { id: '!a', name: 'Geral', lastActive: 10 },
    { id: '!b', name: 'Música', lastActive: 30 },
    { id: '!c', name: 'geladeira', lastActive: 20 },
  ];

  it('puts the latest rooms first', () => {
    expect(matchingRooms(rooms, '').map(({ id }) => id)).toEqual(['!b', '!c', '!a']);
  });

  it('searches names ignoring case', () => {
    expect(matchingRooms(rooms, 'GE').map(({ id }) => id)).toEqual(['!c', '!a']);
  });

  it('searches ignoring accents', () => {
    expect(matchingRooms(rooms, 'musica').map(({ id }) => id)).toEqual(['!b']);
  });
});

describe('textDraft', () => {
  it('puts the text in a paragraph', () => {
    expect(textDraft('oi')).toEqual([{ type: 'paragraph', children: [{ text: 'oi' }] }]);
  });
});
