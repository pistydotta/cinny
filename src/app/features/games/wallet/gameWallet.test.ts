import { describe, expect, it } from 'vitest';
import {
  buyInUpdate,
  cashOutUpdate,
  createGameWallet,
  parseGameWallet,
  PRACTICE_TABLE,
  recoverUpdate,
  refundUpdate,
  STARTING_BALANCE,
  syncTableUpdate,
  totalAtTables,
} from './gameWallet';

describe('game wallet', () => {
  it('starts with the starting balance', () => {
    const wallet = createGameWallet(1);
    expect(wallet.balance).toBe(STARTING_BALANCE);
    expect(totalAtTables(wallet)).toBe(0);
  });

  it('moves coins to a table and back', () => {
    let wallet = createGameWallet(1);
    wallet = buyInUpdate(2000, '!room')(wallet);
    expect(wallet.balance).toBe(3000);
    expect(wallet.tables['!room']).toBe(2000);
    wallet = syncTableUpdate(2600, '!room')(wallet);
    wallet = cashOutUpdate(2600, '!room')(wallet);
    expect(wallet.balance).toBe(5600);
    expect(wallet.tables['!room']).toBeUndefined();
  });

  it('keeps tables apart', () => {
    let wallet = createGameWallet(1);
    wallet = buyInUpdate(1000, '!a')(wallet);
    wallet = buyInUpdate(400, PRACTICE_TABLE)(wallet);
    wallet = recoverUpdate(PRACTICE_TABLE)(wallet);
    expect(wallet.balance).toBe(4000);
    expect(wallet.tables).toEqual({ '!a': 1000 });
  });

  it('refunds a seat that did not happen, never more than is at the table', () => {
    let wallet = buyInUpdate(500, '!a')(createGameWallet(1));
    wallet = refundUpdate(800, '!a')(wallet);
    expect(wallet.balance).toBe(STARTING_BALANCE);
    expect(wallet.tables['!a']).toBeUndefined();
  });

  it('refuses buy-ins it cannot cover', () => {
    expect(() => buyInUpdate(6000, '!a')(createGameWallet(1))).toThrow();
    expect(() => buyInUpdate(-5, '!a')(createGameWallet(1))).toThrow();
  });

  it('reads the first version, which had a single practice table', () => {
    const wallet = parseGameWallet({ balance: 3000, atTable: 2000, createdAt: 1, updatedAt: 2 });
    expect(wallet?.tables).toEqual({ [PRACTICE_TABLE]: 2000 });
    expect(parseGameWallet({ balance: -1 })).toBeUndefined();
  });
});
