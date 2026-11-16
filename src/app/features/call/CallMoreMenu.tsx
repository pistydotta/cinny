import React, { MouseEventHandler, useState } from 'react';
import { Box, config, Icon, Icons, Menu, MenuItem, PopOut, RectCords, Text } from 'folds';
import FocusTrap from 'focus-trap-react';
import { CallEmbed } from '../../plugins/call';
import { stopPropagation } from '../../utils/keyboard';
import { TipIconButton } from '../tooltips/TipIconButton';
import { tr } from '../translation/tr';

type CallMoreMenuProps = {
  callEmbed: CallEmbed;
  spotlight: boolean;
  // The call bar's outlined button, or the bare white icon over a watched share.
  bare?: boolean;
  className?: string;
};

// The ⋮ button: spotlight/grid, reactions and Element Call's settings.
export function CallMoreMenu({ callEmbed, spotlight, bare, className }: CallMoreMenuProps) {
  const [cords, setCords] = useState<RectCords>();

  const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setCords(evt.currentTarget.getBoundingClientRect());
  };
  const run = (action: () => void) => () => {
    action();
    setCords(undefined);
  };

  return (
    <PopOut
      anchor={cords}
      position="Top"
      align="Center"
      content={
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: () => setCords(undefined),
            clickOutsideDeactivates: true,
            isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
            isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
            escapeDeactivates: stopPropagation,
          }}
        >
          <Menu>
            <Box direction="Column" style={{ padding: config.space.S100 }}>
              <MenuItem
                size="300"
                variant="Surface"
                radii="300"
                onClick={run(() => callEmbed.control.toggleSpotlight())}
              >
                <Text size="B300" truncate>
                  {spotlight ? 'Grid View' : 'Spotlight View'}
                </Text>
              </MenuItem>
              <MenuItem
                size="300"
                variant="Surface"
                radii="300"
                onClick={run(() => callEmbed.control.toggleReactions())}
              >
                <Text size="B300" truncate>
                  Reactions
                </Text>
              </MenuItem>
              <MenuItem
                size="300"
                variant="Surface"
                radii="300"
                onClick={run(() => callEmbed.control.toggleSettings())}
              >
                <Text size="B300" truncate>
                  Settings
                </Text>
              </MenuItem>
            </Box>
          </Menu>
        </FocusTrap>
      }
    >
      <TipIconButton
        label={tr('tips.more', 'More options')}
        className={className}
        variant={bare ? 'Secondary' : 'Surface'}
        fill={bare ? 'None' : 'Soft'}
        radii={bare ? '300' : '400'}
        size="400"
        onClick={handleOpenMenu}
        outlined={!bare}
        aria-pressed={!!cords}
      >
        <Icon size="400" src={Icons.VerticalDots} />
      </TipIconButton>
    </PopOut>
  );
}
