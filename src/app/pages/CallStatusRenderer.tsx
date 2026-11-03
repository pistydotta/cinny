import React from 'react';
import { useCallEmbed } from '../hooks/useCallEmbed';
import { CallStatus } from '../features/call-status';
import { useSelectedRoom } from '../hooks/router/useSelectedRoom';
import { ScreenSize, useScreenSizeContext } from '../hooks/useScreenSize';
import { ShareAutoWatch } from '../features/screen-share/ShareAutoWatch';

export function CallStatusRenderer() {
  const callEmbed = useCallEmbed();
  const selectedRoom = useSelectedRoom();

  const screenSize = useScreenSizeContext();

  if (!callEmbed) return null;

  const hidden = screenSize === ScreenSize.Mobile && callEmbed.roomId === selectedRoom;

  return (
    <>
      <ShareAutoWatch callEmbed={callEmbed} />
      {!hidden && <CallStatus callEmbed={callEmbed} />}
    </>
  );
}
