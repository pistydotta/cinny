import React, { ReactNode, useCallback, useEffect, useState } from 'react';
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

  // A click on the call iframe never reaches this document, but it takes focus from the window.
  useEffect(() => {
    if (!anchor) return undefined;
    // One Escape closes the card, even when the focused button's tooltip would take it first.
    const onKey = (evt: KeyboardEvent) => {
      if (evt.key === 'Escape') close();
    };
    window.addEventListener('blur', close);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('blur', close);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [anchor, close]);

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
            // Focus inside the card so Escape and Tab work from the keyboard.
            returnFocusOnDeactivate: true,
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
