import { ASCIILexicalTable, orderKeys } from '../../utils/ASCIILexicalTable';
import { byOrderKey, byTsOldToNew } from '../../utils/sort';

export type SpaceChild = {
  roomId: string;
  order?: string;
  ts: number;
};

export type DropEdge = 'top' | 'bottom';

export type OrderChange = {
  roomId: string;
  order: string;
};

// Same table as the lobby, so both write keys the other understands.
export const orderLex = new ASCIILexicalTable(' '.charCodeAt(0), '~'.charCodeAt(0), 6);

// The order the room list shows a space's children in (useSpaceJoinedHierarchy).
export const sortChildren = (children: SpaceChild[]): SpaceChild[] =>
  [...children]
    .sort((a, b) => byTsOldToNew(a.ts, b.ts))
    .sort((a, b) => byOrderKey(a.order, b.order));

// The order keys to write so `movedId` lands on `edge` of `targetId`. Only the children
// whose key changes are returned; empty when nothing moves.
export const moveChild = (
  children: SpaceChild[],
  movedId: string,
  targetId: string,
  edge: DropEdge,
  lex: ASCIILexicalTable = orderLex
): OrderChange[] => {
  if (movedId === targetId) return [];
  const sorted = sortChildren(children);
  const moved = sorted.find((child) => child.roomId === movedId);
  const rest = sorted.filter((child) => child.roomId !== movedId);
  const targetIndex = rest.findIndex((child) => child.roomId === targetId);
  if (!moved || targetIndex === -1) return [];

  const insertAt = edge === 'top' ? targetIndex : targetIndex + 1;
  if (sorted.indexOf(moved) === insertAt) return [];

  const next = [...rest];
  next.splice(insertAt, 0, { ...moved, order: undefined });

  const currentOrders = next.map((child) =>
    typeof child.order === 'string' && lex.has(child.order) ? child.order : undefined
  );
  const newOrders = orderKeys(lex, currentOrders);
  if (!newOrders) return [];

  return next
    .map((child, index) => ({ roomId: child.roomId, order: newOrders[index] }))
    .filter(({ roomId, order }) => order !== children.find((c) => c.roomId === roomId)?.order);
};
