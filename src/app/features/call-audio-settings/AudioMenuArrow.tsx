import React, { MouseEventHandler, useEffect, useRef, useState } from 'react';
import FocusTrap from 'focus-trap-react';
import classNames from 'classnames';
import { Icon, Icons, Menu, PopOut, RectCords, Text } from 'folds';
import { TipIconButton } from '../tooltips/TipIconButton';
import { tr } from '../translation/tr';
import { stopPropagation } from '../../utils/keyboard';
import { Modal500 } from '../../components/Modal500';
import { InputSettings, OutputSettings } from './AudioSettingsParts';
import { Settings, SettingsPages } from '../settings/Settings';
import * as css from './callAudio.css';

// The full settings, opened on the voice page: the menu only has the quick controls.
export function VoiceSettingsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal500 requestClose={onClose}>
      <Settings initialPage={SettingsPages.VoicePage} requestClose={onClose} />
    </Modal500>
  );
}

type AudioMenuArrowProps = {
  kind: 'input' | 'output';
  className?: string;
};

// The small arrow beside the mic or headphone button, like Discord's: devices and volume
// without opening the settings.
export function AudioMenuArrow({ kind, className }: AudioMenuArrowProps) {
  const [cords, setCords] = useState<RectCords>();
  const [dialog, setDialog] = useState(false);
  const arrowRef = useRef<HTMLButtonElement>(null);

  const open: MouseEventHandler<HTMLButtonElement> = (event) =>
    setCords(cords ? undefined : event.currentTarget.getBoundingClientRect());

  // In a call most of the screen is the call's iframe, whose clicks never reach this page, so
  // the focus trap's outside click can't see them. A click there takes focus from the window.
  const menuOpen = !!cords;
  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = () => setCords(undefined);
    window.addEventListener('blur', close);
    return () => window.removeEventListener('blur', close);
  }, [menuOpen]);

  return (
    <>
      {/* The PopOut's full-screen layer would swallow the first click on the other arrow (or
          any control behind it) while a menu is open, so it lets clicks through to the page. */}
      <PopOut
        anchor={cords}
        position="Top"
        align="Start"
        style={{ pointerEvents: 'none' }}
        content={
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: () => setCords(undefined),
              // A click on this menu's own arrow is left to its toggle, or it would reopen.
              clickOutsideDeactivates: (event) =>
                !(event.target instanceof Node && arrowRef.current?.contains(event.target)),
              allowOutsideClick: true,
              escapeDeactivates: stopPropagation,
            }}
          >
            <Menu className={css.Menu} style={{ pointerEvents: 'auto' }}>
              {kind === 'input' ? <InputSettings withNoise /> : <OutputSettings />}
              <button
                type="button"
                className={classNames(css.Row, css.Link)}
                onClick={() => {
                  setCords(undefined);
                  setDialog(true);
                }}
              >
                <Icon size="50" src={Icons.Setting} />
                <Text className={css.RowText} size="T200">
                  {tr('call_audio.voice_settings', 'Voice settings')}
                </Text>
                <Icon size="50" src={Icons.ChevronRight} />
              </button>
            </Menu>
          </FocusTrap>
        }
      >
        <TipIconButton
          ref={arrowRef}
          className={classNames(css.Arrow, className)}
          label={
            kind === 'input'
              ? tr('call_audio.input_options', 'Microphone options')
              : tr('call_audio.output_options', 'Sound options')
          }
          variant="Surface"
          fill="None"
          radii="300"
          size="300"
          onClick={open}
          hideTip={menuOpen}
          aria-pressed={menuOpen}
          aria-haspopup="menu"
        >
          <Icon size="50" src={Icons.ChevronTop} />
        </TipIconButton>
      </PopOut>
      {dialog && <VoiceSettingsDialog onClose={() => setDialog(false)} />}
    </>
  );
}
