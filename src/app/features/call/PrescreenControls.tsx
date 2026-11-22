import React, { useCallback } from 'react';
import { Box, Button, Icon, Icons, Spinner, Text } from 'folds';
import { useAtomValue } from 'jotai';
import * as css from './styles.css';
import { ChatButton, ControlDivider, MicrophoneButton, SoundButton, VideoButton } from './Controls';
import { useIsDirectRoom, useRoom } from '../../hooks/useRoom';
import { useCallEmbed, useCallJoined } from '../../hooks/useCallEmbed';
import { useCallPreferences } from '../../state/hooks/callPreferences';
import { switchingToCallAtom, useSwitchCall } from '../call-switch/useSwitchCall';
import { AudioMenuArrow } from '../call-audio-settings';
import { tr } from '../translation/tr';

type PrescreenControlsProps = {
  canJoin?: boolean;
};
export function PrescreenControls({ canJoin }: PrescreenControlsProps) {
  const room = useRoom();
  const callEmbed = useCallEmbed();
  const callJoined = useCallJoined(callEmbed);
  const direct = useIsDirectRoom();

  const startCall = useSwitchCall(direct);
  const switchingTo = useAtomValue(switchingToCallAtom);
  const joining = (callEmbed?.roomId === room.roomId && !callJoined) || switchingTo === room.roomId;

  const disabled = !canJoin;

  const { microphone, video, sound, toggleMicrophone, toggleVideo, toggleSound } =
    useCallPreferences();

  const handleMicrophoneToggle = useCallback(async () => toggleMicrophone(), [toggleMicrophone]);
  const handleVideoToggle = useCallback(async () => toggleVideo(), [toggleVideo]);

  // The devices you'll join with, then one big button: the only thing to do on this page.
  return (
    <Box direction="Column" gap="400">
      <Box className={css.PrejoinDevices} alignItems="Center" justifyContent="Center" gap="200">
        <MicrophoneButton enabled={microphone} onToggle={handleMicrophoneToggle} />
        <AudioMenuArrow kind="input" />
        <SoundButton enabled={sound} onToggle={toggleSound} />
        <AudioMenuArrow kind="output" />
        <ControlDivider />
        <VideoButton enabled={video} onToggle={handleVideoToggle} />
        <ChatButton />
      </Box>
      <Button
        size="500"
        radii="300"
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
        <Text size="B500">{tr('call_view.join', 'Join')}</Text>
      </Button>
    </Box>
  );
}
