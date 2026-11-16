import React, { useCallback, useRef, useState } from 'react';
import { Box, Button, Icon, Icons, Spinner, Text, toRem } from 'folds';
import { SequenceCard } from '../../components/sequence-card';
import * as css from './styles.css';
import {
  ChatButton,
  ControlDivider,
  MicrophoneButton,
  ScreenShareButton,
  SoundButton,
  VideoButton,
} from './Controls';
import { CallEmbed, useCallControlState } from '../../plugins/call';
import { useResizeObserver } from '../../hooks/useResizeObserver';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { AudioMenuArrow } from '../call-audio-settings';
import { CallMoreMenu } from './CallMoreMenu';

type CallControlsProps = {
  callEmbed: CallEmbed;
};
export function CallControls({ callEmbed }: CallControlsProps) {
  const controlRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(document.body.clientWidth < 500);

  useResizeObserver(
    useCallback(() => {
      const element = controlRef.current;
      if (!element) return;
      setCompact(element.clientWidth < 500);
    }, []),
    useCallback(() => controlRef.current, [])
  );

  const { microphone, video, sound, screenshare, spotlight } = useCallControlState(
    callEmbed.control
  );

  const handleMicrophoneToggle = useCallback(
    () => callEmbed.control.toggleMicrophone(),
    [callEmbed]
  );
  const handleVideoToggle = useCallback(() => callEmbed.control.toggleVideo(), [callEmbed]);

  const [hangupState, hangup] = useAsyncCallback(
    useCallback(() => callEmbed.hangup(), [callEmbed])
  );
  const exiting =
    hangupState.status === AsyncStatus.Loading || hangupState.status === AsyncStatus.Success;

  return (
    <Box
      ref={controlRef}
      className={css.CallControlContainer}
      justifyContent="Center"
      alignItems="Center"
    >
      <SequenceCard
        className={css.ControlCard}
        variant="SurfaceVariant"
        gap="400"
        radii="500"
        alignItems="Center"
        justifyContent="Center"
      >
        <Box alignItems="Center" gap="Inherit" grow="Yes" direction={compact ? 'Column' : 'Row'}>
          <Box shrink="No" alignItems="Inherit" justifyContent="Inherit" gap="200">
            <MicrophoneButton enabled={microphone} onToggle={handleMicrophoneToggle} />
            <AudioMenuArrow kind="input" />
            <SoundButton enabled={sound} onToggle={() => callEmbed.control.toggleSound()} />
            <AudioMenuArrow kind="output" />
          </Box>
          {!compact && <ControlDivider />}
          <Box shrink="No" alignItems="Inherit" justifyContent="Inherit" gap="200">
            <VideoButton enabled={video} onToggle={handleVideoToggle} />
            <ScreenShareButton
              enabled={screenshare}
              onToggle={() => callEmbed.control.toggleScreenshare()}
            />
          </Box>
        </Box>
        {!compact && <ControlDivider />}
        <Box alignItems="Center" gap="Inherit" grow="Yes" direction={compact ? 'Column' : 'Row'}>
          <Box shrink="No" alignItems="Inherit" justifyContent="Inherit" gap="200">
            <ChatButton />
            <CallMoreMenu callEmbed={callEmbed} spotlight={spotlight} />
          </Box>
          <Box shrink="No" direction="Column">
            <Button
              style={{ minWidth: toRem(88) }}
              variant="Critical"
              fill="Solid"
              onClick={hangup}
              before={
                exiting ? (
                  <Spinner variant="Critical" fill="Solid" size="200" />
                ) : (
                  <Icon src={Icons.PhoneDown} size="200" filled />
                )
              }
              disabled={exiting}
            >
              <Text size="B400">End</Text>
            </Button>
          </Box>
        </Box>
      </SequenceCard>
    </Box>
  );
}
