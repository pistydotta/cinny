import React, { CSSProperties, useState } from 'react';
import {
  Box,
  Button,
  config,
  Dialog,
  Header,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Spinner,
  Text,
  toRem,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { tr } from '../../translation/tr';
import { ManagedUser } from '../../admin/adminApi';

const HeaderStyle: CSSProperties = {
  padding: `0 ${config.space.S400}`,
  borderBottomWidth: config.borderWidth.B300,
};

type DeactivateDialogProps = {
  user: ManagedUser;
  onConfirm: () => Promise<unknown>;
  onClose: () => void;
};
export function DeactivateDialog({ user, onConfirm, onClose }: DeactivateDialogProps) {
  const [busy, setBusy] = useState(false);
  const values = { userId: user.userId };

  const handleConfirm = async () => {
    setBusy(true);
    await onConfirm();
    setBusy(false);
    onClose();
  };

  return (
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: () => !busy && onClose(),
            clickOutsideDeactivates: true,
            escapeDeactivates: true,
          }}
        >
          <Dialog variant="Surface" style={{ maxWidth: toRem(440) }}>
            <Header style={HeaderStyle} variant="Surface" size="500">
              <Text size="H4" truncate>
                {tr('admin.deactivate.title', 'Deactivate {{userId}}?', values)}
              </Text>
            </Header>
            <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
              <Box direction="Column" gap="200">
                <Text size="T300">
                  {tr(
                    'admin.deactivate.body',
                    "This can't be undone. The account is signed out everywhere and can't log in again, and its friendships and invite links are removed."
                  )}
                </Text>
                <Text size="T300" priority="400">
                  {tr(
                    'admin.deactivate.username_taken',
                    'The username {{userId}} stays reserved: it can’t be used for another account.',
                    values
                  )}
                </Text>
              </Box>
              <Box gap="200" justifyContent="End">
                <Button variant="Secondary" fill="Soft" onClick={onClose} disabled={busy}>
                  <Text size="B400">{tr('common.cancel', 'Cancel')}</Text>
                </Button>
                <Button
                  variant="Critical"
                  onClick={handleConfirm}
                  disabled={busy}
                  before={busy ? <Spinner variant="Critical" fill="Solid" size="200" /> : undefined}
                >
                  <Text size="B400">{tr('admin.deactivate.confirm', 'Deactivate')}</Text>
                </Button>
              </Box>
            </Box>
          </Dialog>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}
