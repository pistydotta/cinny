import React, { CSSProperties, ReactNode, useId, useState } from 'react';
import { useAtomValue } from 'jotai';
import { Icon, Icons, Switch, Text } from 'folds';
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
import { LEVEL_BARS, SYSTEM_KEY, useDeviceLevels } from './deviceLevels';
import { tr } from '../translation/tr';
import { deviceNames, shownDevices } from './deviceNames';
import { SlidingName } from './SlidingName';
import * as css from './callAudio.css';

type IconSrc = typeof Icons[keyof typeof Icons];

function LevelBars({ lit }: { lit: number }) {
  return (
    <span className={css.Bars} aria-hidden>
      {Array.from({ length: LEVEL_BARS }, (_, i) => (
        <span key={i} className={css.Bar} data-lit={i < lit} />
      ))}
    </span>
  );
}

type DeviceListProps = {
  label: string;
  icon: IconSrc;
  devices: MediaDeviceInfo[];
  selected: string | undefined;
  onSelect: (deviceId: string | undefined) => void;
  named: boolean;
  askPermission: () => Promise<void>;
  // Mics show what each one hears; speakers have nothing to show.
  live?: boolean;
};

// Every device in view, one click to choose: no list to open first.
function DeviceList({
  label,
  icon,
  devices,
  selected,
  onSelect,
  named,
  askPermission,
  live,
}: DeviceListProps) {
  const systemLabel = tr('call_audio.system_default', 'System default');
  // A saved device that is unplugged now: the call falls back to the system's.
  const current = devices.find((d) => d.deviceId === selected);
  const names = deviceNames(devices.map((d) => d.label));
  const [all, setAll] = useState(false);
  const shown = all ? devices : shownDevices(devices, (d) => d === current);
  const hidden = devices.length - shown.length;
  const rows = [undefined, ...shown];
  // Opening the mics needs the permission the names come with, or the menu would ask for it.
  const levels = useDeviceLevels(
    rows.map((d) => d?.deviceId),
    !!live && named
  );

  return (
    <div className={css.Section}>
      <div className={css.Options} role="radiogroup" aria-label={label}>
        {rows.map((device) => {
          const id = device?.deviceId;
          const checked = device ? current?.deviceId === id : !current;
          const name = device ? names[devices.indexOf(device)] || label : systemLabel;
          return (
            <button
              key={id ?? SYSTEM_KEY}
              type="button"
              role="radio"
              aria-checked={checked}
              className={css.Device}
              title={device?.label && device.label !== name ? device.label : undefined}
              onClick={() => onSelect(id)}
            >
              <Icon className={css.DeviceIcon} size="100" src={icon} />
              <SlidingName name={name} />
              {live && named && <LevelBars lit={levels.get(id ?? SYSTEM_KEY) ?? 0} />}
            </button>
          );
        })}
        {hidden > 0 && (
          <button type="button" className={`${css.Row} ${css.More}`} onClick={() => setAll(true)}>
            <Icon size="50" src={Icons.ChevronBottom} />
            <Text className={css.RowText} size="T200">
              {tr('call_audio.show_all', 'Show all ({{count}})', { count: devices.length })}
            </Text>
          </button>
        )}
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
      <div className={css.LevelHead}>
        <Text as="label" htmlFor={id} size="T300">
          {label}
        </Text>
        <Text as="output" htmlFor={id} size="T200" priority="300" className={css.LevelValue}>
          {percent}%
        </Text>
      </div>
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

type OptionRowProps = {
  icon: IconSrc;
  label: string;
  description: ReactNode;
  value: boolean;
  onChange: (value: boolean) => void;
};

// An on/off choice with what it does underneath, and the app's switch.
function OptionRow({ icon, label, description, value, onChange }: OptionRowProps) {
  return (
    <div className={css.OptionRow}>
      <span className={css.OptionIcon} data-on={value}>
        <Icon size="100" src={icon} />
      </span>
      <span className={css.RowText}>
        <Text size="T300">{label}</Text>
        <Text size="T200" priority="300" truncate>
          {description}
        </Text>
      </span>
      <Switch variant="Primary" value={value} onChange={onChange} aria-label={label} />
    </div>
  );
}

export function InputSettings({ withNoise }: { withNoise?: boolean }) {
  const embed = useAtomValue(callEmbedAtom);
  const audio = useCallAudio();
  const devices = useAudioDevices();
  const [noise, setNoise] = useSetting(settingsAtom, 'callNoiseSuppression');
  // The list already shows each mic's level, so the test is only hearing yourself back.
  const listen = useMicTest({
    inputDevice: audio.inputDevice,
    outputDevice: audio.outputDevice,
    inputGain: audio.inputGain,
    outputVolume: audio.outputVolume,
    onAllowed: devices.named ? undefined : devices.refresh,
  });

  return (
    <div className={css.Stack}>
      <DeviceList
        label={tr('call_audio.input_device', 'Input device')}
        icon={Icons.Mic}
        devices={devices.inputs}
        selected={audio.inputDevice}
        onSelect={(id) => setInputDevice(id, embed)}
        named={devices.named}
        askPermission={devices.askPermission}
        live
      />
      <div className={css.Controls}>
        <Level
          label={tr('call_audio.input_volume', 'Input volume')}
          value={audio.inputGain}
          max={MAX_INPUT_GAIN}
          onChange={setInputGain}
        />
        <OptionRow
          icon={Icons.Headphone}
          label={tr('call_audio.listen', 'Hear myself')}
          description={
            listen.failed
              ? tr('call_audio.mic_test_failed', "Couldn't open this microphone.")
              : tr('call_audio.listen_hint', 'Hear your voice in your headphones')
          }
          value={listen.testing}
          onChange={listen.toggle}
        />
        {withNoise && (
          <OptionRow
            icon={Icons.Filter}
            label={tr('call_audio.noise', 'Noise suppression')}
            description={tr('call_audio.noise_next_call', 'Applies from the next call you join.')}
            value={noise}
            onChange={setNoise}
          />
        )}
      </div>
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
    <div className={css.Stack}>
      {unsupported ? (
        <Text className={css.Hint} size="T200" priority="300">
          {tr(
            'call_audio.output_unsupported',
            "This browser plays calls on the system's device. Change it in the system settings."
          )}
        </Text>
      ) : (
        <DeviceList
          label={tr('call_audio.output_device', 'Output device')}
          icon={Icons.VolumeHigh}
          devices={devices.outputs}
          selected={audio.outputDevice}
          onSelect={(id) => setOutputDevice(id, embed)}
          named={devices.named}
          askPermission={devices.askPermission}
        />
      )}
      <div className={css.Controls}>
        <Level
          label={tr('call_audio.output_volume', 'Output volume')}
          value={audio.outputVolume}
          max={MAX_OUTPUT_VOLUME}
          onChange={(volume) => setOutputVolume(volume, embed)}
        />
        <button
          type="button"
          className={css.TestButton}
          aria-pressed={sound.playing}
          onClick={sound.play}
        >
          <Icon size="100" src={Icons.VolumeHigh} />
          <Text as="span" size="T300">
            {tr('call_audio.sound_test', 'Play test sound')}
          </Text>
        </button>
      </div>
    </div>
  );
}
