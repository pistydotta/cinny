import { useEffect } from 'react';
import { useCallMembers, useCallSession } from '../../hooks/useCall';
import { CallEmbed } from '../../plugins/call/CallEmbed';
import { readSavedVolume, shouldAutoWatch } from './watchRules';
import { useShares } from './useShares';

// Opens a new share by itself when two people are in the call. Mounted from CallStatus because
// that lives for the whole call, even while the person is in another room.
export function ShareAutoWatch({ callEmbed }: { callEmbed: CallEmbed }) {
  const { store, remotes } = useShares(callEmbed.control);
  const callMembers = useCallMembers(useCallSession(callEmbed.room));

  useEffect(() => {
    if (!store) return;
    const pending = remotes.filter((share) => !share.decided);
    if (pending.length === 0) return;
    const watch = shouldAutoWatch(callMembers.map((member) => member.sender));
    if (watch === undefined) return;
    pending.forEach((share) => {
      store.markDecided(share.id);
      if (watch)
        store.watch(
          share.id,
          readSavedVolume(() => localStorage)
        );
    });
  }, [store, remotes, callMembers]);

  return null;
}
