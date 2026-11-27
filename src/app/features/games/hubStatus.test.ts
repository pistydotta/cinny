import { describe, expect, it } from 'vitest';
import { gameStatus } from './hubStatus';

describe('gameStatus', () => {
  const t = (game: string, role: 'seated' | 'open' | 'watch', idle?: boolean) => ({
    game,
    role,
    idle,
  });

  it('points at your own table before anything else', () => {
    const mine = t('truco', 'seated');
    expect(gameStatus([t('truco', 'open'), mine], 'truco')).toEqual({ seated: mine });
  });

  it('counts the tables of that game that are still going', () => {
    const tables = [t('poker', 'open'), t('poker', 'watch'), t('poker', 'open', true)];
    expect(gameStatus(tables, 'poker')).toEqual({ going: 2 });
  });

  it('says nothing when no table of that game is going', () => {
    expect(gameStatus([t('chess', 'open', true), t('poker', 'open')], 'chess')).toBeUndefined();
  });
});
