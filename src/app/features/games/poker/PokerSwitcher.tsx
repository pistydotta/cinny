import React, { useEffect, useState } from 'react';
import { ApiError } from '../../../utils/blazeroomApi';
import { tr } from '../../translation/tr';
import { SwitchOption, SwitchTableDialog } from '../switch-table/SwitchTableDialog';
import { createPokerApi } from './api';
import { errorText } from './errorText';
import { pokerTargets, PokerTarget } from './switchTargets';
import { formatChips } from './types';

type PokerSwitcherProps = {
  api: ReturnType<typeof createPokerApi>;
  tableId: string;
  /** Seated here: going elsewhere stands me up, and my chips go back to the wallet. */
  seated: boolean;
  onClose: () => void;
  onGo: (tableId: string) => void;
};

/** Leave this poker table the usual way and open another friends' table. */
export function PokerSwitcher({ api, tableId, seated, onClose, onGo }: PokerSwitcherProps) {
  const [targets, setTargets] = useState<PokerTarget[]>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const describe = (e: unknown) => errorText(e instanceof ApiError ? e.code : 'unknown');

  useEffect(() => {
    let live = true;
    api
      .list()
      .then((list) => live && setTargets(pokerTargets(list, tableId)))
      .catch((e) => live && setError(describe(e)));
    return () => {
      live = false;
    };
  }, [api, tableId]);

  const pick = async (option: SwitchOption) => {
    const target = targets?.find((t) => t.id === option.id);
    if (!target) return;
    setBusy(true);
    setError(undefined);
    try {
      if (seated) await api.leave(tableId);
      if (target.via === 'invite') await api.accept(target.id);
      if (target.via === 'public') await api.joinPublic(target.id);
      onGo(target.id);
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  };

  const via = (t: PokerTarget) => {
    if (t.via === 'invite') return tr('games.switch.poker_invite', 'invited you');
    if (t.via === 'public') return tr('games.switch.poker_public', 'public');
    return tr('games.switch.poker_mine', 'your table');
  };

  return (
    <SwitchTableDialog
      options={targets?.map((t) => ({
        id: t.id,
        name: t.name,
        mine: t.via === 'member',
        detail: [
          `${formatChips(t.smallBlind)}/${formatChips(t.bigBlind)}`,
          tr('games.switch.poker_members', '{{count}} at the table', { count: t.members }),
          via(t),
        ].join(' · '),
      }))}
      warning={
        seated
          ? tr(
              'games.switch.warn_poker',
              'You stand up from this table and your chips go back to your wallet (after the current hand, if you are in it).'
            )
          : undefined
      }
      error={error}
      busy={busy}
      onPick={pick}
      onCancel={onClose}
    />
  );
}
