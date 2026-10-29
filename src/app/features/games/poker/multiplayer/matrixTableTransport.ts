import { Direction, MatrixClient, MatrixEvent, Preset, Room, RoomEvent } from 'matrix-js-sdk';
import {
  parseEventContent,
  parseTableConfig,
  POKER_EVENT,
  POKER_ROOM_TYPE,
  POKER_TABLE_STATE,
  TableConfig,
  TableEvent,
} from './protocol';
import { TableTransport } from './transport';

const MAX_HISTORY_PAGES = 40;

/** A table event, once the server has confirmed it (our own local echoes are skipped). */
export const toTableEvent = (event: MatrixEvent): TableEvent | undefined => {
  if (event.getType() !== POKER_EVENT || event.status !== null) return undefined;
  const id = event.getId();
  const sender = event.getSender();
  if (!id || !id.startsWith('$') || !sender) return undefined;
  const content = parseEventContent(event.getContent());
  if (!content) return undefined;
  return { id, sender, ts: event.getTs(), content };
};

export const isPokerTableRoom = (room: Room): boolean =>
  room.currentState.getStateEvents('m.room.create', '')?.getContent()?.type === POKER_ROOM_TYPE;

export const getTableConfig = (room: Room): TableConfig | undefined =>
  parseTableConfig(room.currentState.getStateEvents(POKER_TABLE_STATE, '')?.getContent());

export const createMatrixTableTransport = (
  mx: MatrixClient,
  room: Room,
  config: TableConfig
): TableTransport => {
  const createEvent = room.currentState.getStateEvents('m.room.create', '');

  const collect = (): TableEvent[] =>
    room
      .getLiveTimeline()
      .getEvents()
      .map(toTableEvent)
      .filter((ev): ev is TableEvent => !!ev);

  return {
    userId: mx.getUserId() as string,
    config,
    createdTs: createEvent?.getTs() ?? 0,

    loadHistory: async () => {
      const timeline = room.getLiveTimeline();
      // Page back until we find the last deal (it carries a snapshot of the table) or the start.
      for (let page = 0; page < MAX_HISTORY_PAGES; page += 1) {
        if (collect().some((ev) => ev.content.kind === 'start')) break;
        if (!timeline.getPaginationToken(Direction.Backward)) break;
        // eslint-disable-next-line no-await-in-loop
        const more = await mx.paginateEventTimeline(timeline, { backwards: true, limit: 100 });
        if (!more) break;
      }
      return collect();
    },

    subscribe: (onEvent, onGap) => {
      const handleTimeline = (
        event: MatrixEvent,
        eventRoom: Room | undefined,
        toStartOfTimeline: boolean | undefined
      ) => {
        if (eventRoom?.roomId !== room.roomId || toStartOfTimeline) return;
        const tableEvent = toTableEvent(event);
        if (tableEvent) onEvent(tableEvent);
      };
      // Our own events get their server id and timestamp here.
      const handleEcho = (event: MatrixEvent) => {
        const tableEvent = toTableEvent(event);
        if (tableEvent) onEvent(tableEvent);
      };
      const handleReset = () => onGap();

      room.on(RoomEvent.Timeline, handleTimeline);
      room.on(RoomEvent.LocalEchoUpdated, handleEcho);
      room.on(RoomEvent.TimelineReset, handleReset);
      return () => {
        room.removeListener(RoomEvent.Timeline, handleTimeline);
        room.removeListener(RoomEvent.LocalEchoUpdated, handleEcho);
        room.removeListener(RoomEvent.TimelineReset, handleReset);
      };
    },

    send: async (content) => {
      await mx.sendEvent(room.roomId, POKER_EVENT as any, content as any);
    },
  };
};

export type CreateTableOptions = {
  config: TableConfig;
  invite: string[];
};

/** Creates the room that holds a shared table. Returns its room id. */
export const createPokerTableRoom = async (
  mx: MatrixClient,
  { config, invite }: CreateTableOptions
): Promise<string> => {
  const result = await mx.createRoom({
    name: config.name,
    topic: `Mesa de poker · Blinds ${config.smallBlind}/${config.bigBlind}`,
    invite,
    preset: Preset.PrivateChat,
    creation_content: { type: POKER_ROOM_TYPE },
    initial_state: [
      {
        type: POKER_TABLE_STATE,
        state_key: '',
        content: config,
      },
    ],
  });
  return result.room_id;
};
