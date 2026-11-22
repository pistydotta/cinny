import React, { useEffect, useState } from 'react';
import { ApiError } from '../../../utils/blazeroomApi';
import { tr } from '../../translation/tr';
import { SwitchOption, SwitchTableDialog } from '../switch-table/SwitchTableDialog';
import { createTableGamesApi } from './api';
import { leaveStep, switchTargets } from './switchTable';
import { gameError } from './text';
import { GameTable } from './types';

type TableSwitcherProps = {
  api: ReturnType<typeof createTableGamesApi>;
  table: GameTable;
  myId: string;
  nameOf: (userId: string) => string;
  onClose: () => void;
  /** Called with the table I'm now at (or opening). */
  onGo: (tableId: string) => void;
};

const warningFor = (step: ReturnType<typeof leaveStep>, stake: number) => {
  if (step === 'cancel')
    return tr(
      'games.switch.warn_cancel',
      'You own this table: going to another cancels it and refunds every stake.'
    );
  if (step === 'leave')
    return stake
      ? tr('games.switch.warn_leave', 'You leave this table and get your stake back.')
      : tr('games.switch.warn_leave_free', 'You leave this table.');
  if (step === 'resign')
    return stake
      ? tr(
          'games.switch.warn_resign',
          'The game is running: going to another table resigns it, and your stake is lost.'
        )
      : tr(
          'games.switch.warn_resign_free',
          'The game is running: going to another table resigns it.'
        );
  return undefined;
};

/** Truco, Fodinha and chess: leave this table by its own rules and sit at another of the same game. */
export function TableSwitcher({ api, table, myId, nameOf, onClose, onGo }: TableSwitcherProps) {
  const [options, setOptions] = useState<SwitchOption[]>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const step = leaveStep(table, myId);

  useEffect(() => {
    let live = true;
    api
      .list(table.kind)
      .then((tables) => {
        if (!live) return;
        setOptions(
          switchTargets(tables, table.id, myId).map((t) => ({
            id: t.id,
            name: t.name,
            mine: t.mine,
            detail: [
              `${t.players.length}/${t.capacity}`,
              t.stake
                ? tr('table_games.credits_n', '{{n}} credits', { n: t.stake })
                : tr('table_games.free', 'free'),
              t.players.slice(0, 3).map(nameOf).join(', '),
            ].join(' · '),
          }))
        );
      })
      .catch((e) => live && setError(gameError(e instanceof ApiError ? e.code : undefined)));
    return () => {
      live = false;
    };
    // The list is read once per opening; the polled table would refetch it every two seconds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, table.id, table.kind, myId]);

  const pick = async (option: SwitchOption) => {
    setBusy(true);
    setError(undefined);
    try {
      if (!option.mine) {
        if (step) await api.act(table, { type: step });
        await api.join(option.id);
      }
      onGo(option.id);
    } catch (e) {
      setError(gameError(e instanceof ApiError ? e.code : undefined));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SwitchTableDialog
      options={options}
      warning={warningFor(step, table.stake)}
      error={error}
      busy={busy}
      onPick={pick}
      onCancel={onClose}
    />
  );
}
