import React, { CSSProperties, useId, useState } from 'react';
import { useAtomValue } from 'jotai';
import { Box, Icon, Icons, Switch, Text } from 'folds';
import { callEmbedAtom } from '../../state/callEmbed';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { MAX_INPUT_GAIN, MAX_OUTPUT_VOLUME } from '../../../element-call/audioSettings';
import {
  setInputDevice,
  setInputGain,
  setOutputDevice,
  setOutputVolume,
  useAudioDevices,
  useCallAudio,
} from './callAudio';
import { tr } from '../translation/tr';
import * as voiceCss from '../call/voiceMember.css';
import * as css from './callAudio.css';

type DevicePickerProps = {
  label: string;
  devices: MediaDeviceInfo[];
  selected: string | undefined;
  onSelect: (deviceId: string | undefined) => void;
  named: boolean;
  askPermission: () => Promise<void>;
  unsupported?: string;
};

function DevicePicker({
  label,
  devices,
  selected,
  onSelect,
  named,
  askPermission,
  unsupported,
}: DevicePickerProps) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const systemLabel = tr('call_audio.system_default', 'System default');
  // A saved device that is unplugged now: the call falls back to the system's.
  const current = devices.find((d) => d.deviceId === selected);
  const currentLabel = current?.label || systemLabel;

  if (unsupported && devices.length === 0 && named) {
    return (
      <Box direction="Column" className={css.Row} as="div">
        <Text size="T300">{label}</Text>
        <Text size="T200" priority="300">
          {unsupported}
        </Text>
      </Box>
    );
  }

  return (
    <div className={css.Section}>
      <button
        type="button"
        className={css.Row}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          if (!named) askPermission();
          setOpen(!open);
        }}
      >
        <span className={css.RowText}>
          <Text size="T300">{label}</Text>
          <Text size="T200" priority="300" truncate>
            {currentLabel}
          </Text>
        </span>
        <Icon size="100" src={open ? Icons.ChevronBottom : Icons.ChevronRight} />
      </button>
      {open && (
        <div id={listId} className={css.Options} role="radiogroup" aria-label={label}>
          {[undefined, ...devices].map((device) => {
            const id = device?.deviceId;
            const checked = device ? current?.deviceId === id : !current;
            return (
              <button
                key={id ?? 'system'}
                type="button"
                role="radio"
                aria-checked={checked}
                className={css.Row}
                onClick={() => {
                  onSelect(id);
                  setOpen(false);
                }}
              >
                <Text className={css.RowText} size="T300" truncate>
                  {device ? device.label || label : systemLabel}
                </Text>
                {checked && <Icon size="100" src={Icons.Check} />}
              </button>
            );
          })}
          {!named && (
            <Text size="T200" priority="300" style={{ padding: '4px 12px' }}>
              {tr('call_audio.permission', 'Allow the microphone to see each device by name.')}
            </Text>
          )}
        </div>
      )}
    </div>
  );
}

type LevelProps = {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
};

function Level({ label, value, max, onChange }: LevelProps) {
  const id = useId();
  const percent = Math.round(value * 100);
  return (
    <div className={css.Level}>
      <Box justifyContent="SpaceBetween" alignItems="Center">
        <Text as="label" htmlFor={id} size="T300">
          {label}
        </Text>
        <Text as="output" htmlFor={id} size="T200" priority="300" className={css.LevelValue}>
          {percent}%
        </Text>
      </Box>
      <input
        id={id}
        className={voiceCss.Slider}
        type="range"
        min="0"
        max={max}
        step="0.05"
        value={value}
        aria-valuetext={`${percent}%`}
        style={{ '--voice-volume': `${(value / max) * 100}%` } as CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

export function InputSettings({ withNoise }: { withNoise?: boolean }) {
  const embed = useAtomValue(callEmbedAtom);
  const audio = useCallAudio();
  const devices = useAudioDevices();
  const [noise, setNoise] = useSetting(settingsAtom, 'callNoiseSuppression');
  return (
    <div className={css.Section}>
      <DevicePicker
        label={tr('call_audio.input_device', 'Input device')}
        devices={devices.inputs}
        selected={audio.inputDevice}
        onSelect={(id) => setInputDevice(id, embed)}
        named={devices.named}
        askPermission={devices.askPermission}
      />
      <Level
        label={tr('call_audio.input_volume', 'Input volume')}
        value={audio.inputGain}
        max={MAX_INPUT_GAIN}
        onChange={setInputGain}
      />
      {withNoise && (
        <Box className={css.Row} as="div" alignItems="Center">
          <span className={css.RowText}>
            <Text size="T300">{tr('call_audio.noise', 'Noise suppression')}</Text>
            <Text size="T200" priority="300">
              {tr('call_audio.noise_next_call', 'Applies from the next call you join.')}
            </Text>
          </span>
          <Switch
            variant="Primary"
            value={noise}
            onChange={setNoise}
            aria-label={tr('call_audio.noise', 'Noise suppression')}
          />
        </Box>
      )}
    </div>
  );
}

export function OutputSettings() {
  const embed = useAtomValue(callEmbedAtom);
  const audio = useCallAudio();
  const devices = useAudioDevices();
  return (
    <div className={css.Section}>
      <DevicePicker
        label={tr('call_audio.output_device', 'Output device')}
        devices={devices.outputs}
        selected={audio.outputDevice}
        onSelect={(id) => setOutputDevice(id, embed)}
        named={devices.named}
        askPermission={devices.askPermission}
        unsupported={tr(
          'call_audio.output_unsupported',
          "This browser plays calls on the system's device. Change it in the system settings."
        )}
      />
      <Level
        label={tr('call_audio.output_volume', 'Output volume')}
        value={audio.outputVolume}
        max={MAX_OUTPUT_VOLUME}
        onChange={(volume) => setOutputVolume(volume, embed)}
      />
    </div>
  );
}
