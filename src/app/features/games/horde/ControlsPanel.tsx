import React, { useEffect, useState } from 'react';
import {
  ACTIONS,
  Action,
  Controls,
  DEFAULT_CONTROLS,
  LIMITS,
  bindKey,
  conflicts,
  saveControls,
} from './controls';
import { actionLabel, keyLabel } from './labels';
import * as css from './horde.css';
import { tr } from '../../translation/tr';

// The browser's names for this keyboard's keys (Chrome and Edge have them), so an AZERTY keyboard
// shows "Z" where the code says KeyW.
export const useKeyboardLayout = (): Map<string, string> | undefined => {
  const [layout, setLayout] = useState<Map<string, string>>();
  useEffect(() => {
    const { keyboard } = navigator as Navigator & {
      keyboard?: { getLayoutMap?: () => Promise<Map<string, string>> };
    };
    let alive = true;
    keyboard
      ?.getLayoutMap?.()
      .then((map) => alive && setLayout(map))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return layout;
};

type ControlsPanelProps = {
  controls: Controls;
  onChange: (controls: Controls) => void;
  onClose: () => void;
  touch: boolean;
};

export function ControlsPanel({ controls, onChange, onClose, touch }: ControlsPanelProps) {
  const layout = useKeyboardLayout();
  const [waiting, setWaiting] = useState<{ action: Action; slot: 0 | 1 }>();
  const clashes = conflicts(controls);

  const change = (next: Controls) => {
    saveControls(next);
    onChange(next);
  };

  // While waiting for a key, the next key or mouse button is the answer. Esc gives up. The game
  // never sees these presses.
  useEffect(() => {
    if (!waiting) return undefined;
    const take = (code: string, event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      setWaiting(undefined);
      if (code !== 'Escape') change(bindKey(controls, waiting.action, waiting.slot, code));
    };
    const onKey = (event: KeyboardEvent) => take(event.code, event);
    const onMouse = (event: MouseEvent) => take(`Mouse${event.button}`, event);
    const onMenu = (event: Event) => event.preventDefault();
    // Wait for the click that opened this to finish before listening for mouse buttons.
    const timer = window.setTimeout(() => window.addEventListener('mousedown', onMouse, true), 0);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('contextmenu', onMenu, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('mousedown', onMouse, true);
      window.removeEventListener('contextmenu', onMenu, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting]);

  const slider = (
    label: string,
    key: 'sensitivity' | 'fov' | 'distance',
    step: number,
    shown: string
  ) => (
    <div className={css.SettingRow}>
      <label htmlFor={`horde-${key}`} className={css.Grow}>
        {label}
      </label>
      <input
        id={`horde-${key}`}
        type="range"
        min={LIMITS[key][0]}
        max={LIMITS[key][1]}
        step={step}
        value={controls[key]}
        onChange={(event) => change({ ...controls, [key]: Number(event.target.value) })}
      />
      <span>{shown}</span>
    </div>
  );

  return (
    <>
      <h2 className={css.PanelTitle}>{tr('games.horde.controls', 'Controls')}</h2>
      {!touch && (
        <>
          <p className={css.Hint}>
            {tr(
              'games.horde.controls_hint',
              'Click a key to change it, then press the new key or mouse button. Esc cancels, right click clears.'
            )}
          </p>
          <div className={css.ControlsList}>
            {ACTIONS.map((action) => (
              <React.Fragment key={action}>
                <span>{actionLabel(action)}</span>
                {([0, 1] as const).map((slot) => {
                  const code = controls.keys[action][slot];
                  const isWaiting = waiting?.action === action && waiting.slot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      className={css.KeyButton}
                      data-conflict={code !== '' && clashes.has(code)}
                      data-waiting={isWaiting}
                      onClick={() => setWaiting(isWaiting ? undefined : { action, slot })}
                      onContextMenu={(event) => {
                        // Right click clears the slot.
                        event.preventDefault();
                        if (!waiting) change(bindKey(controls, action, slot, ''));
                      }}
                    >
                      {isWaiting
                        ? tr('games.horde.press_key', 'Press a key…')
                        : keyLabel(code, layout)}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
          {clashes.size > 0 && (
            <p className={css.Warning}>
              {tr('games.horde.controls_clash', 'Keys in red do more than one thing: {{keys}}', {
                keys: [...clashes].map((code) => keyLabel(code, layout)).join(', '),
              })}
            </p>
          )}
        </>
      )}
      {slider(
        tr('games.horde.sensitivity', 'Camera sensitivity'),
        'sensitivity',
        0.1,
        controls.sensitivity.toFixed(1)
      )}
      {slider(tr('games.horde.fov', 'Field of view'), 'fov', 1, `${controls.fov}°`)}
      {slider(
        tr('games.horde.distance', 'Camera distance'),
        'distance',
        0.5,
        controls.distance.toFixed(1)
      )}
      <label htmlFor="horde-invert" className={css.SettingRow}>
        <input
          id="horde-invert"
          type="checkbox"
          checked={controls.invertY}
          onChange={(event) => change({ ...controls, invertY: event.target.checked })}
        />
        {tr('games.horde.invert_y', 'Invert vertical camera')}
      </label>
      {touch && (
        <label htmlFor="horde-auto-camera" className={css.SettingRow}>
          <input
            id="horde-auto-camera"
            type="checkbox"
            checked={controls.autoCamera}
            onChange={(event) => change({ ...controls, autoCamera: event.target.checked })}
          />
          {tr('games.horde.auto_camera', 'Camera follows where the hero runs')}
        </label>
      )}
      <div className={css.PanelRow}>
        <button
          type="button"
          className={css.PlainButton}
          onClick={() => change({ ...DEFAULT_CONTROLS })}
        >
          {tr('games.horde.controls_reset', 'Restore defaults')}
        </button>
        <button type="button" className={css.PlayButton} onClick={onClose}>
          {tr('games.horde.done', 'Done')}
        </button>
      </div>
    </>
  );
}
