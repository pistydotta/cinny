/** Half the balance within the table's limits, rounded down to a step above the minimum. */
export const defaultBuyIn = (balance: number, min: number, max: number, step: number): number => {
  const half = Math.floor(balance / 2);
  const target = Math.min(max, Math.max(min, half));
  return min + Math.floor((target - min) / step) * step;
};
