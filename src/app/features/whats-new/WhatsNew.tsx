import React, { CSSProperties, useState } from 'react';
import {
  Box,
  Button,
  config,
  Dialog,
  Header,
  Icon,
  IconButton,
  Icons,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Text,
  toRem,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { tr } from '../translation/tr';
import { SEEN_KEY, unseenEntries, WHATS_NEW } from './entries';

const readSeen = (): string | null => {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
};

const writeSeen = (id: string) => {
  try {
    localStorage.setItem(SEEN_KEY, id);
  } catch {
    // Without storage the dialog just shows again next time.
  }
};

const HeaderStyle: CSSProperties = {
  padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
  borderBottomWidth: config.borderWidth.B300,
};

// Shows once what changed since this browser last saw the dialog.
export function WhatsNew() {
  const [entries, setEntries] = useState(() => unseenEntries(WHATS_NEW, readSeen()));

  if (entries.length === 0) return null;

  const handleClose = () => {
    writeSeen(WHATS_NEW[0].id);
    setEntries([]);
  };

  return (
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: handleClose,
            clickOutsideDeactivates: true,
            escapeDeactivates: true,
          }}
        >
          <Dialog variant="Surface" style={{ maxWidth: toRem(440) }}>
            <Header style={HeaderStyle} variant="Surface" size="500">
              <Box grow="Yes">
                <Text size="H4">{tr('whats_new.title', "What's new")}</Text>
              </Box>
              <IconButton size="300" radii="300" onClick={handleClose}>
                <Icon src={Icons.Cross} />
              </IconButton>
            </Header>
            <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
              {entries
                .flatMap((entry) => entry.items())
                .map((item) => (
                  <Box key={item.title} direction="Column" gap="100">
                    <Text size="H6">{item.title}</Text>
                    <Text size="T300" priority="400">
                      {item.body}
                    </Text>
                  </Box>
                ))}
              <Button variant="Primary" onClick={handleClose}>
                <Text size="B400">{tr('whats_new.got_it', 'Got it')}</Text>
              </Button>
            </Box>
          </Dialog>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}
