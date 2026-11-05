import { useAtomValue } from 'jotai';
import React, { useId, useState } from 'react';
import { Box, Icon, Icons, Text, config } from 'folds';
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
import { getMemberDisplayName } from '../../utils/room';
import { TipIconButton } from '../tooltips/TipIconButton';
import { tr } from '../translation/tr';
import type { CallEmbed } from '../../plugins/call';
import { useVoice, useSaveVoice } from '../call-member-card/voices';
import * as css from './voiceMember.css';

function VoiceAudio({ call, userId }: { call: CallEmbed; userId: string }) {
  const volumeId = useId();
  const mx = useMatrixClient();
  const { microphone, sound } = useCallControlState(call.control);
  const voice = useVoice(userId);
  const saveVoice = useSaveVoice(userId, call);
  if (userId === mx.getSafeUserId())
    return (
      <Box gap="200">
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
          onClick={() => call.control.toggleSettings()}
        >
          <Icon size="100" src={Icons.Setting} />
        </TipIconButton>
      </Box>
    );
  return (
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
      <label htmlFor={volumeId} className={css.Volume}>
        <span>{tr('voice_member.volume', 'User volume')}</span>
        <input
          id={volumeId}
          className={css.Slider}
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={voice.volume}
          disabled={voice.muted}
          onChange={(event) => saveVoice({ ...voice, volume: Number(event.target.value) })}
        />
        <span>{voice.muted ? 0 : Math.round(voice.volume * 100)}%</span>
      </label>
    </Box>
  );
}

export function VoiceMemberMenu({ userId, onClose }: { userId: string; onClose: () => void }) {
  const mx = useMatrixClient();
  const openProfile = useOpenUserRoomProfile();
  const room = useRoom();
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
        <Text size="L400" truncate style={{ flex: 1 }}>
          {getMemberDisplayName(room, userId) ?? userId}
        </Text>
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
