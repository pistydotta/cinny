import React, { useEffect, useState } from 'react';
import { Badge, Box, Icon, Icons, Text } from 'folds';
import { CallEmbed } from '../../plugins/call/CallEmbed';
import { TipIconButton } from '../tooltips/TipIconButton';
import { tr } from '../translation/tr';
import { useShares } from './useShares';
import { readSavedVolume } from './watchRules';
import * as css from './styles.css';

// The width of one person's tile in the call, so a share waiting to be watched looks like one
// more person, as on Discord. The tiles resize with the window and the layout, so look again
// every second while a tile is shown.
const DEFAULT_TILE = 240;
const usePeopleTileWidth = (callEmbed: CallEmbed, on: boolean): number => {
  const [width, setWidth] = useState(DEFAULT_TILE);
  useEffect(() => {
    if (!on) return undefined;
    const read = () => {
      const tile = callEmbed.document?.querySelector('[data-video-fit]')?.getBoundingClientRect();
      if (tile && tile.width > 0) setWidth(Math.round(Math.min(Math.max(tile.width, 160), 360)));
    };
    read();
    const timer = window.setInterval(read, 1000);
    return () => window.clearInterval(timer);
  }, [callEmbed, on]);
  return width;
};

// One tile per share in the call that the person isn't watching yet. The floating viewer is too
// narrow for the card, so it gets one row per share instead.
export function LiveCards({ callEmbed, compact }: { callEmbed: CallEmbed; compact?: boolean }) {
  const { store, remotes } = useShares(callEmbed.control);
  const waiting = remotes.filter((share) => !share.watching);
  const tileWidth = usePeopleTileWidth(callEmbed, !compact && waiting.length > 0);
  if (!store || waiting.length === 0) return null;
  const watch = (id: string) =>
    store.watch(
      id,
      readSavedVolume(() => localStorage)
    );

  if (compact) {
    return (
      <Box className={css.CompactCards} direction="Column" gap="100">
        {waiting.map((share) => (
          <Box key={share.id} className={css.CompactCard} alignItems="Center" gap="200">
            <Badge variant="Critical" fill="Solid" size="300">
              <Text size="L400">{tr('screen_share.badge', 'Live')}</Text>
            </Badge>
            <Box grow="Yes" className={css.LiveName}>
              <Text size="T200" truncate>
                {share.name}
              </Text>
            </Box>
            <TipIconButton
              label={tr('screen_share.watch_screen', 'Watch screen')}
              variant="Primary"
              fill="Solid"
              size="300"
              radii="300"
              onClick={() => watch(share.id)}
            >
              <Icon size="100" src={Icons.Play} />
            </TipIconButton>
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <div
      className={css.Cards}
      style={{ [css.tileWidthVar]: `${tileWidth}px` } as React.CSSProperties}
    >
      {waiting.map((share) => (
        <button
          key={share.id}
          type="button"
          className={css.LiveTile}
          onClick={() => watch(share.id)}
          aria-label={tr('screen_share.watch_named', "Watch {{name}}'s screen", {
            name: share.name,
          })}
        >
          {share.preview ? (
            <img className={css.LiveTileShot} src={share.preview} alt="" />
          ) : (
            <Icon className={css.LiveTileIcon} size="600" src={Icons.ScreenShare} />
          )}
          <Badge className={css.LiveBadge} variant="Critical" fill="Solid" size="400">
            <Text size="L400">{tr('screen_share.badge', 'Live')}</Text>
          </Badge>
          <span className={css.LiveTileWatch}>
            <Icon size="100" src={Icons.Play} filled />
            <Text as="span" size="B300">
              {tr('screen_share.watch', 'Watch')}
            </Text>
          </span>
          <span className={css.LiveTileName}>
            <Icon size="50" src={Icons.ScreenShare} />
            <Text as="span" size="T200" truncate>
              {share.name}
            </Text>
          </span>
        </button>
      ))}
    </div>
  );
}
