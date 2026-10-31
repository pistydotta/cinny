import { Card, cardsEqual, createDeck, RandomFn, randomInt } from './cards';
import { compareHands, evaluateBest } from './handEvaluator';
import { getLegalActions, getPlayer, getTotalPot, PokerAction, PokerState } from './game';

export type BotPersonality = {
  /** 0 plays almost any hand, 1 only premium hands. */
  tightness: number;
  /** Chance of betting or raising instead of checking or calling. */
  aggression: number;
  /** Chance of betting with a weak hand when checked to. */
  bluff: number;
};

export type BotProfile = {
  name: string;
  personality: BotPersonality;
};

export const BOT_PROFILES: BotProfile[] = [
  { name: 'Ana', personality: { tightness: 0.6, aggression: 0.55, bluff: 0.08 } },
  { name: 'Bruno', personality: { tightness: 0.3, aggression: 0.7, bluff: 0.2 } },
  { name: 'Carla', personality: { tightness: 0.75, aggression: 0.35, bluff: 0.04 } },
  { name: 'Diego', personality: { tightness: 0.45, aggression: 0.5, bluff: 0.12 } },
  { name: 'Elisa', personality: { tightness: 0.55, aggression: 0.65, bluff: 0.1 } },
  { name: 'Felipe', personality: { tightness: 0.25, aggression: 0.45, bluff: 0.15 } },
  { name: 'Gabi', personality: { tightness: 0.65, aggression: 0.6, bluff: 0.06 } },
  { name: 'Heitor', personality: { tightness: 0.4, aggression: 0.8, bluff: 0.22 } },
  { name: 'Iara', personality: { tightness: 0.7, aggression: 0.45, bluff: 0.05 } },
  { name: 'Júlio', personality: { tightness: 0.5, aggression: 0.4, bluff: 0.1 } },
];

/**
 * Monte Carlo estimate of the chance that `hole` wins at showdown against `opponents` random
 * hands, given the visible `board`. Ties count as a fraction of a win.
 */
export const estimateEquity = (
  hole: Card[],
  board: Card[],
  opponents: number,
  iterations: number,
  random: RandomFn
): number => {
  if (opponents <= 0) return 1;
  const known = [...hole, ...board];
  const remaining = createDeck().filter((c) => !known.some((k) => cardsEqual(c, k)));
  const needed = opponents * 2 + (5 - board.length);
  let score = 0;

  for (let it = 0; it < iterations; it += 1) {
    // Partial Fisher-Yates: only shuffle the cards we draw.
    const deck = remaining.slice();
    for (let i = 0; i < needed; i += 1) {
      const j = i + randomInt(deck.length - i, random);
      const tmp = deck[i];
      deck[i] = deck[j];
      deck[j] = tmp;
    }
    const fullBoard = [...board, ...deck.slice(opponents * 2, needed)];
    const mine = evaluateBest([...hole, ...fullBoard]);
    let lost = false;
    let ties = 0;
    for (let o = 0; o < opponents && !lost; o += 1) {
      const theirs = evaluateBest([deck[o * 2], deck[o * 2 + 1], ...fullBoard]);
      const cmp = compareHands(mine, theirs);
      if (cmp < 0) lost = true;
      else if (cmp === 0) ties += 1;
    }
    if (!lost) score += 1 / (ties + 1);
  }
  return score / iterations;
};

const roundTo = (amount: number, step: number) => Math.round(amount / step) * step;

export const decideBotAction = (
  state: PokerState,
  playerId: string,
  personality: BotPersonality,
  random: RandomFn
): PokerAction => {
  const legal = getLegalActions(state, playerId);
  const player = getPlayer(state, playerId);
  if (!legal || !player) throw new Error('Bot asked to act out of turn');

  const opponents = state.players.filter(
    (p) => p.id !== playerId && (p.status === 'active' || p.status === 'allin')
  ).length;
  const iterations = state.board.length === 0 ? 300 : 400;
  const equity = estimateEquity(player.holeCards, state.board, opponents, iterations, random);

  const pot = getTotalPot(state);
  const potOdds = legal.callAmount / (pot + legal.callAmount || 1);
  // >1 means better than an average hand at this table.
  const strength =
    equity * (opponents + 1) + (random() - 0.5) * 0.25 - personality.tightness * 0.3 + 0.15;
  const aggressive = random() < personality.aggression;

  const raise = (potFraction: number): PokerAction => {
    const target = state.currentBet + Math.max(state.minRaise, potFraction * (pot + legal.toCall));
    let to = roundTo(target, state.config.smallBlind);
    if (to >= legal.maxRaiseTo * 0.8) to = legal.maxRaiseTo;
    to = Math.min(legal.maxRaiseTo, Math.max(legal.minRaiseTo, to));
    return { type: 'raise', amount: to };
  };
  const passive = (): PokerAction => {
    if (legal.canCheck) return { type: 'check' };
    return equity > potOdds ? { type: 'call' } : { type: 'fold' };
  };

  if (strength > 1.9) {
    if (legal.canRaise && (aggressive || random() < 0.6)) return raise(0.7 + random() * 0.4);
    return legal.canCheck ? { type: 'check' } : { type: 'call' };
  }

  if (strength > 1.35) {
    if (legal.canRaise && aggressive && legal.toCall <= pot * 0.6) {
      return raise(0.45 + random() * 0.3);
    }
    return passive();
  }

  if (strength > 0.9) {
    if (legal.canCheck) {
      return legal.canRaise && random() < personality.aggression * 0.35
        ? raise(0.35 + random() * 0.2)
        : { type: 'check' };
    }
    // Cheap calls need a small edge; big calls need a clear one.
    const affordable = legal.callAmount <= player.stack * 0.35;
    const clearEdge = equity > potOdds + 0.05;
    return equity > potOdds * 1.1 && (affordable || clearEdge)
      ? { type: 'call' }
      : { type: 'fold' };
  }

  if (legal.canCheck) {
    return legal.canRaise && random() < personality.bluff
      ? raise(0.5 + random() * 0.25)
      : { type: 'check' };
  }
  const cheap = legal.callAmount <= state.config.bigBlind * 2;
  return cheap && equity > potOdds * 1.3 ? { type: 'call' } : { type: 'fold' };
};
