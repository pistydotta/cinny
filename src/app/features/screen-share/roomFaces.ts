// How many faces the floating room card shows before the rest become a count.
export const SHOWN_FACES = 5;

// Faces stay where they are, so two people talking in turn don't keep swapping places; the
// green ring already says who is talking. Only someone hidden behind the "+N" who starts
// talking moves to the front. Newcomers join at the end; people who left drop out.
export const keepFaceOrder = (
  previous: string[],
  userIds: string[],
  speakers: Set<string>,
  max: number
): string[] => {
  const present = new Set(userIds);
  const kept = previous.filter((userId) => present.has(userId));
  const order = [...kept, ...userIds.filter((userId) => !kept.includes(userId))];
  const visible = order.length > max ? max - 1 : max;
  const hiddenSpeakers = order.slice(visible).filter((userId) => speakers.has(userId));
  if (hiddenSpeakers.length === 0) return order;
  return [...hiddenSpeakers, ...order.filter((userId) => !hiddenSpeakers.includes(userId))];
};
