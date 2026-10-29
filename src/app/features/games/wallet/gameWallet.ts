/**
 * Coins shared by every game. Each user starts with STARTING_BALANCE coins.
 *
 * `balance` is what the user can spend; `atTable` is what they currently have in front of them at
 * a game table. Keeping both lets us give chips back if a table is closed without cashing out
 * (tab closed, crash, network loss).
 */
export const GAME_WALLET_EVENT = 'io.github.pistydotta.games.wallet';

export const STARTING_BALANCE = 5000;

export type GameWalletContent = {
  version: 1;
  balance: number;
  atTable: number;
  createdAt: number;
  updatedAt: number;
};

export type GameWallet = {
  ready: boolean;
  balance: number;
  atTable: number;
  /** Moves coins from the balance to the table. */
  buyIn: (amount: number) => Promise<void>;
  /** Records the current table stack, so it can be recovered if the table is lost. */
  syncTable: (stack: number) => Promise<void>;
  /** Moves the table stack back to the balance. */
  cashOut: (stack: number) => Promise<void>;
  /** Returns chips left on a table that was never cashed out. Resolves to the recovered amount. */
  recoverTableChips: () => Promise<number>;
};

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

export const parseGameWallet = (content: unknown): GameWalletContent | undefined => {
  if (!content || typeof content !== 'object') return undefined;
  const { balance, atTable, createdAt, updatedAt } = content as Record<string, unknown>;
  if (!isCount(balance) || !isCount(atTable)) return undefined;
  return {
    version: 1,
    balance: Math.floor(balance),
    atTable: Math.floor(atTable),
    createdAt: isCount(createdAt) ? createdAt : 0,
    updatedAt: isCount(updatedAt) ? updatedAt : 0,
  };
};

export const createGameWallet = (now: number): GameWalletContent => ({
  version: 1,
  balance: STARTING_BALANCE,
  atTable: 0,
  createdAt: now,
  updatedAt: now,
});

export type WalletUpdate = (wallet: GameWalletContent) => GameWalletContent;

export const buyInUpdate =
  (amount: number): WalletUpdate =>
  (wallet) => {
    if (!Number.isInteger(amount) || amount <= 0) throw new Error('Invalid buy-in');
    if (amount > wallet.balance) throw new Error('Saldo insuficiente');
    return { ...wallet, balance: wallet.balance - amount, atTable: wallet.atTable + amount };
  };

export const syncTableUpdate =
  (stack: number): WalletUpdate =>
  (wallet) => ({ ...wallet, atTable: Math.max(0, Math.floor(stack)) });

export const cashOutUpdate =
  (stack: number): WalletUpdate =>
  (wallet) => ({
    ...wallet,
    balance: wallet.balance + Math.max(0, Math.floor(stack)),
    atTable: 0,
  });

export const recoverUpdate: WalletUpdate = (wallet) => ({
  ...wallet,
  balance: wallet.balance + wallet.atTable,
  atTable: 0,
});
