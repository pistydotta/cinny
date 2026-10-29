// What this device still needs before it can read encrypted messages here and on other devices.
//
// - 'create': the account has no recovery key yet (cross-signing never set up).
// - 'unlock': the account has one, but this device isn't verified: it needs the key or another device.
// - 'done': nothing to do. 'loading' while the status isn't known, so nothing flashes on screen.
export type EncryptionStep = 'loading' | 'create' | 'unlock' | 'done';

export type EncryptionState = {
  hasCrypto: boolean;
  crossSigningActive: boolean;
  // undefined until the device's status is known; null when the server or device can't tell.
  deviceVerified: boolean | null | undefined;
  hasSecretStorageKey: boolean;
};

export const getEncryptionStep = ({
  hasCrypto,
  crossSigningActive,
  deviceVerified,
  hasSecretStorageKey,
}: EncryptionState): EncryptionStep => {
  if (!hasCrypto) return 'done';
  if (!crossSigningActive) return 'create';
  if (deviceVerified === undefined) return 'loading';
  if (deviceVerified === null || deviceVerified) return 'done';
  // Verifying with the recovery key needs its description in account data; wait for it to sync.
  return hasSecretStorageKey ? 'unlock' : 'loading';
};

// The full-screen prompt shows once per device; after "Later" only the banner stays.
export const PROMPT_LATER_KEY = 'blazeroom.encryptionPromptLater';

export const promptLaterId = (userId: string, deviceId: string): string => `${userId}|${deviceId}`;

export const isPromptPostponed = (raw: string | null, userId: string, deviceId: string): boolean =>
  !!raw && raw.split('\n').includes(promptLaterId(userId, deviceId));

export const postponePrompt = (raw: string | null, userId: string, deviceId: string): string => {
  const ids = raw ? raw.split('\n').filter(Boolean) : [];
  const id = promptLaterId(userId, deviceId);
  return ids.includes(id) ? ids.join('\n') : [...ids, id].join('\n');
};
