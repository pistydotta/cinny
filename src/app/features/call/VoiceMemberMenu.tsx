import { useAtomValue } from 'jotai';
import React, { CSSProperties, useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Box, Icon, Icons, Text, config } from 'folds';
import { getDirectCreatePath, withSearchParam } from '../../pages/pathUtils';
import { DirectCreateSearchParams } from '../../pages/paths';
import { callEmbedAtom } from '../../state/callEmbed';
import { useRoom } from '../../hooks/useRoom';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useCallJoined } from '../../hooks/useCallEmbed';
import { useCallControlState } from '../../plugins/call';
import { useOpenUserRoomProfile } from '../../state/hooks/userRoomProfile';
import { usePowerLevels } from '../../hooks/usePowerLevels';
import { useRoomCreators } from '../../hooks/useRoomCreators';
import { useRoomPermissions } from '../../hooks/useRoomPermissions';
import { useMemberPowerCompare } from '../../hooks/useMemberPowerCompare';
import { getMemberAvatarMxc, getMemberDisplayName } from '../../utils/room';
import { UserAvatar } from '../../components/user-avatar';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { mxcUrlToHttp } from '../../utils/matrix';
import { TipIconButton } from '../tooltips/TipIconButton';
import { tr } from '../translation/tr';
import type { CallEmbed } from '../../plugins/call';
import { useVoice, useSaveVoice } from '../call-member-card/voices';
import { VoiceSettingsDialog } from '../call-audio-settings';
import * as css from './voiceMember.css';

function VoiceAudio({ call, userId }: { call: CallEmbed; userId: string }) {
  const volumeId = useId();
  const mx = useMatrixClient();
  const { microphone, sound } = useCallControlState(call.control);
  const voice = useVoice(userId);
  const saveVoice = useSaveVoice(userId, call);
  const [settings, setSettings] = useState(false);
  if (userId === mx.getSafeUserId())
    return (
      <Box gap="200">
        {settings && <VoiceSettingsDialog onClose={() => setSettings(false)} />}
        <TipIconButton
          size="300"
          label={tr('voice_member.microphone', 'Toggle microphone')}
          onClick={() => call.control.toggleMicrophone()}
        >
          <Icon size="100" src={microphone ? Icons.Mic : Icons.MicMute} />
        </TipIconButton>
        <TipIconButton
          size="300"
          label={tr('voice_member.sound', 'Toggle call sound')}
          onClick={() => call.control.toggleSound()}
        >
          <Icon size="100" src={sound ? Icons.Headphone : Icons.HeadphoneMute} />
        </TipIconButton>
        <TipIconButton
          size="300"
          label={tr('call_member.audio_settings', 'Audio settings')}
          onClick={() => setSettings(true)}
        >
          <Icon size="100" src={Icons.Setting} />
        </TipIconButton>
      </Box>
    );
  const volume = voice.muted ? 0 : Math.round(voice.volume * 100);
  return (
    <div className={css.Volume}>
      <label htmlFor={volumeId}>{tr('voice_member.volume_for_you', 'Volume for you')}</label>
      <Box alignItems="Center" gap="200">
        <TipIconButton
          size="300"
          label={
            voice.muted
              ? tr('call_member.unmute', 'Unmute for me')
              : tr('call_member.mute', 'Mute for me')
          }
          aria-pressed={voice.muted}
          onClick={() => saveVoice({ ...voice, muted: !voice.muted })}
        >
          <Icon size="100" src={voice.muted ? Icons.VolumeMute : Icons.VolumeHigh} />
        </TipIconButton>
        <input
          id={volumeId}
          className={css.Slider}
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={voice.volume}
          aria-valuetext={`${volume}%`}
          style={{ '--voice-volume': `${volume}%` } as CSSProperties}
          disabled={voice.muted}
          onChange={(event) => saveVoice({ ...voice, volume: Number(event.target.value) })}
        />
        <output htmlFor={volumeId} className={css.VolumeValue}>
          {volume}%
        </output>
      </Box>
    </div>
  );
}

export function VoiceMemberMenu({ userId, onClose }: { userId: string; onClose: () => void }) {
  const mx = useMatrixClient();
  const navigate = useNavigate();
  const openProfile = useOpenUserRoomProfile();
  const room = useRoom();
  const useAuthentication = useMediaAuthentication();
  const avatarMxc = getMemberAvatarMxc(room, userId);
  const avatarUrl = avatarMxc
    ? mxcUrlToHttp(mx, avatarMxc, useAuthentication, 48, 48) ?? undefined
    : undefined;
  const call = useAtomValue(callEmbedAtom);
  const joined = useCallJoined(call);
  const powers = usePowerLevels(room);
  const creators = useRoomCreators(room);
  const permissions = useRoomPermissions(creators, powers);
  const { hasMorePower } = useMemberPowerCompare(creators, powers);
  const me = mx.getSafeUserId();
  const canKick = me !== userId && permissions.action('kick', me) && hasMorePower(me, userId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return (
    <Box direction="Column" gap="200" style={{ padding: config.space.S300 }}>
      <Box alignItems="Center" gap="200">
        <Avatar size="200" radii="Pill">
          <UserAvatar
            userId={userId}
            src={avatarUrl}
            alt=""
            renderFallback={() => <Icon src={Icons.User} size="100" />}
          />
        </Avatar>
        <Box direction="Column" grow="Yes" style={{ minWidth: 0 }}>
          <Text size="L400" truncate>
            {getMemberDisplayName(room, userId) ?? userId}
          </Text>
          <Text size="T200" priority="300">
            {tr('voice_member.call_controls', 'Call controls')}
          </Text>
        </Box>
        {userId !== me && (
          <TipIconButton
            size="300"
            label={tr('voice_member.message', 'Send direct message')}
            onClick={() => {
              onClose();
              const params: DirectCreateSearchParams = { userId };
              navigate(withSearchParam(getDirectCreatePath(), params));
            }}
          >
            <Icon size="50" src={Icons.Message} />
          </TipIconButton>
        )}
        <TipIconButton
          size="300"
          label={tr('call_member.profile', 'View profile')}
          onClick={(event: React.MouseEvent<HTMLButtonElement>) =>
            openProfile(
              room.roomId,
              undefined,
              userId,
              event.currentTarget.getBoundingClientRect(),
              'Right'
            )
          }
        >
          <Icon size="50" src={Icons.User} />
        </TipIconButton>
        <TipIconButton
          size="300"
          label={tr('voice_member.close', 'Close controls')}
          onClick={onClose}
        >
          <Icon size="50" src={Icons.Cross} />
        </TipIconButton>
      </Box>
      {call && joined && call.roomId === room.roomId && <VoiceAudio call={call} userId={userId} />}
      {canKick && (
        <button
          className={css.Kick}
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(false);
            try {
              await mx.kick(room.roomId, userId);
              onClose();
            } catch {
              setError(true);
              setBusy(false);
            }
          }}
        >
          <Icon src={Icons.ArrowGoLeft} size="50" />
          {tr('voice_member.kick', 'Kick from room')}
        </button>
      )}
      {error && (
        <Text size="T200" role="alert">
          {tr('voice_member.kick_error', 'Could not kick this user. Try again.')}
        </Text>
      )}
    </Box>
  );
}
