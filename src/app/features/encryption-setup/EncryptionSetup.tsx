import React, { CSSProperties, useCallback, useState } from 'react';
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
  Spinner,
  Text,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { VerificationRequest } from 'matrix-js-sdk/lib/crypto-api';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useCrossSigningActive } from '../../hooks/useCrossSigning';
import {
  useDeviceVerificationStatus,
  VerificationStatus,
} from '../../hooks/useDeviceVerificationStatus';
import {
  useSecretStorageDefaultKeyId,
  useSecretStorageKeyContent,
} from '../../hooks/useSecretStorage';
import { DeviceVerificationSetup } from '../../components/DeviceVerificationSetup';
import { DeviceVerification } from '../../components/DeviceVerification';
import { ManualVerificationTile } from '../../components/ManualVerification';
import { ContainerColor } from '../../styles/ContainerColor.css';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { EncryptionStep, getEncryptionStep } from './encryptionStep';
import { tr } from '../translation/tr';

const toVerified = (status: VerificationStatus): boolean | null | undefined => {
  if (status === VerificationStatus.Verified) return true;
  if (status === VerificationStatus.Unverified) return false;
  if (status === VerificationStatus.Unsupported) return null;
  return undefined;
};

export const useEncryptionStep = (): EncryptionStep => {
  const mx = useMatrixClient();
  const crypto = mx.getCrypto();
  const crossSigningActive = useCrossSigningActive();
  const status = useDeviceVerificationStatus(
    crypto,
    mx.getSafeUserId(),
    mx.getDeviceId() ?? undefined
  );
  const keyId = useSecretStorageDefaultKeyId();
  const keyContent = useSecretStorageKeyContent(keyId ?? '');

  return getEncryptionStep({
    hasCrypto: !!crypto,
    crossSigningActive,
    deviceVerified: toVerified(status),
    hasSecretStorageKey: !!keyId && !!keyContent,
  });
};

const HeaderStyle: CSSProperties = {
  padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
  borderBottomWidth: config.borderWidth.B300,
};

type PromptDialogProps = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};
function PromptDialog({ title, onClose, children }: PromptDialogProps) {
  return (
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            clickOutsideDeactivates: false,
            escapeDeactivates: false,
          }}
        >
          <Dialog variant="Surface">
            <Header style={HeaderStyle} variant="Surface" size="500">
              <Box grow="Yes">
                <Text size="H4">{title}</Text>
              </Box>
              <IconButton size="300" radii="300" onClick={onClose}>
                <Icon src={Icons.Cross} />
              </IconButton>
            </Header>
            <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
              {children}
            </Box>
          </Dialog>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}

function CreateKeyPrompt({ onClose }: { onClose: () => void }) {
  const [creating, setCreating] = useState(false);

  if (creating) {
    return (
      <Overlay open backdrop={<OverlayBackdrop />}>
        <OverlayCenter>
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              clickOutsideDeactivates: false,
              escapeDeactivates: false,
            }}
          >
            <DeviceVerificationSetup onCancel={onClose} />
          </FocusTrap>
        </OverlayCenter>
      </Overlay>
    );
  }

  return (
    <PromptDialog title={tr('encryption.protect_title', 'Protect your messages')} onClose={onClose}>
      <Text size="T300">
        {tr(
          'encryption.protect_body',
          'Your messages are encrypted. Create a recovery key so you can read them on your other devices, like your phone or a new computer.'
        )}
      </Text>
      <Text size="T300">
        {tr(
          'encryption.passphrase_hint',
          "You can pick a passphrase you'll remember. Save it in a password manager: if you lose it and all your devices, your old messages can't be recovered."
        )}
      </Text>
      <Box direction="Column" gap="200">
        <Button variant="Primary" onClick={() => setCreating(true)}>
          <Text size="B400">{tr('encryption.create_key', 'Create recovery key')}</Text>
        </Button>
        <Button variant="Secondary" fill="Soft" onClick={onClose}>
          <Text size="B400">{tr('common.later', 'Later')}</Text>
        </Button>
      </Box>
    </PromptDialog>
  );
}

function UnlockPrompt({ onClose }: { onClose: () => void }) {
  const mx = useMatrixClient();
  const keyId = useSecretStorageDefaultKeyId();
  const keyContent = useSecretStorageKeyContent(keyId ?? '');
  const [useKey, setUseKey] = useState(false);
  const [request, setRequest] = useState<VerificationRequest>();

  const [requestState, requestVerification] = useAsyncCallback<void, Error, []>(
    useCallback(async () => {
      const crypto = mx.getCrypto();
      if (!crypto)
        throw new Error(
          tr('encryption.unavailable', 'Encryption is not available on this device.')
        );
      setRequest(await crypto.requestOwnUserVerification());
    }, [mx])
  );

  if (request) {
    return <DeviceVerification request={request} onExit={() => setRequest(undefined)} />;
  }

  const requesting = requestState.status === AsyncStatus.Loading;
  return (
    <PromptDialog title={tr('encryption.verify_title', 'Verify this device')} onClose={onClose}>
      <Text size="T300">
        {tr(
          'encryption.verify_body',
          "To read your encrypted messages here, confirm it's you: approve this device from one you're already logged in on, or enter your recovery key or passphrase."
        )}
      </Text>
      {useKey && keyId && keyContent ? (
        <ManualVerificationTile secretStorageKeyId={keyId} secretStorageKeyContent={keyContent} />
      ) : (
        <Box direction="Column" gap="200">
          <Button
            variant="Primary"
            onClick={requestVerification}
            disabled={requesting}
            before={requesting && <Spinner size="100" variant="Primary" fill="Solid" />}
          >
            <Text size="B400">{tr('encryption.use_device', 'Use another device')}</Text>
          </Button>
          <Button variant="Secondary" fill="Soft" onClick={() => setUseKey(true)}>
            <Text size="B400">{tr('encryption.enter_key', 'Enter recovery key')}</Text>
          </Button>
        </Box>
      )}
      {requestState.status === AsyncStatus.Error && (
        <Text size="T200">{requestState.error.message}</Text>
      )}
      <Button variant="Secondary" fill="None" onClick={onClose}>
        <Text size="B400">{tr('common.later', 'Later')}</Text>
      </Button>
    </PromptDialog>
  );
}

// The dialogs that create the recovery key or verify this device, opened from the banner or
// from the welcome card on Visão geral.
export function EncryptionFlow({ step, onClose }: { step: EncryptionStep; onClose: () => void }) {
  if (step === 'create') return <CreateKeyPrompt onClose={onClose} />;
  if (step === 'unlock') return <UnlockPrompt onClose={onClose} />;
  return null;
}

// A banner at the top of the app until the recovery key is set up on this device. Encrypted
// history can't follow a user to a new device without it. Nothing opens by itself: the
// banner and the welcome card on Visão geral are the way in.
export function EncryptionSetup() {
  const step = useEncryptionStep();
  const [open, setOpen] = useState(false);
  const handleClose = useCallback(() => setOpen(false), []);

  if (step !== 'create' && step !== 'unlock') return null;

  return (
    <>
      <Box
        className={ContainerColor({ variant: 'Warning' })}
        shrink="No"
        alignItems="Center"
        justifyContent="Center"
        gap="300"
        wrap="Wrap"
        style={{ padding: `${config.space.S200} ${config.space.S400}` }}
      >
        <Icon size="100" src={Icons.Shield} />
        <Text size="T300">
          {step === 'create'
            ? tr(
                'encryption.banner_create',
                'Create a recovery key to read your messages on other devices.'
              )
            : tr('encryption.banner_unlock', "This device can't read your encrypted messages yet.")}
        </Text>
        <Button size="300" radii="300" variant="Warning" onClick={() => setOpen(true)}>
          <Text size="B300">
            {step === 'create'
              ? tr('encryption.set_up', 'Set up')
              : tr('encryption.verify', 'Verify')}
          </Text>
        </Button>
      </Box>
      {open && <EncryptionFlow step={step} onClose={handleClose} />}
    </>
  );
}
