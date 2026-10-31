/** Ignores a repeat of an action whose first try hasn't answered yet, such as a double click. */
export const createInFlight = () => {
  const pending = new Set<string>();
  return async <T>(
    key: string,
    task: () => Promise<T>
  ): Promise<{ skipped: boolean; value?: T }> => {
    if (pending.has(key)) return { skipped: true };
    pending.add(key);
    try {
      return { skipped: false, value: await task() };
    } finally {
      pending.delete(key);
    }
  };
};
