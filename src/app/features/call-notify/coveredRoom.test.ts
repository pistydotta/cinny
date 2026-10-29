import { describe, expect, it } from 'vitest';
import { messageInView } from './coveredRoom';

const dm = '!dm:example.org';
const other = '!other:example.org';

describe('messageInView', () => {
  it('counts the open chat of the selected room as seen', () => {
    expect(messageInView(dm, { focused: true, selectedRoomId: dm, inboxSelected: false })).toBe(
      true
    );
  });

  it('notifies for the selected room while the call view covers its chat', () => {
    expect(
      messageInView(dm, {
        focused: true,
        selectedRoomId: dm,
        inboxSelected: false,
        coveredRoomId: dm,
      })
    ).toBe(false);
  });

  it('notifies for other rooms and when the window is in the background', () => {
    expect(messageInView(other, { focused: true, selectedRoomId: dm, inboxSelected: false })).toBe(
      false
    );
    expect(messageInView(dm, { focused: false, selectedRoomId: dm, inboxSelected: false })).toBe(
      false
    );
  });

  it('counts everything as seen on the inbox notifications page', () => {
    expect(messageInView(other, { focused: true, inboxSelected: true })).toBe(true);
  });
});
