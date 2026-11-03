import React from 'react';
import { Box, Button, Icon, Icons, Text } from 'folds';
import { CallEmbed } from '../../plugins/call/CallEmbed';
import { TipIconButton } from '../tooltips/TipIconButton';
import { tr } from '../translation/tr';
import { useShares } from './useShares';
import { saveVolume } from './watchRules';
import * as css from './styles.css';

// One row per share being watched: its volume and mute, and a way to stop.
export function WatchControls({ callEmbed }: { callEmbed: CallEmbed }) {
  const { store, remotes } = useShares(callEmbed.control);
  const watched = remotes.filter((share) => share.watching);
  if (!store || watched.length === 0) return null;

  return (
    <Box className={css.Controls} direction="Column" gap="100">
      {watched.map((share) => (
        <Box key={share.id} className={css.Row} alignItems="Center" gap="300">
          <Box grow="Yes">
            <Text size="T300" truncate>
              {share.name}
            </Text>
          </Box>
          {share.hasSound && (
            <>
              <TipIconButton
                label={
                  share.muted
                    ? tr('screen_share.unmute', 'Unmute share')
                    : tr('screen_share.mute', 'Mute share')
                }
                variant={share.muted ? 'Warning' : 'Surface'}
                fill="Soft"
                size="300"
                radii="300"
                onClick={() => store.setMuted(share.id, !share.muted)}
              >
                <Icon
                  size="200"
                  src={share.muted ? Icons.HeadphoneMute : Icons.Headphone}
                  filled={share.muted}
                />
              </TipIconButton>
              <input
                className={css.Slider}
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={share.volume}
                aria-label={tr('screen_share.volume', 'Share volume')}
                onChange={(evt) => store.setVolume(share.id, Number(evt.currentTarget.value))}
                onPointerUp={(evt) =>
                  saveVolume(() => localStorage, Number(evt.currentTarget.value))
                }
                onKeyUp={(evt) => saveVolume(() => localStorage, Number(evt.currentTarget.value))}
              />
            </>
          )}
          <Button
            size="300"
            variant="Secondary"
            fill="Soft"
            radii="300"
            onClick={() => store.unwatch(share.id)}
          >
            <Text size="B300">{tr('screen_share.stop_watching', 'Stop watching')}</Text>
          </Button>
        </Box>
      ))}
    </Box>
  );
}
