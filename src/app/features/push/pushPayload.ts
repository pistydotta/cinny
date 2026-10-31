// Imported by the service worker, which has no i18n or app state: only plain code here, and the
// language comes in the push itself (`default_payload` in pushApi.ts).
const NEW_MESSAGE = { pt: 'nova mensagem', en: 'new message' };
const CALLING = { pt: 'está chamando', en: 'is calling' };
const CALL_ENDED = { pt: 'Chamada encerrada', en: 'Call ended' };
const CALL_MEMBER_TYPE = 'org.matrix.msc3401.call.member';

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value ? value : undefined;

const capitalized = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

export type PushDisplay = {
  title: string;
  body: string;
  tag: string;
  data: { roomId: string; eventId: string };
  isCall: boolean;
  callEnded: boolean;
};

// What to show for a push from Sygnal. In an encrypted room `content` only has ciphertext, so
// there's no `body`. Null when there's nothing to show, like an unread count update.
export const pushNotification = (payload: unknown): PushDisplay | null => {
  if (typeof payload !== 'object' || payload === null) return null;
  const push = payload as Record<string, unknown>;

  const eventId = text(push.event_id);
  const roomId = text(push.room_id);
  if (!eventId || !roomId) return null;

  const sender = text(push.sender_display_name) ?? text(push.sender);
  const roomName = text(push.room_name);
  const content = push.content as Record<string, unknown> | null | undefined;
  const written = typeof content === 'object' ? text(content?.body) : undefined;
  const lang = push.lang === 'en' ? 'en' : 'pt';
  const generic = NEW_MESSAGE[lang];

  if (push.type === CALL_MEMBER_TYPE) {
    // Leaving a call empties the event. The tag lets the end replace the ring.
    const callEnded = typeof content !== 'object' || !content || !Object.keys(content).length;
    return {
      title: sender ?? 'blazeroom',
      body: callEnded ? CALL_ENDED[lang] : `${sender ?? 'blazeroom'} ${CALLING[lang]}`,
      tag: `call:${roomId}`,
      data: { roomId, eventId },
      isCall: true,
      callEnded,
    };
  }

  return {
    title: roomName ?? sender ?? 'blazeroom',
    body: roomName && sender ? `${sender}: ${written ?? generic}` : written ?? capitalized(generic),
    tag: eventId,
    data: { roomId, eventId },
    isCall: false,
    callEnded: false,
  };
};

// The ring a join and the room's encrypted notification add up to (callPairing.ts).
export const callRingNotification = (payload: Record<string, unknown>): PushDisplay | null =>
  pushNotification({ ...payload, type: CALL_MEMBER_TYPE, content: { joined: true } });
