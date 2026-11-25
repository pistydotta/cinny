import React, { CSSProperties, useId } from 'react';
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
import { useMicTest, useSoundTest } from './audioTest';
import { tr } from '../translation/tr';
import * as css from './callAudio.css';

type DeviceListProps = {
  label: string;
  devices: MediaDeviceInfo[];
  selected: string | undefined;
  onSelect: (deviceId: string | undefined) => void;
  named: boolean;
  askPermission: () => Promise<void>;
};

// Every device in view, one click to choose: no list to open first.
function DeviceList({ label, devices, selected, onSelect, named, askPermission }: DeviceListProps) {
  const headingId = useId();
  const systemLabel = tr('call_audio.system_default', 'System default');
  // A saved device that is unplugged now: the call falls back to the system's.
  const current = devices.find((d) => d.deviceId === selected);

  return (
    <div className={css.Section}>
      <Text id={headingId} className={css.Heading} size="L400">
        {label}
      </Text>
      <div className={css.Options} role="radiogroup" aria-labelledby={headingId}>
        {[undefined, ...devices].map((device) => {
          const id = device?.deviceId;
          const checked = device ? current?.deviceId === id : !current;
          return (
            <button
              key={id ?? 'system'}
              type="button"
              role="radio"
              aria-checked={checked}
              className={`${css.Row} ${css.Option}`}
              onClick={() => onSelect(id)}
            >
              <span className={css.Radio} aria-hidden />
              <Text className={css.RowText} size="T300" truncate>
                {device ? device.label || label : systemLabel}
              </Text>
            </button>
          );
        })}
      </div>
      {!named && (
        <button type="button" className={css.Row} onClick={() => askPermission()}>
          <Icon size="100" src={Icons.Lock} />
          <Text className={css.RowText} size="T200">
            {tr('call_audio.permission', 'Allow the microphone to see each device by name.')}
          </Text>
        </button>
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
        className={css.Slider}
        type="range"
        min="0"
        max={max}
        step="0.05"
        value={value}
        aria-valuetext={`${percent}%`}
        style={{ '--level': `${(value / max) * 100}%` } as CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

const BARS = 16;
// The top quarter is loud enough to clip in a call.
const HOT_FROM = 12;

function Meter({ level, label }: { level: number; label: string }) {
  const lit = Math.round(level * BARS);
  return (
    <div
      className={css.Meter}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(level * 100)}
    >
      {Array.from({ length: BARS }, (_, i) => (
        <span key={i} className={css.MeterBar} data-lit={i < lit} data-hot={i >= HOT_FROM} />
      ))}
    </div>
  );
}

export function InputSettings({ withNoise }: { withNoise?: boolean }) {
  const embed = useAtomValue(callEmbedAtom);
  const audio = useCallAudio();
  const devices = useAudioDevices();
  const [noise, setNoise] = useSetting(settingsAtom, 'callNoiseSuppression');
  const test = useMicTest({
    inputDevice: audio.inputDevice,
    outputDevice: audio.outputDevice,
    inputGain: audio.inputGain,
    outputVolume: audio.outputVolume,
    onAllowed: devices.named ? undefined : devices.refresh,
  });
  const levelLabel = tr('call_audio.mic_level', 'Microphone level');

  return (
    <div className={css.Section}>
      <DeviceList
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
      <div className={css.Test}>
        <button
          type="button"
          className={css.TestButton}
          aria-pressed={test.testing}
          onClick={test.toggle}
        >
          <Icon size="50" src={test.testing ? Icons.Pause : Icons.Mic} />
          <Text as="span" size="T200">
            {test.testing
              ? tr('call_audio.mic_test_stop', 'Stop test')
              : tr('call_audio.mic_test', 'Test mic')}
          </Text>
        </button>
        <Meter level={test.level} label={levelLabel} />
      </div>
      <Text className={css.Hint} size="T200" priority="300">
        {test.failed
          ? tr('call_audio.mic_test_failed', "Couldn't open this microphone.")
          : tr('call_audio.mic_test_hint', 'You hear yourself while testing. Use headphones.')}
      </Text>
      {withNoise && (
        <Box className={css.Row} as="div" alignItems="Center" style={{ cursor: 'default' }}>
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
  const sound = useSoundTest(audio.outputDevice, audio.outputVolume);
  const unsupported = devices.named && devices.outputs.length === 0;

  return (
    <div className={css.Section}>
      {unsupported ? (
        <div className={css.Section}>
          <Text className={css.Heading} size="L400">
            {tr('call_audio.output_device', 'Output device')}
          </Text>
          <Text className={css.Hint} size="T200" priority="300">
            {tr(
              'call_audio.output_unsupported',
              "This browser plays calls on the system's device. Change it in the system settings."
            )}
          </Text>
        </div>
      ) : (
        <DeviceList
          label={tr('call_audio.output_device', 'Output device')}
          devices={devices.outputs}
          selected={audio.outputDevice}
          onSelect={(id) => setOutputDevice(id, embed)}
          named={devices.named}
          askPermission={devices.askPermission}
        />
      )}
      <Level
        label={tr('call_audio.output_volume', 'Output volume')}
        value={audio.outputVolume}
        max={MAX_OUTPUT_VOLUME}
        onChange={(volume) => setOutputVolume(volume, embed)}
      />
      <div className={css.Test}>
        <button
          type="button"
          className={css.TestButton}
          aria-pressed={sound.playing}
          onClick={sound.play}
        >
          <Icon size="50" src={Icons.VolumeHigh} />
          <Text as="span" size="T200">
            {tr('call_audio.sound_test', 'Play test sound')}
          </Text>
        </button>
      </div>
    </div>
  );
}
