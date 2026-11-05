import React, { useEffect, useRef } from 'react';
import { Menu, PopOut, Position, RectCords, toRem } from 'folds';

export function VoiceMemberPopover({
  anchor,
  position = 'Right',
  onClose,
  children,
}: {
  anchor: RectCords;
  position?: Position;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const outside = (event: Event) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape, true);
    document.addEventListener('scroll', outside, true);
    window.addEventListener('resize', onClose);
    window.addEventListener('blur', onClose);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape, true);
      document.removeEventListener('scroll', outside, true);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('blur', onClose);
    };
  }, [onClose]);
  return (
    <PopOut
      anchor={anchor}
      position={position}
      align="Start"
      offset={8}
      style={{ pointerEvents: 'none' }}
      content={
        <Menu
          ref={menuRef}
          style={{
            width: toRem(240),
            maxWidth: 'calc(100vw - 16px)',
            maxHeight: '70vh',
            overflowY: 'auto',
            pointerEvents: 'auto',
          }}
        >
          {children}
        </Menu>
      }
    />
  );
}
