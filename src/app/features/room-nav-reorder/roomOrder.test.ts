import { describe, expect, it } from 'vitest';
import { moveChild, SpaceChild, sortChildren } from './roomOrder';

// Applies the changes and returns the resulting order of room ids.
const apply = (children: SpaceChild[], changes: { roomId: string; order: string }[]) =>
  sortChildren(
    children.map((child) => ({
      ...child,
      order: changes.find((c) => c.roomId === child.roomId)?.order ?? child.order,
    }))
  ).map((child) => child.roomId);

const unordered: SpaceChild[] = [
  { roomId: 'a', ts: 1 },
  { roomId: 'b', ts: 2 },
  { roomId: 'c', ts: 3 },
];

describe('moveChild', () => {
  it('moves a room above another when none has an order yet', () => {
    expect(apply(unordered, moveChild(unordered, 'c', 'a', 'top'))).toEqual(['c', 'a', 'b']);
  });

  it('moves a room below another', () => {
    expect(apply(unordered, moveChild(unordered, 'a', 'b', 'bottom'))).toEqual(['b', 'a', 'c']);
  });

  it('keeps existing orders and only rewrites what it has to', () => {
    const ordered: SpaceChild[] = [
      { roomId: 'a', ts: 1, order: 'b' },
      { roomId: 'b', ts: 2, order: 'd' },
      { roomId: 'c', ts: 3, order: 'f' },
    ];
    const changes = moveChild(ordered, 'c', 'a', 'bottom');
    expect(changes.map((c) => c.roomId)).toEqual(['c']);
    expect(apply(ordered, changes)).toEqual(['a', 'c', 'b']);
  });

  it('does nothing when the room is already there', () => {
    expect(moveChild(unordered, 'b', 'a', 'bottom')).toEqual([]);
    expect(moveChild(unordered, 'b', 'c', 'top')).toEqual([]);
    expect(moveChild(unordered, 'b', 'b', 'top')).toEqual([]);
  });

  it('ignores rooms that are not children', () => {
    expect(moveChild(unordered, 'x', 'a', 'top')).toEqual([]);
    expect(moveChild(unordered, 'a', 'x', 'top')).toEqual([]);
  });
});
