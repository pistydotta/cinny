import React, { ReactNode, useCallback, useState } from 'react';
import { Room } from 'matrix-js-sdk';
import {
  Badge,
  Box,
  Button,
  Icon,
  Icons,
  IconSrc,
  Menu,
  Spinner,
  Text,
  color,
  config,
  toRem,
} from 'folds';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { usePowerLevels } from '../../hooks/usePowerLevels';
import { useRoomCreators } from '../../hooks/useRoomCreators';
import { useRoomPermissions } from '../../hooks/useRoomPermissions';
import { useMemberPowerCompare } from '../../hooks/useMemberPowerCompare';
import { useUserPresence } from '../../hooks/useUserPresence';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { useCallEmbed } from '../../hooks/useCallEmbed';
import { useCallControlState } from '../../plugins/call';
import { CallEmbed } from '../../plugins/call/CallEmbed';
import { UserHero } from '../../components/user-profile/UserHero';
import { getMemberAvatarMxc } from '../../utils/room';
import { mxcUrlToHttp } from '../../utils/matrix';
import { TipIconButton } from '../tooltips/TipIconButton';
import { tr } from '../translation/tr';
import { useShares } from '../screen-share/useShares';
import { Slider } from '../screen-share/styles.css';
import { useSaveVoice, useVoice } from './voices';

type CallMemberCardProps = {
  room: Room;
  userId: string;
  name: string;
  onOpenProfile: () => void;
  requestClose: () => void;
};

function StateBadge({ icon, children }: { icon: IconSrc; children: ReactNode }) {
  return (
    <Badge variant="Secondary" fill="Soft" radii="Pill" outlined={false}>
      <Box alignItems="Center" gap="100">
        <Icon size="50" src={icon} />
        <Text size="L400">{children}</Text>
      </Box>
    </Badge>
  );
}

// What the call shows about this person. Element Call doesn't tell Cinny whether others are
// speaking or muted, so for them only screen sharing is known.
function CallStates({ embed, userId, self }: { embed: CallEmbed; userId: string; self: boolean }) {
  const { microphone, sound } = useCallControlState(embed.control);
  const { local, remotes } = useShares(embed.control);
  const sharing = self ? !!local : remotes.some((share) => share.userId === userId);
  if (!(sharing || (self && (!microphone || !sound)))) return null;
  return (
    <Box gap="100" wrap="Wrap">
      {self && !microphone && (
        <StateBadge icon={Icons.MicMute}>{tr('call_member.mic_off', 'Mic off')}</StateBadge>
      )}
      {self && !sound && (
        <StateBadge icon={Icons.HeadphoneMute}>{tr('call_member.deafened', 'Deafened')}</StateBadge>
      )}
      {sharing && (
        <StateBadge icon={Icons.ScreenShare}>
          {tr('call_member.sharing', 'Sharing screen')}
        </StateBadge>
      )}
    </Box>
  );
}

// My own card: my call controls, so it's never empty.
function SelfControls({ embed }: { embed: CallEmbed }) {
  const { microphone, sound } = useCallControlState(embed.control);
  return (
    <Box gap="200" alignItems="Center">
      <TipIconButton
        label={
          microphone
            ? tr('call_member.mic_mute', 'Mute my mic')
            : tr('call_member.mic_unmute', 'Unmute my mic')
        }
        variant={microphone ? 'Surface' : 'Critical'}
        fill="Soft"
        size="400"
        radii="400"
        aria-pressed={!microphone}
        onClick={() => embed.control.toggleMicrophone()}
      >
        <Icon size="200" src={microphone ? Icons.Mic : Icons.MicMute} filled={!microphone} />
      </TipIconButton>
      <TipIconButton
        label={
          sound
            ? tr('call_member.deafen', 'Turn off call audio')
            : tr('call_member.undeafen', 'Turn on call audio')
        }
        variant={sound ? 'Surface' : 'Critical'}
        fill="Soft"
        size="400"
        radii="400"
        aria-pressed={!sound}
        onClick={() => embed.control.toggleSound()}
      >
        <Icon size="200" src={sound ? Icons.Headphone : Icons.HeadphoneMute} filled={!sound} />
      </TipIconButton>
      <TipIconButton
        label={tr('call_member.audio_settings', 'Audio settings')}
        variant="Surface"
        fill="Soft"
        size="400"
        radii="400"
        onClick={() => embed.control.toggleSettings()}
      >
        <Icon size="200" src={Icons.Setting} />
      </TipIconButton>
    </Box>
  );
}

function VoiceControls({ userId, embed }: { userId: string; embed: CallEmbed | undefined }) {
  const voice = useVoice(userId);
  const saveVoice = useSaveVoice(userId, embed);
  const percent = Math.round(voice.volume * 100);
  return (
    <Box alignItems="Center" gap="200">
      <TipIconButton
        label={
          voice.muted
            ? tr('call_member.unmute', 'Unmute for me')
            : tr('call_member.mute', 'Mute for me')
        }
        variant={voice.muted ? 'Critical' : 'Surface'}
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
        aria-valuetext={`${percent}%`}
        className={Slider}
        style={{
          flexGrow: 1,
          flexShrink: 1,
          width: 'auto',
          minWidth: 0,
          opacity: voice.muted ? 0.4 : 1,
        }}
        onChange={(evt) => saveVoice({ ...voice, volume: Number(evt.target.value) })}
      />
      <Text size="T200" priority="300" style={{ width: toRem(34), textAlign: 'right' }}>
        {voice.muted ? '0%' : `${percent}%`}
      </Text>
    </Box>
  );
}

// Small card for one person in a voice room, like Discord's mini profile.
export function CallMemberCard({
  room,
  userId,
  name,
  onOpenProfile,
  requestClose,
}: CallMemberCardProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const myUserId = mx.getSafeUserId();
  const self = userId === myUserId;
  const embed = useCallEmbed();
  const inThisCall = embed?.roomId === room.roomId ? embed : undefined;
  const presence = useUserPresence(userId);
  const avatarMxc = getMemberAvatarMxc(room, userId);
  const avatarUrl = (avatarMxc && mxcUrlToHttp(mx, avatarMxc, useAuthentication)) ?? undefined;

  // useRoomCreators reads m.room.create: from room version 12 creators aren't in power_levels.
  const powerLevels = usePowerLevels(room);
  const creators = useRoomCreators(room);
  const permissions = useRoomPermissions(creators, powerLevels);
  const { hasMorePower } = useMemberPowerCompare(creators, powerLevels);
  const canKick = !self && permissions.action('kick', myUserId) && hasMorePower(myUserId, userId);

  const [confirming, setConfirming] = useState(false);
  const [kickState, kick] = useAsyncCallback<void, Error, []>(
    useCallback(async () => {
      await mx.kick(room.roomId, userId);
      requestClose();
    }, [mx, room, userId, requestClose])
  );
  const kicking = kickState.status === AsyncStatus.Loading;

  return (
    <Menu style={{ width: toRem(272), overflow: 'hidden' }}>
      <UserHero userId={userId} avatarUrl={avatarUrl} presence={presence} />
      <Box
        direction="Column"
        gap="300"
        style={{ padding: config.space.S300, paddingTop: config.space.S200 }}
      >
        <Box alignItems="Start" gap="200">
          <Box grow="Yes" direction="Column" style={{ minWidth: 0 }}>
            <Text size="H5" truncate title={name}>
              {name}
            </Text>
            <Text size="T200" priority="300" truncate title={userId}>
              {userId}
            </Text>
          </Box>
          <TipIconButton
            label={tr('call_member.profile', 'View profile')}
            variant="Surface"
            fill="None"
            size="300"
            radii="300"
            onClick={onOpenProfile}
          >
            <Icon size="100" src={Icons.User} />
          </TipIconButton>
          {canKick && (
            <TipIconButton
              label={tr('call_member.kick', 'Kick from room')}
              variant="Critical"
              fill="Soft"
              size="300"
              radii="300"
              aria-pressed={confirming}
              onClick={() => setConfirming(true)}
            >
              <Icon size="100" src={Icons.ArrowGoRightPlus} />
            </TipIconButton>
          )}
        </Box>

        {inThisCall && <CallStates embed={inThisCall} userId={userId} self={self} />}

        {confirming && (
          <Box
            direction="Column"
            gap="200"
            style={{
              padding: config.space.S200,
              borderRadius: config.radii.R300,
              border: `${config.borderWidth.B300} solid ${color.Critical.ContainerLine}`,
            }}
          >
            <Text size="T300">
              {tr('call_member.kick_confirm', 'Kick {{name}} from this room?', { name })}
            </Text>
            {kickState.status === AsyncStatus.Error && (
              <Text size="T200">{kickState.error.message}</Text>
            )}
            <Box gap="200" justifyContent="End">
              <Button
                size="300"
                variant="Secondary"
                fill="None"
                radii="300"
                disabled={kicking}
                onClick={() => setConfirming(false)}
              >
                <Text size="B300">{tr('call_member.cancel', 'Cancel')}</Text>
              </Button>
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
            </Box>
          </Box>
        )}

        {self && inThisCall && <SelfControls embed={inThisCall} />}
        {!self && <VoiceControls userId={userId} embed={inThisCall} />}
      </Box>
    </Menu>
  );
}
