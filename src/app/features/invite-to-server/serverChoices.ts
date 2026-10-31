export type ServerChoice = {
  roomId: string;
  name: string;
  // Latest activity in any of the server's rooms you're in.
  lastActive: number;
};

export type ServerChoiceList = {
  recent: ServerChoice[];
  others: ServerChoice[];
};

export const RECENT_COUNT = 3;

const byName = (a: ServerChoice, b: ServerChoice) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

// With no search: the servers you use most (latest activity) first, then the rest by name.
// With a search: every matching server by name.
export const serverChoiceList = (choices: ServerChoice[], query: string): ServerChoiceList => {
  const term = query.trim().toLowerCase();
  if (term) {
    return {
      recent: [],
      others: choices.filter((c) => c.name.toLowerCase().includes(term)).sort(byName),
    };
  }
  const recent = [...choices]
    .sort((a, b) => b.lastActive - a.lastActive || byName(a, b))
    .slice(0, RECENT_COUNT);
  const recentIds = new Set(recent.map((c) => c.roomId));
  return {
    recent,
    others: choices.filter((c) => !recentIds.has(c.roomId)).sort(byName),
  };
};
