import React, { useState } from 'react';
import { Room } from 'matrix-js-sdk';
import { Box, Button, Icon, Icons, Menu, Spinner, Text, config, toRem } from 'folds';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { usePowerLevels } from '../../hooks/usePowerLevels';
import { useRoomCreators } from '../../hooks/useRoomCreators';
import { useRoomPermissions } from '../../hooks/useRoomPermissions';
import { useMemberPowerCompare } from '../../hooks/useMemberPowerCompare';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { useCallEmbed } from '../../hooks/useCallEmbed';
import { TipIconButton } from '../tooltips/TipIconButton';
import { tr } from '../translation/tr';
import { useSaveVoice, useVoice } from './voices';

type CallMemberCardProps = {
  room: Room;
  userId: string;
  name: string;
  onOpenProfile: () => void;
  requestClose: () => void;
};

// Small card for one person in a voice room: their full profile, and how loud they are for me.
export function CallMemberCard({
  room,
  userId,
  name,
  onOpenProfile,
  requestClose,
}: CallMemberCardProps) {
  const mx = useMatrixClient();
  const myUserId = mx.getSafeUserId();
  const self = userId === myUserId;
  const embed = useCallEmbed();
  const voice = useVoice(userId);
  const saveVoice = useSaveVoice(userId, embed);

  // useRoomCreators reads m.room.create: from room version 12 creators aren't in power_levels.
  const powerLevels = usePowerLevels(room);
  const creators = useRoomCreators(room);
  const permissions = useRoomPermissions(creators, powerLevels);
  const { hasMorePower } = useMemberPowerCompare(creators, powerLevels);
  const canKick = !self && permissions.action('kick', myUserId) && hasMorePower(myUserId, userId);

  const [confirming, setConfirming] = useState(false);
  const [kickState, kick] = useAsyncCallback<void, Error, []>(
    React.useCallback(async () => {
      await mx.kick(room.roomId, userId);
      requestClose();
    }, [mx, room, userId, requestClose])
  );
  const kicking = kickState.status === AsyncStatus.Loading;

  return (
    <Menu style={{ width: toRem(260), padding: config.space.S300 }}>
      <Box direction="Column" gap="300">
        <Box alignItems="Center" gap="200">
          <Box grow="Yes" style={{ minWidth: 0 }}>
            <Text size="H6" truncate title={name}>
              {name}
            </Text>
          </Box>
          {canKick && !confirming && (
            <TipIconButton
              label={tr('call_member.kick', 'Kick from room')}
              variant="Critical"
              fill="None"
              size="300"
              radii="300"
              onClick={() => setConfirming(true)}
            >
              <Icon size="100" src={Icons.ArrowGoRightPlus} />
            </TipIconButton>
          )}
        </Box>

        {confirming && (
          <Box direction="Column" gap="200">
            <Text size="T300">
              {tr('call_member.kick_confirm', 'Kick {{name}} from this room?', { name })}
            </Text>
            {kickState.status === AsyncStatus.Error && (
              <Text size="T200">{kickState.error.message}</Text>
            )}
            <Box gap="200">
              <Button
                size="300"
                variant="Critical"
                fill="Solid"
                radii="300"
                disabled={kicking}
                before={kicking && <Spinner size="100" variant="Critical" fill="Solid" />}
                onClick={kick}
              >
                <Text size="B300">{tr('call_member.kick_yes', 'Kick')}</Text>
              </Button>
              <Button
                size="300"
                variant="Secondary"
                fill="Soft"
                radii="300"
                disabled={kicking}
                onClick={() => setConfirming(false)}
              >
                <Text size="B300">{tr('call_member.cancel', 'Cancel')}</Text>
              </Button>
            </Box>
          </Box>
        )}

        {!self && (
          <Box alignItems="Center" gap="200">
            <TipIconButton
              label={
                voice.muted
                  ? tr('call_member.unmute', 'Unmute for me')
                  : tr('call_member.mute', 'Mute for me')
              }
              variant={voice.muted ? 'Warning' : 'Surface'}
              fill="Soft"
              size="300"
              radii="300"
              aria-pressed={voice.muted}
              onClick={() => saveVoice({ ...voice, muted: !voice.muted })}
            >
              <Icon
                size="100"
                src={voice.muted ? Icons.VolumeMute : Icons.VolumeHigh}
                filled={voice.muted}
              />
            </TipIconButton>
            {/* Element Call plays audio without Web Audio, so 100% is the ceiling. */}
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={voice.volume}
              disabled={voice.muted}
              aria-label={tr('call_member.volume', 'Volume for me')}
              style={{ flexGrow: 1, minWidth: 0 }}
              onChange={(evt) => saveVoice({ ...voice, volume: Number(evt.target.value) })}
            />
            <Text size="T200" style={{ width: toRem(36), textAlign: 'right' }}>
              {Math.round(voice.volume * 100)}%
            </Text>
          </Box>
        )}

        <Button size="300" variant="Secondary" fill="Soft" radii="300" onClick={onOpenProfile}>
          <Text size="B300">{tr('call_member.profile', 'Open profile')}</Text>
        </Button>
      </Box>
    </Menu>
  );
}
