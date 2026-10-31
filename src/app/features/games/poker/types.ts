import { tr } from '../../translation/tr';

export type Suit = 's' | 'h' | 'd' | 'c';

/** 2..14, where 11 = J, 12 = Q, 13 = K and 14 = A. */
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export type Card = {
  rank: Rank;
  suit: Suit;
};

export const SUIT_SYMBOL: Record<Suit, string> = {
  s: '♠',
  h: '♥',
  d: '♦',
  c: '♣',
};

const SUIT_EN: Record<Suit, string> = {
  s: 'Spades',
  h: 'Hearts',
  d: 'Diamonds',
  c: 'Clubs',
};

export const suitName = (suit: Suit): string => tr(`games.suit.${suit}`, SUIT_EN[suit]);

export const RANK_LABEL: Record<Rank, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

export const isRedSuit = (suit: Suit): boolean => suit === 'h' || suit === 'd';

export const formatChips = (amount: number): string => amount.toLocaleString('pt-BR');

export type PlayerStatus = 'sitting-out' | 'active' | 'folded' | 'allin';

export type LastActionType = 'sb' | 'bb' | 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';

export type LastAction = {
  type: LastActionType;
  amount?: number;
};

export type PokerAction =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  /** Bet or raise TO `amount`, the player's total on this street. */
  | { type: 'raise'; amount: number };

/** A hand's name as the server sends it: a key and numeric ranks or a suit letter. */
export type HandName = {
  key: string;
  params: Record<string, number | string>;
};

export type LogParam = string | number | HandName;

export type LogEntry = {
  id: number;
  hand: number;
  key: string;
  params: Record<string, LogParam>;
};

export type ViewPlayer = {
  id: string;
  name: string;
  avatarUrl: string | null;
  seat: number;
  stack: number;
  streetBet: number;
  totalBet: number;
  status: PlayerStatus;
  lastAction: LastAction | null;
  isBot: boolean;
  away: boolean;
  leaving: boolean;
  hasCards: boolean;
  holeCards: Card[];
};

/** Present only on the viewer's turn; `hand` and `seq` are quoted back when acting. */
export type ViewLegal = {
  toCall: number;
  canCheck: boolean;
  canCall: boolean;
  callAmount: number;
  canRaise: boolean;
  isBet: boolean;
  minRaiseTo: number;
  maxRaiseTo: number;
  hand: number;
  seq: number;
};

export type ViewPot = {
  amount: number;
  eligibleIds: string[];
  winnerIds: string[];
  handName?: HandName;
};

export type ViewResult = {
  pots: ViewPot[];
  payouts: Record<string, number>;
  hands: Record<string, { name: HandName; cards: Card[] }>;
  byFold: boolean;
};

export type TableView = {
  id: string;
  name: string;
  kind: 'friends' | 'practice';
  ownerId: string;
  isOwner: boolean;
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
  maxBuyIn: number;
  /** Grows with every change to the table; a view with a lower one is stale. */
  version: number;
  handNumber: number;
  phase: 'waiting' | 'betting' | 'street-complete' | 'complete';
  street: 'preflop' | 'flop' | 'turn' | 'river';
  board: Card[];
  pot: number;
  buttonSeat: number | null;
  sbSeat: number | null;
  bbSeat: number | null;
  actingSeat: number | null;
  /** Epoch milliseconds, or null when nobody is on the clock. */
  turnDeadline: number | null;
  log: LogEntry[];
  result: ViewResult | null;
  legal: ViewLegal | null;
  /** The viewer's best hand from their cards and the board; null without cards. */
  myHand: HandName | null;
  pendingChips: number;
  players: ViewPlayer[];
};

export type LobbyTable = {
  id: string;
  name: string;
  smallBlind: number;
  bigBlind: number;
  ownerId: string;
  memberCount: number;
  myChips: number;
};

export type LobbyList = {
  tables: LobbyTable[];
  invites: (LobbyTable & { invitedBy: string })[];
  practiceId: string | null;
};

/** What a play route answers: the viewer's new view, or that the table is gone. */
export type PlayReply = TableView | { closed: true };
