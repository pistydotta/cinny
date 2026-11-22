import { Box, Chip, Icon, IconButton, Icons, Spinner, Text, Tooltip, TooltipProvider } from 'folds';
import React, { useCallback } from 'react';
import { useSetAtom } from 'jotai';
import { StatusDivider } from './components';
import { CallEmbed, useCallControlState } from '../../plugins/call';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { callEmbedAtom } from '../../state/callEmbed';
import { AudioMenuArrow } from '../call-audio-settings';
import { tr } from '../translation/tr';

type MicrophoneButtonProps = {
  enabled: boolean;
  onToggle: () => Promise<unknown>;
  disabled?: boolean;
};
function MicrophoneButton({ enabled, onToggle, disabled }: MicrophoneButtonProps) {
  const [micState, toggleMic] = useAsyncCallback(onToggle);
  const loading = micState.status === AsyncStatus.Loading;

  return (
    <TooltipProvider
      position="Top"
      tooltip={
        <Tooltip>
          <Text size="T200">
            {enabled
              ? tr('call_view.mic_off', 'Turn Off Microphone')
              : tr('call_view.mic_on', 'Turn On Microphone')}
          </Text>
        </Tooltip>
      }
    >
      {(anchorRef) => (
        <IconButton
          ref={anchorRef}
          variant={enabled ? 'Surface' : 'Warning'}
          fill="Soft"
          radii="300"
          size="300"
          onClick={toggleMic}
          outlined
          disabled={disabled || loading}
        >
          <Icon size="100" src={enabled ? Icons.Mic : Icons.MicMute} filled={!enabled} />
        </IconButton>
      )}
    </TooltipProvider>
  );
}

type SoundButtonProps = {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
};
function SoundButton({ enabled, onToggle, disabled }: SoundButtonProps) {
  return (
    <TooltipProvider
      position="Top"
      tooltip={
        <Tooltip>
          <Text size="T200">
            {enabled
              ? tr('call_view.sound_off', 'Turn Off Sound')
              : tr('call_view.sound_on', 'Turn On Sound')}
          </Text>
        </Tooltip>
      }
    >
      {(anchorRef) => (
        <IconButton
          ref={anchorRef}
          variant={enabled ? 'Surface' : 'Warning'}
          fill="Soft"
          radii="300"
          size="300"
          onClick={() => onToggle()}
          outlined
          disabled={disabled}
        >
          <Icon
            size="100"
            src={enabled ? Icons.Headphone : Icons.HeadphoneMute}
            filled={!enabled}
          />
        </IconButton>
      )}
    </TooltipProvider>
  );
}

type VideoButtonProps = {
  enabled: boolean;
  onToggle: () => Promise<unknown>;
  disabled?: boolean;
};
function VideoButton({ enabled, onToggle, disabled }: VideoButtonProps) {
  const [videoState, toggleVideo] = useAsyncCallback(onToggle);
  const loading = videoState.status === AsyncStatus.Loading;

  return (
    <TooltipProvider
      position="Top"
      tooltip={
        <Tooltip>
          <Text size="T200">
            {enabled
              ? tr('call_view.camera_off', 'Stop Camera')
              : tr('call_view.camera_on', 'Start Camera')}
          </Text>
        </Tooltip>
      }
    >
      {(anchorRef) => (
        <IconButton
          ref={anchorRef}
          variant={enabled ? 'Success' : 'Surface'}
          fill="Soft"
          radii="300"
          size="300"
          onClick={toggleVideo}
          outlined
          disabled={disabled || loading}
        >
          <Icon
            size="100"
            src={enabled ? Icons.VideoCamera : Icons.VideoCameraMute}
            filled={enabled}
          />
        </IconButton>
      )}
    </TooltipProvider>
  );
}

type ScreenShareButtonProps = {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
};
function ScreenShareButton({ enabled, onToggle, disabled }: ScreenShareButtonProps) {
  return (
    <TooltipProvider
      position="Top"
      tooltip={
        <Tooltip>
          <Text size="T200">
            {enabled
              ? tr('call_view.screenshare_off', 'Stop Screenshare')
              : tr('call_view.screenshare_on', 'Start Screenshare')}
          </Text>
        </Tooltip>
      }
    >
      {(anchorRef) => (
        <IconButton
          ref={anchorRef}
          variant={enabled ? 'Success' : 'Surface'}
          fill="Soft"
          radii="300"
          size="300"
          onClick={onToggle}
          outlined
          disabled={disabled}
        >
          <Icon size="100" src={Icons.ScreenShare} filled={enabled} />
        </IconButton>
      )}
    </TooltipProvider>
  );
}

export function CallControl({
  callEmbed,
  compact,
  callJoined,
  devices = true,
}: {
  callEmbed: CallEmbed;
  compact: boolean;
  callJoined: boolean;
  // Off while the call's own page is open: the bar under the call already has these buttons.
  devices?: boolean;
}) {
  const { microphone, video, sound, screenshare } = useCallControlState(callEmbed.control);
  const setCallEmbed = useSetAtom(callEmbedAtom);

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

  const handleHangup = () => {
    if (!callJoined) {
      setCallEmbed(undefined);
      return;
    }
    hangup();
  };

  return (
    <Box shrink="No" alignItems="Center" gap="300">
      {devices && (
        <>
          <Box alignItems="Inherit" gap="200">
            <MicrophoneButton
              enabled={microphone}
              onToggle={handleMicrophoneToggle}
              disabled={!callJoined}
            />
            <AudioMenuArrow kind="input" />
            <SoundButton
              enabled={sound}
              onToggle={() => callEmbed.control.toggleSound()}
              disabled={!callJoined}
            />
            <AudioMenuArrow kind="output" />
            {!compact && <StatusDivider />}
            <VideoButton enabled={video} onToggle={handleVideoToggle} disabled={!callJoined} />
            {!compact && (
              <ScreenShareButton
                enabled={screenshare}
                onToggle={() => callEmbed.control.toggleScreenshare()}
                disabled={!callJoined}
              />
            )}
          </Box>
          <StatusDivider />
        </>
      )}
      <Chip
        variant="Critical"
        radii="Pill"
        fill="Soft"
        before={
          exiting ? (
            <Spinner variant="Critical" fill="Soft" size="50" />
          ) : (
            <Icon size="50" src={Icons.PhoneDown} filled />
          )
        }
        disabled={exiting}
        outlined
        onClick={handleHangup}
        aria-label={tr('screen_share.leave_call', 'Leave call')}
      >
        {!compact && (
          <Text as="span" size="L400">
            {tr('screen_share.leave', 'Leave')}
          </Text>
        )}
      </Chip>
    </Box>
  );
}
