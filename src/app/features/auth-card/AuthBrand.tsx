import React, { ReactNode, useState } from 'react';
import { Box, Icon, Icons, Text } from 'folds';
import CinnySVG from '../../../../public/res/svg/cinny.svg';
import { tr } from '../translation/tr';
import * as css from './authCard.css';

export function AuthBrand({ title }: { title: string }) {
  return (
    <div className={css.Brand}>
      <div className={css.LogoTile}>
        <img className={css.Logo} src={CinnySVG} alt="blazeroom" />
      </div>
      <Text as="h1" size="H3">
        {title}
      </Text>
    </div>
  );
}

// Nearly everyone signs in to our own server, so the address is a small chip instead of a
// field. The picker only opens when it offers a choice, or when the server can't be reached
// (so the person can fix the address).
export function ServerChip({
  server,
  canChange,
  forceOpen,
  children,
}: {
  server: string;
  canChange: boolean;
  forceOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const showPicker = canChange && (open || forceOpen);
  const content = (
    <>
      <Icon size="50" src={Icons.Server} />
      <span className={css.ServerChipText}>{server.replace(/^https?:\/\//, '')}</span>
      {canChange && <span>· {tr('auth.change_server', 'change')}</span>}
    </>
  );

  if (!canChange) {
    return (
      <div className={css.Chip} title={tr('auth.server', 'Server')}>
        {content}
      </div>
    );
  }

  return (
    <Box direction="Column" alignItems="Center" gap="200">
      <button
        type="button"
        className={css.Chip}
        aria-expanded={!!showPicker}
        onClick={() => setOpen((value) => !value)}
        title={tr('auth.server', 'Server')}
      >
        {content}
      </button>
      {showPicker && <Box style={{ width: '100%' }}>{children}</Box>}
    </Box>
  );
}
