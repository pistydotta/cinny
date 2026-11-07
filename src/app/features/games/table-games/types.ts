export type GameKind = 'truco' | 'fodinha' | 'chess';
export type TableCard = { rank: string; suit: string; covered?: boolean };
export type GamePlayer = {
  userId: string;
  cards?: TableCard[];
  cardCount: number;
  eliminated: boolean;
  prediction: number | null;
  penalties: number;
  won: number;
};
export type BoardPiece = { square: string; type: string; color: string };
export type LegalMove = { from: string; to: string; promotion?: string };
export type GameTable = {
  id: string;
  ownerId: string;
  name: string;
  kind: GameKind;
  stake: number;
  capacity: number;
  players: GamePlayer[];
  phase: 'waiting' | 'predict' | 'play' | 'respond' | 'eleven' | 'round_end' | 'finished';
  mySeat: number;
  version: number;
  revision: number;
  turn: number | null;
  deadline: number | null;
  round?: number;
  handSize: number;
  // Fodinha: the one-card round, where you see every card but your own.
  blind?: boolean;
  scores?: number[];
  vira?: TableCard;
  value?: number;
  iron?: boolean;
  eleven?: boolean;
  decisionTeam?: number;
  lastRaise?: number | null;
  pending?: { team: number; value: number };
  trick?: { seat: number; card: TableCard }[];
  lastTrick?: { seat: number; card: TableCard }[];
  lastWinner?: number | null;
  // Truco: the pair that took the last hand (null: three ties) and the points it scored.
  handWinner?: number | null;
  handPoints?: number;
  invited?: string[];
  winners?: number[];
  result?: string;
  comments: { id: string; userId: string; text: string; at: number }[];
  board?: (BoardPiece | null)[][];
  check?: boolean;
  moves?: string[];
  legalMoves?: LegalMove[];
};
export type TableSummary = Pick<
  GameTable,
  'id' | 'name' | 'kind' | 'stake' | 'capacity' | 'phase'
> & { players: string[]; invited?: string[] };
