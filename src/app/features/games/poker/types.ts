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

export type Street = 'preflop' | 'flop' | 'turn' | 'river';

export type CoachAdvice = {
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'shove';
  /** Why, as a key the client turns into a sentence. */
  key: string;
  /** Total for the street, for a bet, raise or shove. */
  amount?: number;
};

export type CoachSize = { key: string; purpose: string; amount: number; recommended: boolean };

export type CoachTier = 'strong' | 'medium' | 'weak';

/** The coach's read of the viewer's spot while they are on the clock. */
export type CoachHint = {
  hand: number;
  seq: number;
  street: Street;
  position: string | null;
  pot: number;
  toCall: number;
  stackBb: number;
  effectiveBb: number;
  spr: number | null;
  opponents: number;
  /** Against random hands, 0 to 1. */
  equity: number;
  /** After the flop: against the range that matters in this spot. */
  versus: number | null;
  tier: CoachTier | null;
  potOdds: number | null;
  chen: number | null;
  texture: 'dry' | 'wet' | 'paired' | null;
  pushFold: boolean;
  sizes: CoachSize[];
  advice: CoachAdvice;
};

export type CoachVerdict = { kind: 'good' | 'warn' | 'bad'; key: string; evLoss: number };

export type ReviewDecision = {
  street: Street;
  position: string | null;
  pot: number;
  toCall: number;
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise';
  amount: number;
  equity: number;
  versus: number | null;
  potOdds: number | null;
  chen: number | null;
  advice: CoachAdvice;
  verdict: CoachVerdict;
};

export type HandReview = {
  hand: number;
  cards: Card[];
  board: Card[];
  decisions: ReviewDecision[];
  /** Chips won or lost in the hand. */
  net: number;
  showdown: boolean;
};

export type CoachStats = {
  vpip: number;
  pfr: number;
  bets: number;
  raises: number;
  calls: number;
  folds: number;
  checks: number;
  valueBets: number;
  bluffs: number;
  showdowns: number;
  showdownWins: number;
  good: number;
  warn: number;
  bad: number;
  evLoss: number;
};

export type CostlyDecision = {
  hand: number;
  level: number;
  street: Street;
  cards: Card[];
  board: Card[];
  action: ReviewDecision['action'];
  amount: number;
  key: string;
  evLoss: number;
};

export type TournamentReport = {
  place: number | null;
  prize: number;
  hands: number;
  /** Null without the coach. */
  stats: CoachStats | null;
  worst: CostlyDecision[];
};

export type TournamentBlinds = { smallBlind: number; bigBlind: number; ante: number };

export type TournamentEntrant = {
  userId: string;
  name: string;
  status: 'registered' | 'playing' | 'out';
  place: number | null;
  prize: number;
};

export type TournamentView = {
  status: 'registering' | 'running' | 'finished';
  field: number;
  buyIn: number;
  startStack: number;
  /** 1-based. */
  level: number;
  handsPerLevel: number;
  handsToNextLevel: number;
  nextBlinds: TournamentBlinds;
  remaining: number;
  tables: number;
  prizePool: number;
  paidPlaces: number;
  /** Prize per place, first place first. */
  payouts: number[];
  avgStack: number;
  myRank: number | null;
  leaders: { name: string; stack: number; me: boolean; atTable: boolean }[];
  entrants: TournamentEntrant[];
  me: {
    status: TournamentEntrant['status'];
    place: number | null;
    prize: number;
    coach: boolean;
    hands: number;
  } | null;
  hint: CoachHint | null;
  review: HandReview | null;
  report: TournamentReport | null;
};

export type TableView = {
  id: string;
  name: string;
  kind: 'friends' | 'practice' | 'tournament';
  ownerId: string;
  isOwner: boolean;
  /** In everyone's lobby, anyone may join. */
  isPublic: boolean;
  /** Members may invite any account, not only their friends. */
  inviteAnyone: boolean;
  smallBlind: number;
  bigBlind: number;
  ante?: number;
  maxSeats?: number;
  tournament?: TournamentView | null;
  minBuyIn: number;
  maxBuyIn: number;
  /** Grows with every change to the table; a view with a lower one is stale. */
  version: number;
  handNumber: number;
  phase: 'waiting' | 'betting' | 'street-complete' | 'complete';
  street: 'preflop' | 'flop' | 'turn' | 'river';
  board: Card[];
  pot: number;
  currentBet?: number;
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
  /** Best five cards, using only the viewer's cards and public board; empty before the flop. */
  myHandCards?: Card[];
  canFoldNow?: boolean;
  /** The viewer lost the showdown and mucked; they may still show their cards. */
  canShowCards?: boolean;
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
  /** When the table last dealt a hand (epoch ms); null before the first. Older APIs omit it. */
  lastHandAt?: number | null;
  /** Who sits at the table now. */
  seated?: string[];
};

export type TableMember = { userId: string; status: 'member' | 'invited' };

export type LobbyList = {
  tables: LobbyTable[];
  /** Tournaments I'm in or invited to. */
  tournaments?: {
    id: string;
    ownerId: string;
    status: 'member' | 'invited';
    invitedBy: string | null;
  }[];
  /** Public tables I'm not in yet. */
  publicTables: LobbyTable[];
  invites: (LobbyTable & { invitedBy: string })[];
  practiceId: string | null;
};

/** What a play route answers: the viewer's new view, or that the table is gone. */
export type PlayReply = TableView | { closed: true };
