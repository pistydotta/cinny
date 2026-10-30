// Imported by the service worker, which has no i18n or app state: only plain code here, and the
// language comes in the push itself (`default_payload` in pushApi.ts).
const NEW_MESSAGE = { pt: 'nova mensagem', en: 'new message' };

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value ? value : undefined;

const capitalized = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

export type PushDisplay = {
  title: string;
  body: string;
  tag: string;
  data: { roomId: string; eventId: string };
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
  const generic = NEW_MESSAGE[push.lang === 'en' ? 'en' : 'pt'];

  return {
    title: roomName ?? sender ?? 'blazeroom',
    body: roomName && sender ? `${sender}: ${written ?? generic}` : written ?? capitalized(generic),
    tag: eventId,
    data: { roomId, eventId },
  };
};
