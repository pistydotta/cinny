import React from 'react';
import { Box } from 'folds';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { useDeviceIds, useDeviceList, useSplitCurrentDevice } from '../../../hooks/useDeviceList';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { LocalBackup } from './LocalBackup';
import { DeviceLogoutBtn, DeviceKeyDetails, DeviceTile, DeviceTilePlaceholder } from './DeviceTile';
import { OtherDevices } from './OtherDevices';
import {
  DeviceVerificationOptions,
  EnableVerification,
  VerificationStatusBadge,
  VerifyCurrentDeviceTile,
} from './Verification';
import {
  useDeviceVerificationStatus,
  useUnverifiedDeviceCount,
  VerificationStatus,
} from '../../../hooks/useDeviceVerificationStatus';
import {
  useSecretStorageDefaultKeyId,
  useSecretStorageKeyContent,
} from '../../../hooks/useSecretStorage';
import { useCrossSigningActive } from '../../../hooks/useCrossSigning';
import { BackupRestoreTile } from '../../../components/BackupRestore';
import { tr } from '../../translation/tr';
import { SectionTitle } from '../SettingsPage';

function DevicesPlaceholder() {
  return (
    <Box direction="Column" gap="100">
      <DeviceTilePlaceholder />
      <DeviceTilePlaceholder />
    </Box>
  );
}

// Verification, sessions and key backup; shown on the Privacy & security tab.
export function DeviceSections() {
  const mx = useMatrixClient();
  const crypto = mx.getCrypto();
  const crossSigningActive = useCrossSigningActive();
  const [devices, refreshDeviceList] = useDeviceList();

  const [currentDevice, otherDevices] = useSplitCurrentDevice(devices);
  const verificationStatus = useDeviceVerificationStatus(
    crypto,
    mx.getSafeUserId(),
    currentDevice?.device_id
  );

  const otherDevicesId = useDeviceIds(otherDevices);
  const unverifiedDeviceCount = useUnverifiedDeviceCount(
    crypto,
    mx.getSafeUserId(),
    otherDevicesId
  );

  const defaultSecretStorageKeyId = useSecretStorageDefaultKeyId();
  const defaultSecretStorageKeyContent = useSecretStorageKeyContent(
    defaultSecretStorageKeyId ?? ''
  );

  return (
    <>
      <Box direction="Column" gap="100">
        <SectionTitle
          title={tr('settings.section.encryption', 'Encryption')}
          description={tr(
            'settings.about_section.encryption',
            'Prove this device is yours to read encrypted messages.'
          )}
        />
        <SequenceCard
          className={SequenceCardStyle}
          variant="SurfaceVariant"
          direction="Column"
          gap="400"
        >
          <SettingTile
            title="Device Verification"
            description="To verify device identity and grant access to encrypted messages."
            after={
              <>
                <EnableVerification visible={!crossSigningActive} />
                {crossSigningActive && (
                  <Box gap="200" alignItems="Center">
                    <VerificationStatusBadge
                      verificationStatus={verificationStatus}
                      otherUnverifiedCount={unverifiedDeviceCount}
                    />
                    <DeviceVerificationOptions />
                  </Box>
                )}
              </>
            }
          />
        </SequenceCard>
      </Box>
      <Box direction="Column" gap="100">
        <SectionTitle
          title={tr('settings.section.this_device', 'This device')}
          description={tr(
            'settings.about_section.this_device',
            "The session you're using right now."
          )}
        />
        {currentDevice ? (
          <SequenceCard
            className={SequenceCardStyle}
            variant="SurfaceVariant"
            direction="Column"
            gap="400"
          >
            <DeviceTile
              device={currentDevice}
              refreshDeviceList={refreshDeviceList}
              options={<DeviceLogoutBtn />}
            >
              {crypto && <DeviceKeyDetails crypto={crypto} />}
            </DeviceTile>
            {crossSigningActive &&
              verificationStatus === VerificationStatus.Unverified &&
              defaultSecretStorageKeyId &&
              defaultSecretStorageKeyContent && (
                <VerifyCurrentDeviceTile
                  secretStorageKeyId={defaultSecretStorageKeyId}
                  secretStorageKeyContent={defaultSecretStorageKeyContent}
                />
              )}
            {crypto && verificationStatus === VerificationStatus.Verified && (
              <BackupRestoreTile crypto={crypto} />
            )}
          </SequenceCard>
        ) : (
          <DeviceTilePlaceholder />
        )}
      </Box>
      {devices === undefined && <DevicesPlaceholder />}
      {otherDevices && (
        <OtherDevices
          devices={otherDevices}
          refreshDeviceList={refreshDeviceList}
          showVerification={
            crossSigningActive && verificationStatus === VerificationStatus.Verified
          }
        />
      )}
      <LocalBackup />
    </>
  );
}
