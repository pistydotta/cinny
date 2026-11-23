import React, { ReactNode } from 'react';
import { ForgeDialog } from '../../forge-theme/ForgeDialog';
import { LobbyScope } from './gameTheme.css';
import * as css from './gameUi.css';

// A game's dialog: the app's ForgeDialog in the game's own colours, following the app theme.
export function GameDialog({
  title,
  onClose,
  size,
  children,
}: {
  title: string;
  onClose: () => void;
  size?: 'sm' | 'md';
  children: ReactNode;
}) {
  return (
    <ForgeDialog
      title={title}
      onClose={onClose}
      classNames={{
        overlay: LobbyScope,
        panel: css.dialog({ size }),
        close: css.gameIconButton({ size: 'sm' }),
      }}
    >
      {children}
    </ForgeDialog>
  );
}
