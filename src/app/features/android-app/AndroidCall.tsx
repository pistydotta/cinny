import { useEffect, useRef } from 'react';
import { useCallEmbed, useCallJoined } from '../../hooks/useCallEmbed';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useSwitchCall } from '../call-switch/useSwitchCall';
import { useOpenPushRoom } from '../push/PushNotifications';
import { callStateMessage, pendingCallRoom } from './androidApp';
import { androidBridge } from './androidBridge';

const JOIN_WAIT_MS = 15000;
const JOIN_POLL_MS = 500;

// Tells the app this phone is in a call, so it holds the microphone with the screen off and doesn't
// ring for the same call, and joins the call the app just answered. The app hands that over the
// bridge, and only once: an address could come from a link in someone's message.
export function AndroidCall() {
  const mx = useMatrixClient();
  const embed = useCallEmbed();
  const joined = useCallJoined(embed);
  const switchCall = useSwitchCall(true);
  const openPushRoom = useOpenPushRoom();
  // These change with the call and the route, and the listeners below stay for the whole page.
  const latest = useRef({ switchCall, openPushRoom });
  latest.current = { switchCall, openPushRoom };
  const roomId = joined ? embed?.roomId : undefined;

  useEffect(() => {
    if (!roomId) return undefined;
    androidBridge.send(callStateMessage(roomId, true));
    return () => androidBridge.send(callStateMessage(roomId, false));
  }, [roomId]);

  useEffect(() => {
    if (!androidBridge.available()) return undefined;
    let timer: number | undefined;
    const off = androidBridge.on('pendingCall', (message) => {
      const answered = pendingCallRoom(message);
      if (!answered) return;
      latest.current.openPushRoom(answered);
      window.clearTimeout(timer);
      const deadline = Date.now() + JOIN_WAIT_MS;
      const tryJoin = () => {
        // The caller may have given up by now, and joining an empty call would start a new one.
        const room = mx.getRoom(answered);
        if (room && mx.matrixRTC.getRoomSession(room).memberships.length > 0) {
          latest.current
            .switchCall(room, { microphone: true, video: false, sound: true })
            .catch((e: unknown) => {
              // eslint-disable-next-line no-console
              console.warn("Couldn't join the call", e);
            });
          return;
        }
        if (Date.now() < deadline) timer = window.setTimeout(tryJoin, JOIN_POLL_MS);
      };
      tryJoin();
    });
    const offOpen = androidBridge.on('openRoom', ({ roomId: room, eventId }) => {
      if (typeof room === 'string' && room) {
        latest.current.openPushRoom(room, typeof eventId === 'string' ? eventId : undefined);
      }
    });
    androidBridge.send({ type: 'getPendingCall' });
    return () => {
      off();
      offOpen();
      window.clearTimeout(timer);
    };
  }, [mx]);

  return null;
}
