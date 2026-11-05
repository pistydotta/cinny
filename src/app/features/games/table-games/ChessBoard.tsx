import React, { useState } from 'react';
import { tr } from '../../translation/tr';
import { GameTable } from './types';
import * as css from './tableGames.css';

const SYMBOLS: Record<string, string> = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const pieceName = (piece: string) =>
  ({
    k: tr('table_games.king', 'King'),
    q: tr('table_games.queen', 'Queen'),
    r: tr('table_games.rook', 'Rook'),
    b: tr('table_games.bishop', 'Bishop'),
    n: tr('table_games.knight', 'Knight'),
    p: tr('table_games.pawn', 'Pawn'),
  }[piece] ?? piece);

export function ChessBoard({
  table,
  busy,
  onMove,
}: {
  table: GameTable;
  busy: boolean;
  onMove: (action: Record<string, unknown>) => void;
}) {
  const [selected, setSelected] = useState('');
  const [promotion, setPromotion] = useState('q');
  const moves = table.legalMoves ?? [];
  const board = table.board ?? [];
  const squares =
    table.mySeat === 1
      ? board
          .flat()
          .map((p, i) => ({ piece: p, i }))
          .reverse()
      : board.flat().map((p, i) => ({ piece: p, i }));
  return (
    <div>
      <div className={css.Board} role="group" aria-label={tr('table_games.board', 'Chessboard')}>
        {squares.map(({ piece, i }) => {
          const square = `${'abcdefgh'[i % 8]}${8 - Math.floor(i / 8)}`;
          const legal = moves.some((m) => m.from === selected && m.to === square);
          const label = piece
            ? `${
                piece.color === 'w'
                  ? tr('table_games.white', 'White')
                  : tr('table_games.black', 'Black')
              } ${pieceName(piece.type)}`
            : tr('table_games.empty', 'Empty');
          return (
            <button
              key={square}
              type="button"
              className={css.Square}
              data-dark={(Math.floor(i / 8) + (i % 8)) % 2 === 1}
              data-color={piece?.color}
              data-selected={selected === square}
              data-legal={legal}
              aria-label={`${square}: ${label}`}
              aria-pressed={selected === square}
              disabled={busy}
              onClick={() => {
                if (legal) {
                  onMove({ type: 'move', from: selected, to: square, promotion });
                  setSelected('');
                } else setSelected(moves.some((m) => m.from === square) ? square : '');
              }}
            >
              {piece && SYMBOLS[piece.type]}
              <span className={css.Coordinate}>{square}</span>
            </button>
          );
        })}
      </div>
      {table.mySeat >= 0 && table.phase === 'play' && (
        <label className={css.Label} htmlFor="chess-promotion">
          {tr('table_games.promotion', 'Promote pawn to')}
          <select
            id="chess-promotion"
            className={css.Input}
            value={promotion}
            onChange={(e) => setPromotion(e.target.value)}
          >
            {['q', 'r', 'b', 'n'].map((p) => (
              <option key={p} value={p}>
                {pieceName(p)}
              </option>
            ))}
          </select>
        </label>
      )}
      {table.check && <p>{tr('table_games.check', 'Check')}</p>}
      <p className={css.Muted} aria-label={tr('table_games.moves', 'Moves')}>
        {table.moves
          ?.map((m, i) => `${i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : ''}${m}`)
          .join(' ')}
      </p>
    </div>
  );
}
