import React, { CSSProperties } from 'react';
import { Icon, Icons } from 'folds';
import { Card, formatChips } from './poker/engine';
import { PlayingCard } from './poker/table/PlayingCard';
import { ChipStack } from './poker/table/Chips';
import { GameWallet, STARTING_BALANCE } from './wallet/gameWallet';
import * as css from './gamesHub.css';

const ROYAL: Card[] = [
  { rank: 10, suit: 's' },
  { rank: 11, suit: 's' },
  { rank: 12, suit: 's' },
  { rank: 13, suit: 's' },
  { rank: 14, suit: 's' },
];

type GamesHubProps = {
  wallet: GameWallet;
  onOpenPoker: () => void;
  onBack?: () => void;
};

export function GamesHub({ wallet, onOpenPoker, onBack }: GamesHubProps) {
  return (
    <div className={css.Hub}>
      <div className={css.HubInner}>
        <div className={css.HubHeader}>
          {onBack && (
            <button type="button" className={css.BackButton} onClick={onBack} aria-label="Voltar">
              <Icon size="200" src={Icons.ArrowLeft} />
            </button>
          )}
          <div>
            <h1 className={css.Title}>Jogos</h1>
            <p className={css.Subtitle}>
              Jogue com suas moedas. O saldo é o mesmo em todos os jogos.
            </p>
          </div>
        </div>

        <div className={css.WalletCard}>
          <div className={css.BigCoin}>$</div>
          <div className={css.WalletInfo}>
            <span className={css.WalletLabel}>Sua carteira</span>
            <span className={css.WalletBalance}>
              {wallet.ready ? formatChips(wallet.balance) : '—'} moedas
            </span>
            <span className={css.WalletHint}>
              {wallet.atTable > 0
                ? `${formatChips(
                    wallet.atTable
                  )} moedas estão em uma mesa e voltam quando você sair dela.`
                : `Toda conta nova começa com ${formatChips(STARTING_BALANCE)} moedas.`}
            </span>
          </div>
        </div>

        <h2 className={css.SectionTitle}>Escolha um jogo</h2>
        <div className={css.Grid}>
          <div className={css.GameCard} data-playable="true">
            <div className={css.PokerArt}>
              {ROYAL.map((card, i) => (
                <PlayingCard
                  key={`${card.rank}${card.suit}`}
                  className={css.ArtCard}
                  card={card}
                  faceUp
                  style={
                    {
                      transform: `rotate(${(i - 2) * 9}deg) translateY(${Math.abs(i - 2) * 6}px)`,
                    } as CSSProperties
                  }
                />
              ))}
              <div className={css.ArtChips}>
                <ChipStack amount={1625} />
                <ChipStack amount={525} />
              </div>
            </div>
            <div className={css.CardBody}>
              <span className={css.GameName}>Poker</span>
              <span className={css.GameMeta}>Texas Hold’em sem limite · 2 a 6 jogadores</span>
              <button type="button" className={css.PlayButton} onClick={onOpenPoker}>
                Jogar
              </button>
            </div>
          </div>

          <div className={css.GameCard}>
            <div className={css.SoonArt}>?</div>
            <div className={css.CardBody}>
              <span className={css.GameName}>Mais jogos</span>
              <span className={css.GameMeta}>Novos jogos vão usar a mesma carteira.</span>
              <button type="button" className={css.PlayButton} disabled>
                Em breve
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
