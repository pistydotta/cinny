import React from 'react';
import { Text } from 'folds';
import { tr } from '../translation/tr';
import { InputSettings, OutputSettings } from './AudioSettingsParts';
import * as css from './callAudio.css';

// Everything at once: in Settings > General and behind "Voice settings" in the quick menus.
export function CallAudioSettings() {
  return (
    <div className={css.Panel}>
      <section className={css.Group}>
        <Text size="H6">{tr('call_audio.input', 'Microphone')}</Text>
        <InputSettings withNoise />
      </section>
      <div className={css.Divider} />
      <section className={css.Group}>
        <Text size="H6">{tr('call_audio.output', 'Sound')}</Text>
        <OutputSettings />
      </section>
      <Text size="T200" priority="300">
        {tr(
          'call_audio.saved_here',
          'Saved on this device and used in every call. Changes also apply to the call you are in.'
        )}
      </Text>
    </div>
  );
}
