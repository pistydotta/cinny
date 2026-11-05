import React, { ReactNode, useCallback, useState } from 'react';
import { Room } from 'matrix-js-sdk';
import { PopOut, RectCords } from 'folds';
import FocusTrap from 'focus-trap-react';
import { useOpenUserRoomProfile } from '../../state/hooks/userRoomProfile';
import { stopPropagation } from '../../utils/keyboard';
import { CallMemberCard } from './CallMemberCard';

type CallMemberPopoutProps = {
  room: Room;
  userId: string;
  name: string;
  children: (open: (evt: React.MouseEvent<HTMLElement>) => void, opened: boolean) => ReactNode;
};

// Opens the card beside a person listed under a voice room in the sidebar.
export function CallMemberPopout({ room, userId, name, children }: CallMemberPopoutProps) {
  const [anchor, setAnchor] = useState<RectCords>();
  const openProfile = useOpenUserRoomProfile();
  const close = useCallback(() => setAnchor(undefined), []);

  const open = (evt: React.MouseEvent<HTMLElement>) => {
    const rect = evt.currentTarget.getBoundingClientRect();
    setAnchor((current) => (current ? undefined : rect));
  };

  return (
    <PopOut
      anchor={anchor}
      position="Right"
      align="Start"
      content={
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            returnFocusOnDeactivate: false,
            onDeactivate: close,
            clickOutsideDeactivates: true,
            escapeDeactivates: stopPropagation,
          }}
        >
          <CallMemberCard
            room={room}
            userId={userId}
            name={name}
            requestClose={close}
            onOpenProfile={() => {
              if (anchor) openProfile(room.roomId, undefined, userId, anchor, 'Right');
              close();
            }}
          />
        </FocusTrap>
      }
    >
      {children(open, !!anchor)}
    </PopOut>
  );
}
