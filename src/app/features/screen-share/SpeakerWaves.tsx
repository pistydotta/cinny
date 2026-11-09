import React from 'react';
import { tr } from '../translation/tr';
import * as css from './styles.css';

const WAVES = [
  'M15 9.5a3.5 3.5 0 0 1 0 5',
  'M17.5 7a7 7 0 0 1 0 10',
  'M20 4.5a10.5 10.5 0 0 1 0 15',
];

// A speaker like the system tray's: its waves ripple outward while someone talks and rest
// otherwise, so the call reads as alive. The card and the call bar both use it. `inCall`
// keeps it green while quiet, for the bar, where it says you are connected.
export function SpeakerWaves({
  talking,
  inCall = false,
  size = 20,
}: {
  talking: boolean;
  inCall?: boolean;
  size?: number;
}) {
  return (
    <svg
      className={css.Speaker({ talking: talking || inCall })}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label={
        talking
          ? tr('call_status.someone_talking', 'Someone is talking')
          : tr('call_status.call_on', 'Call in progress')
      }
    >
      <path d="M3.5 9h3.5l4.5-4v14L7 15H3.5z" fill="currentColor" />
      {WAVES.map((d, i) => (
        <path
          key={d}
          className={css.SpeakerWave({ talking })}
          style={{ animationDelay: `${i * 0.18}s`, opacity: talking ? undefined : 0.85 - i * 0.3 }}
          d={d}
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
