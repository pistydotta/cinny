import { useCallback } from 'react';
import { atom, useSetAtom } from 'jotai';
import { Room } from 'matrix-js-sdk';
import { useCallEmbed, useCallStart } from '../../hooks/useCallEmbed';
import { CallPreferences } from '../../state/callPreferences';
import { leaveCall } from './leaveCall';

// The room we're moving to while the current call is being left, so its Join button can spin.
export const switchingToCallAtom = atom<string | undefined>(undefined);

// Like Discord: joining a call while in another one leaves that one first.
export const useSwitchCall = (dm = false) => {
  const callEmbed = useCallEmbed();
  const startCall = useCallStart(dm);
  const setSwitchingTo = useSetAtom(switchingToCallAtom);

  return useCallback(
    async (room: Room, pref?: CallPreferences) => {
      if (callEmbed?.roomId === room.roomId) return;
      if (callEmbed) {
        setSwitchingTo(room.roomId);
        try {
          await leaveCall(callEmbed);
        } finally {
          setSwitchingTo(undefined);
        }
      }
      startCall(room, pref);
    },
    [callEmbed, startCall, setSwitchingTo]
  );
};
