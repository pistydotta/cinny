// Who sits on the ember's ring before you join: up to five places, spread evenly from the top,
// so one person sits on top. Past five, the last place says how many more. x and y are
// percentages of the ring's box, its centre at 50/50.
export const ORBIT_PLACES = 5;

export type OrbitPoint = { x: number; y: number };

const round = (n: number) => Math.round(n * 100) / 100;

export function orbitPlaces<T>(
  items: T[],
  max = ORBIT_PLACES
): { people: (OrbitPoint & { item: T })[]; more?: OrbitPoint & { count: number } } {
  const shown = items.length > max ? items.slice(0, max - 1) : items;
  const count = items.length - shown.length;
  const total = shown.length + (count > 0 ? 1 : 0);
  const at = (k: number): OrbitPoint => {
    const angle = -Math.PI / 2 + (2 * Math.PI * k) / total;
    return { x: round(50 + 50 * Math.cos(angle)), y: round(50 + 50 * Math.sin(angle)) };
  };
  return {
    people: shown.map((item, k) => ({ item, ...at(k) })),
    more: count > 0 ? { count, ...at(shown.length) } : undefined,
  };
}
