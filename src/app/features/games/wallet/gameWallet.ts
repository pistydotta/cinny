import { tr } from '../../translation/tr';

/**
 * Coins shared by every game. Each user starts with STARTING_BALANCE coins.
 *
 * `balance` is what the user can spend; `tables` holds what they currently have in front of them
 * at each game table. Keeping both lets us give chips back if a table is closed without cashing
 * out (tab closed, crash, network loss).
 */
export const GAME_WALLET_EVENT = 'io.github.pistydotta.games.wallet';

export const STARTING_BALANCE = 5000;

/** Table key of the local practice table against bots. */
export const PRACTICE_TABLE = 'practice';

export type GameWalletContent = {
  version: 2;
  balance: number;
  /** Chips at each table, by table key (a room id for shared tables). */
  tables: Record<string, number>;
  createdAt: number;
  updatedAt: number;
};

export type GameWallet = {
  ready: boolean;
  balance: number;
  /** Chips currently at any table. */
  atTable: number;
  /** Chips at one table. */
  chipsAt: (table: string) => number;
  /** Moves coins from the balance to a table. */
  buyIn: (amount: number, table: string) => Promise<void>;
  /** Records the current stack at a table, so it can be recovered if the table is lost. */
  syncTable: (stack: number, table: string) => Promise<void>;
  /** Moves a table stack back to the balance. */
  cashOut: (stack: number, table: string) => Promise<void>;
  /** Returns chips left on a table that was never cashed out. Resolves to the recovered amount. */
  recoverTableChips: (table: string) => Promise<number>;
  /** Gives back coins moved to a table for a seat or rebuy that did not happen. */
  refund: (amount: number, table: string) => Promise<void>;
};

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

export const parseGameWallet = (content: unknown): GameWalletContent | undefined => {
  if (!content || typeof content !== 'object') return undefined;
  const { balance, atTable, tables, createdAt, updatedAt } = content as Record<string, unknown>;
  if (!isCount(balance)) return undefined;
  const parsedTables: Record<string, number> = {};
  if (tables && typeof tables === 'object') {
    Object.entries(tables as Record<string, unknown>).forEach(([key, value]) => {
      if (isCount(value) && value > 0) parsedTables[key] = Math.floor(value);
    });
  } else if (isCount(atTable) && atTable > 0) {
    // First version kept a single practice table.
    parsedTables[PRACTICE_TABLE] = Math.floor(atTable);
  }
  return {
    version: 2,
    balance: Math.floor(balance),
    tables: parsedTables,
    createdAt: isCount(createdAt) ? createdAt : 0,
    updatedAt: isCount(updatedAt) ? updatedAt : 0,
  };
};

export const createGameWallet = (now: number): GameWalletContent => ({
  version: 2,
  balance: STARTING_BALANCE,
  tables: {},
  createdAt: now,
  updatedAt: now,
});

export const totalAtTables = (wallet: GameWalletContent): number =>
  Object.values(wallet.tables).reduce((sum, chips) => sum + chips, 0);

export type WalletUpdate = (wallet: GameWalletContent) => GameWalletContent;

const withTable = (wallet: GameWalletContent, table: string, chips: number) => {
  const tables = { ...wallet.tables };
  if (chips > 0) tables[table] = chips;
  else delete tables[table];
  return tables;
};

export const buyInUpdate =
  (amount: number, table: string): WalletUpdate =>
  (wallet) => {
    if (!Number.isInteger(amount) || amount <= 0)
      throw new Error(tr('games.error.invalid_amount', 'Invalid amount'));
    if (amount > wallet.balance)
      throw new Error(tr('games.error.not_enough_coins', 'Not enough coins'));
    return {
      ...wallet,
      balance: wallet.balance - amount,
      tables: withTable(wallet, table, (wallet.tables[table] ?? 0) + amount),
    };
  };

export const syncTableUpdate =
  (stack: number, table: string): WalletUpdate =>
  (wallet) => ({ ...wallet, tables: withTable(wallet, table, Math.max(0, Math.floor(stack))) });

export const cashOutUpdate =
  (stack: number, table: string): WalletUpdate =>
  (wallet) => ({
    ...wallet,
    balance: wallet.balance + Math.max(0, Math.floor(stack)),
    tables: withTable(wallet, table, 0),
  });

export const recoverUpdate =
  (table: string): WalletUpdate =>
  (wallet) => ({
    ...wallet,
    balance: wallet.balance + (wallet.tables[table] ?? 0),
    tables: withTable(wallet, table, 0),
  });

export const refundUpdate =
  (amount: number, table: string): WalletUpdate =>
  (wallet) => {
    const chips = Math.min(wallet.tables[table] ?? 0, Math.max(0, Math.floor(amount)));
    return {
      ...wallet,
      balance: wallet.balance + chips,
      tables: withTable(wallet, table, (wallet.tables[table] ?? 0) - chips),
    };
  };
