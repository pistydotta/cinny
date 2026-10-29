import React, { CSSProperties, useCallback, useEffect, useState } from 'react';
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
import {
  EncryptionStep,
  getEncryptionStep,
  isPromptPostponed,
  postponePrompt,
  PROMPT_LATER_KEY,
} from './encryptionStep';
import { tr } from '../translation/tr';

const readLater = (): string | null => {
  try {
    return localStorage.getItem(PROMPT_LATER_KEY);
  } catch {
    return null;
  }
};

const writeLater = (value: string) => {
  try {
    localStorage.setItem(PROMPT_LATER_KEY, value);
  } catch {
    // Without storage the prompt just shows again next time.
  }
};

const toVerified = (status: VerificationStatus): boolean | null | undefined => {
  if (status === VerificationStatus.Verified) return true;
  if (status === VerificationStatus.Unverified) return false;
  if (status === VerificationStatus.Unsupported) return null;
  return undefined;
};

const useEncryptionStep = (): EncryptionStep => {
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

// Asks the user once per device to create or unlock their recovery key, then keeps a banner
// at the top of the app until it's done. Encrypted history can't follow a user to a new
// device without it.
export function EncryptionSetup() {
  const mx = useMatrixClient();
  const step = useEncryptionStep();
  const userId = mx.getSafeUserId();
  const deviceId = mx.getDeviceId() ?? '';
  const [open, setOpen] = useState(false);

  const pending = step === 'create' || step === 'unlock';

  useEffect(() => {
    if (pending && !isPromptPostponed(readLater(), userId, deviceId)) setOpen(true);
  }, [pending, userId, deviceId]);

  const handleClose = useCallback(() => {
    writeLater(postponePrompt(readLater(), userId, deviceId));
    setOpen(false);
  }, [userId, deviceId]);

  if (!pending) return null;

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
      {open && step === 'create' && <CreateKeyPrompt onClose={handleClose} />}
      {open && step === 'unlock' && <UnlockPrompt onClose={handleClose} />}
    </>
  );
}
