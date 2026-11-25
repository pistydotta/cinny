import React, { ReactNode, useCallback } from 'react';
import { Box, Button, Icon, Icons, IconSrc, Spinner, Text } from 'folds';
import { useAtom, useAtomValue } from 'jotai';
import * as css from './styles.css';
import { useIsDirectRoom, useRoom } from '../../hooks/useRoom';
import { useCallEmbed, useCallJoined } from '../../hooks/useCallEmbed';
import { useCallPreferences } from '../../state/hooks/callPreferences';
import { callChatAtom } from '../../state/callEmbed';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { switchingToCallAtom, useSwitchCall } from '../call-switch/useSwitchCall';
import { AudioMenuArrow } from '../call-audio-settings';
import { tr } from '../translation/tr';

// One device you'll join with: its icon and its state in words, the fill red while it's off.
// The arrow in the corner picks the device, a sibling of the toggle so buttons don't nest.
type DeviceToggleProps = {
  on: boolean;
  icon: IconSrc;
  offIcon: IconSrc;
  label: string;
  action: string;
  onToggle: () => unknown;
  busy?: boolean;
  menu?: ReactNode;
};
function DeviceToggle({
  on,
  icon,
  offIcon,
  label,
  action,
  onToggle,
  busy,
  menu,
}: DeviceToggleProps) {
  return (
    <div className={on ? css.DeviceTile : css.DeviceTileOff}>
      <button
        type="button"
        className={css.DeviceToggle}
        onClick={() => onToggle()}
        disabled={busy}
        aria-pressed={on}
        aria-label={action}
        title={action}
      >
        <Icon size="300" src={on ? icon : offIcon} filled={!on} />
        <span className={css.DeviceLabel}>{label}</span>
      </button>
      {menu && <span className={css.DeviceMenu}>{menu}</span>}
    </div>
  );
}

type PrescreenControlsProps = {
  canJoin?: boolean;
  empty?: boolean;
};
export function PrescreenControls({ canJoin, empty }: PrescreenControlsProps) {
  const room = useRoom();
  const callEmbed = useCallEmbed();
  const callJoined = useCallJoined(callEmbed);
  const direct = useIsDirectRoom();

  const startCall = useSwitchCall(direct);
  const switchingTo = useAtomValue(switchingToCallAtom);
  const joining = (callEmbed?.roomId === room.roomId && !callJoined) || switchingTo === room.roomId;
  const [chat, setChat] = useAtom(callChatAtom);

  const disabled = !canJoin;

  const { microphone, video, sound, toggleMicrophone, toggleVideo, toggleSound } =
    useCallPreferences();
  const [micState, toggleMic] = useAsyncCallback(
    useCallback(async () => toggleMicrophone(), [toggleMicrophone])
  );
  const [videoState, toggleCamera] = useAsyncCallback(
    useCallback(async () => toggleVideo(), [toggleVideo])
  );

  // The devices you'll join with, then one big button: the only thing to do on this page.
  return (
    <Box direction="Column" gap="400" className={css.PrejoinControls}>
      <div className={css.DeviceTiles}>
        <DeviceToggle
          on={microphone}
          icon={Icons.Mic}
          offIcon={Icons.MicMute}
          label={
            microphone ? tr('call_view.mic_is_on', 'Mic on') : tr('call_view.mic_is_off', 'Mic off')
          }
          action={
            microphone
              ? tr('call_view.mic_off', 'Turn Off Microphone')
              : tr('call_view.mic_on', 'Turn On Microphone')
          }
          onToggle={toggleMic}
          busy={micState.status === AsyncStatus.Loading}
          menu={<AudioMenuArrow kind="input" className={css.DeviceArrow} />}
        />
        <DeviceToggle
          on={sound}
          icon={Icons.Headphone}
          offIcon={Icons.HeadphoneMute}
          label={
            sound
              ? tr('call_view.sound_is_on', 'Sound on')
              : tr('call_view.sound_is_off', 'Sound off')
          }
          action={
            sound
              ? tr('call_view.sound_off', 'Turn Off Sound')
              : tr('call_view.sound_on', 'Turn On Sound')
          }
          onToggle={toggleSound}
          menu={<AudioMenuArrow kind="output" className={css.DeviceArrow} />}
        />
        <DeviceToggle
          on={video}
          icon={Icons.VideoCamera}
          offIcon={Icons.VideoCameraMute}
          label={
            video
              ? tr('call_view.camera_is_on', 'Camera on')
              : tr('call_view.camera_is_off', 'Camera off')
          }
          action={
            video
              ? tr('call_view.camera_off', 'Stop Camera')
              : tr('call_view.camera_on', 'Start Camera')
          }
          onToggle={toggleCamera}
          busy={videoState.status === AsyncStatus.Loading}
        />
      </div>
      <Button
        className={css.JoinButton}
        size="500"
        radii="400"
        variant={disabled ? 'Secondary' : 'Primary'}
        fill={disabled ? 'Soft' : 'Solid'}
        onClick={() => startCall(room, { microphone, video, sound })}
        disabled={disabled || joining}
        before={
          joining ? (
            <Spinner variant="Primary" fill="Solid" size="200" />
          ) : (
            <Icon src={Icons.Phone} size="200" filled />
          )
        }
      >
        <Text size="B500">
          {empty ? tr('call_view.start', 'Start call') : tr('call_view.join', 'Join call')}
        </Text>
      </Button>
      <button
        type="button"
        className={css.PrejoinChat}
        onClick={() => setChat(!chat)}
        aria-pressed={chat}
      >
        <Icon size="100" src={Icons.Message} filled={chat} />
        {chat ? tr('call_view.chat_off', 'Close Chat') : tr('call_view.chat_on', 'Open Chat')}
      </button>
    </Box>
  );
}
