import React, { MouseEventHandler, useState } from 'react';
import FocusTrap from 'focus-trap-react';
import { Box, Icon, Icons, Menu, PopOut, RectCords, Text, config } from 'folds';
import { TipIconButton } from '../tooltips/TipIconButton';
import { tr } from '../translation/tr';
import { stopPropagation } from '../../utils/keyboard';
import { Modal500 } from '../../components/Modal500';
import { InputSettings, OutputSettings } from './AudioSettingsParts';
import { CallAudioSettings } from './CallAudioSettings';
import * as css from './callAudio.css';

export function VoiceSettingsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal500 requestClose={onClose}>
      <Box direction="Column" gap="300" style={{ padding: config.space.S400 }}>
        <Box alignItems="Center" justifyContent="SpaceBetween">
          <Text size="H4">{tr('call_audio.voice_settings', 'Voice settings')}</Text>
          <TipIconButton
            size="300"
            radii="300"
            label={tr('voice_member.close', 'Close')}
            onClick={onClose}
          >
            <Icon size="100" src={Icons.Cross} />
          </TipIconButton>
        </Box>
        <CallAudioSettings />
      </Box>
    </Modal500>
  );
}

type AudioMenuArrowProps = {
  kind: 'input' | 'output';
};

// The small arrow beside the mic or headphone button, like Discord's: devices and volume
// without opening the settings.
export function AudioMenuArrow({ kind }: AudioMenuArrowProps) {
  const [cords, setCords] = useState<RectCords>();
  const [dialog, setDialog] = useState(false);

  const open: MouseEventHandler<HTMLButtonElement> = (event) =>
    setCords(cords ? undefined : event.currentTarget.getBoundingClientRect());

  return (
    <>
      <PopOut
        anchor={cords}
        position="Top"
        align="Start"
        content={
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: () => setCords(undefined),
              clickOutsideDeactivates: true,
              escapeDeactivates: stopPropagation,
            }}
          >
            <Menu className={css.Menu}>
              {kind === 'input' ? <InputSettings withNoise /> : <OutputSettings />}
              <div className={css.Divider} />
              <button
                type="button"
                className={css.Row}
                onClick={() => {
                  setCords(undefined);
                  setDialog(true);
                }}
              >
                <Icon size="100" src={Icons.Setting} />
                <Text className={css.RowText} size="T300">
                  {tr('call_audio.voice_settings', 'Voice settings')}
                </Text>
              </button>
            </Menu>
          </FocusTrap>
        }
      >
        <TipIconButton
          className={css.Arrow}
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
          aria-pressed={!!cords}
          aria-haspopup="menu"
        >
          <Icon size="50" src={Icons.ChevronTop} />
        </TipIconButton>
      </PopOut>
      {dialog && <VoiceSettingsDialog onClose={() => setDialog(false)} />}
    </>
  );
}
