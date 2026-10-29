import { PokerEventContent, TableConfig, TableEvent } from './protocol';

/** How a shared table talks to the other players. */
export type TableTransport = {
  /** Local user id. */
  userId: string;
  config: TableConfig;
  /** When the table was created (server time). */
  createdTs: number;
  /** Past table events, at least back to the last deal when there is one. */
  loadHistory: () => Promise<TableEvent[]>;
  /**
   * Calls `onEvent` for every new table event, once it has its final server timestamp. Our own
   * events come back through here too. `onGap` is called if events may have been missed.
   */
  subscribe: (onEvent: (event: TableEvent) => void, onGap: () => void) => () => void;
  send: (content: PokerEventContent) => Promise<void>;
};
