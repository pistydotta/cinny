import React, { ReactNode } from 'react';
import { Icon, Icons } from 'folds';
import { tr } from '../../translation/tr';
import * as css from './gameUi.css';

// The bar at the top of every game screen: back, the title and a line under it, then whatever
// the screen adds (the wallet or score, and up to three actions).
export function GameTopBar({
  title,
  subtitle,
  onBack,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onBack?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className={css.TopBar}>
      {onBack && (
        <button
          type="button"
          className={css.gameIconButton()}
          onClick={onBack}
          aria-label={tr('games.action.back', 'Back')}
        >
          <Icon size="200" src={Icons.ArrowLeft} />
        </button>
      )}
      <div className={css.TopTitle}>
        <span className={css.TopTitleText}>{title}</span>
        {subtitle && <span className={css.TopSubtitle}>{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

// Coins in the wallet, in money gold; `extra` (what's at the tables) hides on phones.
export function GameWallet({ value, extra }: { value: ReactNode; extra?: ReactNode }) {
  return (
    <div className={css.Wallet} title={tr('games.wallet.hint', 'Coins in your wallet')}>
      <span className={css.Coin}>$</span>
      <span className={css.WalletValue}>{value}</span>
      {extra && <span className={css.WalletExtra}>· {extra}</span>}
    </div>
  );
}
