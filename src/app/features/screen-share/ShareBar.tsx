import React, { useEffect, useRef } from 'react';
import { Box, Button, Icon, Icons, Text } from 'folds';
import { CallEmbed, useCallControlState } from '../../plugins/call';
import { tr } from '../translation/tr';
import { useShares } from './useShares';
import { readableShareLabel } from './shareLabel';
import * as css from './styles.css';

// What the person sharing sees: a small preview of the capture, the PC sound toggle and Stop.
export function ShareBar({ callEmbed }: { callEmbed: CallEmbed }) {
  const { store, local } = useShares(callEmbed.control);
  const { screenshare } = useCallControlState(callEmbed.control);
  const videoRef = useRef<HTMLVideoElement>(null);
  const track = local?.videoTrack;
  const visible = !!store && !!local && screenshare;

  // The track comes from the call iframe, but a MediaStream built here plays it fine.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !track) return undefined;
    video.srcObject = new MediaStream([track]);
    return () => {
      video.srcObject = null;
    };
  }, [track, visible]);

  if (!store || !local || !visible) return null;

  const label = readableShareLabel(local.name) ?? tr('screen_share.your_screen', 'Your screen');

  return (
    <Box className={css.Controls} direction="Column">
      <Box className={css.Row} alignItems="Center" gap="300">
        <video ref={videoRef} className={css.Preview} autoPlay playsInline muted />
        <Box grow="Yes" direction="Column">
          <Text size="L400">{tr('screen_share.you_are_live', 'You are live')}</Text>
          <Text size="T200" priority="300" truncate>
            {label}
          </Text>
        </Box>
        {local.hasSound ? (
          <Button
            size="300"
            variant={local.soundOn ? 'Secondary' : 'Warning'}
            fill="Soft"
            radii="300"
            before={
              <Icon
                size="100"
                src={local.soundOn ? Icons.Headphone : Icons.HeadphoneMute}
                filled={!local.soundOn}
              />
            }
            aria-pressed={local.soundOn}
            onClick={() => store.setLocalSound(!local.soundOn)}
          >
            <Text size="B300">
              {local.soundOn
                ? tr('screen_share.pc_sound_on', 'PC sound: on')
                : tr('screen_share.pc_sound_off', 'PC sound: off')}
            </Text>
          </Button>
        ) : (
          <Text size="T200" priority="300">
            {tr('screen_share.no_sound', 'No sound')}
          </Text>
        )}
        {local.hasSound && local.volume !== undefined && (
          <label className={css.OwnerVolume} htmlFor="shared-pc-volume">
            <Text size="T200">
              {tr('screen_share.pc_volume', 'Shared PC volume')} {Math.round(local.volume * 100)}%
            </Text>
            <input
              id="shared-pc-volume"
              className={css.Slider}
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={local.volume}
              onChange={(e) => store.setLocalVolume(Number(e.target.value))}
            />
          </label>
        )}
        <Button
          size="300"
          variant="Critical"
          radii="300"
          onClick={() => callEmbed.control.toggleScreenshare()}
        >
          <Text size="B300">{tr('screen_share.stop', 'Stop')}</Text>
        </Button>
      </Box>
    </Box>
  );
}
