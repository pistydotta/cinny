import { describe, expect, it } from 'vitest';
import {
  addSelfChat,
  findSelfChat,
  parseSelfChatHidden,
  selfChatChanges,
  visibleDirects,
} from './selfChat';

const me = '@me:server';
const joined = (roomId: string) => roomId !== '!left';

describe('findSelfChat', () => {
  it('finds the room listed under your own user', () => {
    expect(findSelfChat({ [me]: ['!notes'] }, me, joined)).toBe('!notes');
  });

  it('never answers with a chat with someone else', () => {
    expect(findSelfChat({ '@friend:server': ['!dm'] }, me, joined)).toBeUndefined();
  });

  it('skips a room you left', () => {
    expect(findSelfChat({ [me]: ['!left', '!notes'] }, me, joined)).toBe('!notes');
    expect(findSelfChat({ [me]: ['!left'] }, me, joined)).toBeUndefined();
  });

  it('copes with no account data or a malformed list', () => {
    expect(findSelfChat(undefined, me, joined)).toBeUndefined();
    expect(findSelfChat({ [me]: 'oops' }, me, joined)).toBeUndefined();
    expect(findSelfChat({ [me]: [1, '!notes'] }, me, joined)).toBe('!notes');
  });
});

describe('addSelfChat', () => {
  it('keeps your other DMs', () => {
    expect(addSelfChat({ '@friend:server': ['!dm'] }, me, '!notes')).toEqual({
      '@friend:server': ['!dm'],
      [me]: ['!notes'],
    });
  });

  it('adds to what is already listed, or replaces a malformed list', () => {
    expect(addSelfChat({ [me]: ['!left'] }, me, '!notes')).toEqual({ [me]: ['!left', '!notes'] });
    expect(addSelfChat({ [me]: 'oops' }, me, '!notes')).toEqual({ [me]: ['!notes'] });
    expect(addSelfChat(undefined, me, '!notes')).toEqual({ [me]: ['!notes'] });
  });
});

describe('selfChatChanges', () => {
  it('changes nothing when the room is up to date', () => {
    const same = { name: 'Me', avatar: 'mxc://a' };
    expect(selfChatChanges(same, same)).toEqual({ name: undefined, avatar: undefined });
    expect(selfChatChanges({ name: 'Me' }, { name: 'Me' })).toEqual({
      name: undefined,
      avatar: undefined,
    });
  });

  it('follows a new name and photo', () => {
    expect(
      selfChatChanges({ name: 'Old', avatar: 'mxc://a' }, { name: 'New', avatar: 'mxc://b' })
    ).toEqual({ name: 'New', avatar: 'mxc://b' });
  });

  it('clears the photo when you remove yours', () => {
    expect(selfChatChanges({ name: 'Me', avatar: 'mxc://a' }, { name: 'Me' }).avatar).toBe('');
  });
});

describe('parseSelfChatHidden', () => {
  it('is hidden only when saved as hidden', () => {
    expect(parseSelfChatHidden({ hidden: true })).toBe(true);
    expect(parseSelfChatHidden({ hidden: false })).toBe(false);
    expect(parseSelfChatHidden({ hidden: 'yes' })).toBe(false);
    expect(parseSelfChatHidden(undefined)).toBe(false);
  });
});

describe('visibleDirects', () => {
  const list = ['!notes', '!dm'];
  const directs = { [me]: ['!notes'], '@friend:server': ['!dm'] };

  it('keeps everything while not hidden', () => {
    expect(visibleDirects(list, directs, me, false, undefined)).toEqual(list);
  });

  it('removes only your own chat when hidden', () => {
    expect(visibleDirects(list, directs, me, true, undefined)).toEqual(['!dm']);
    expect(visibleDirects(list, directs, me, true, '!dm')).toEqual(['!dm']);
  });

  it('keeps it while it is the open chat', () => {
    expect(visibleDirects(list, directs, me, true, '!notes')).toEqual(list);
  });

  it('copes with no account data', () => {
    expect(visibleDirects(list, undefined, me, true, undefined)).toEqual(list);
  });
});
