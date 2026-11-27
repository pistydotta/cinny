import React, { useEffect, useState } from 'react';
import { Segmented } from '../../forge-theme/Segmented';
import { tr } from '../../translation/tr';
import { GameDialog } from '../ui/GameDialog';
import { gameButton } from '../ui/gameUi.css';
import {
  ACTIONS,
  Action,
  DEFAULT_KEYS,
  KeySet,
  KeySets,
  PAUSE_KEYS,
  bindKey,
  keyLabel,
} from './controls';
import { Graphics } from './options';
import * as css from './football.css';

// Options for the football game, from the menu or the pause dialog: graphics, and the keys of
// each key set (rebound by clicking a slot and pressing the new key).

export const actionName = (a: Action): string =>
  ({
    up: tr('football.action.up', 'Up'),
    down: tr('football.action.down', 'Down'),
    left: tr('football.action.left', 'Left'),
    right: tr('football.action.right', 'Right'),
    sprint: tr('football.keys.sprint', 'Sprint'),
    pass: tr('football.keys.pass', 'Pass / switch player when defending'),
    shoot: tr('football.keys.shoot', 'Shoot (hold for power) / slide tackle'),
    through: tr('football.keys.through', 'Through ball / tackle (hold to press)'),
    lob: tr('football.keys.lob', 'Lob or cross (hold for distance)'),
  }[a]);

// The keyboard's own characters for each key place, where the browser can tell (Chrome, Edge):
// an ABNT2 keyboard then shows Ç where a US one shows ;.
export const useKeyboardLayout = (): Map<string, string> | undefined => {
  const [layout, setLayout] = useState<Map<string, string>>();
  useEffect(() => {
    const kb = (
      navigator as unknown as { keyboard?: { getLayoutMap?: () => Promise<Map<string, string>> } }
    ).keyboard;
    kb?.getLayoutMap?.()
      .then(setLayout)
      .catch(() => undefined);
  }, []);
  return layout;
};

type Slot = { set: KeySet; action: Action; slot: 0 | 1 };

function KeysTab({
  keys,
  onKeys,
  twoPlayers,
}: {
  keys: KeySets;
  onKeys: (k: KeySets) => void;
  twoPlayers: boolean;
}) {
  const layout = useKeyboardLayout();
  const [set, setSet] = useState<KeySet>(twoPlayers ? 'p1' : 'alone');
  const [listening, setListening] = useState<Slot>();

  useEffect(() => {
    if (!listening) return undefined;
    // Captured before anything else, so the key neither plays nor closes the dialog.
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') setListening(undefined);
      else if (e.code === 'Backspace' || e.code === 'Delete') {
        onKeys(bindKey(keys, listening.set, listening.action, listening.slot, undefined));
        setListening(undefined);
      } else if (!PAUSE_KEYS.includes(e.code)) {
        onKeys(bindKey(keys, listening.set, listening.action, listening.slot, e.code));
        setListening(undefined);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [listening, keys, onKeys]);

  return (
    <div className={css.DialogBody}>
      <Segmented<KeySet>
        label={tr('football.options.key_set', 'Keys for')}
        value={set}
        onChange={(s) => {
          setSet(s);
          setListening(undefined);
        }}
        options={[
          { value: 'alone', name: tr('football.options.alone', 'Playing alone') },
          { value: 'p1', name: tr('football.player1', 'Player 1') },
          { value: 'p2', name: tr('football.player2', 'Player 2') },
        ]}
      />
      <div className={css.Bindings}>
        {ACTIONS.map((action) => (
          <React.Fragment key={action}>
            <span>{actionName(action)}</span>
            {([0, 1] as const).map((slot) => {
              const code = keys[set][action][slot];
              const on =
                listening?.set === set && listening.action === action && listening.slot === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  className={gameButton({ size: 'sm', variant: 'secondary' })}
                  aria-pressed={on}
                  onClick={() => setListening(on ? undefined : { set, action, slot })}
                >
                  {on
                    ? tr('football.options.press_key', 'Press a key…')
                    : (code && keyLabel(code, layout)) || '—'}
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <p className={css.Note}>
        {tr(
          'football.options.keys_help',
          'Click a slot and press the new key; Backspace clears it, Esc cancels. Esc and P always pause. A key used elsewhere moves here.'
        )}
      </p>
      <div className={css.Row}>
        <button
          type="button"
          className={gameButton({ size: 'sm', variant: 'ghost' })}
          onClick={() => onKeys({ ...keys, [set]: DEFAULT_KEYS[set] })}
        >
          {tr('football.options.reset_keys', 'Restore default keys')}
        </button>
      </div>
    </div>
  );
}

function GraphicsTab({
  graphics,
  onGraphics,
}: {
  graphics: Graphics;
  onGraphics: (g: Graphics) => void;
}) {
  return (
    <div className={css.DialogBody}>
      <span className={css.Label}>{tr('football.options.quality', 'Quality')}</span>
      <Segmented<Graphics['quality']>
        label={tr('football.options.quality', 'Quality')}
        value={graphics.quality}
        onChange={(quality) => onGraphics({ ...graphics, quality })}
        options={[
          { value: 'auto', name: tr('football.options.auto', 'Automatic') },
          { value: 'low', name: tr('football.options.low', 'Low') },
          { value: 'medium', name: tr('football.options.medium', 'Medium') },
          { value: 'high', name: tr('football.options.high', 'High') },
        ]}
      />
      <p className={css.Note}>
        {tr(
          'football.options.quality_help',
          'Automatic starts on High and steps down when the game runs slowly. Low turns shadows off and lowers the resolution.'
        )}
      </p>
      <span className={css.Label}>{tr('football.options.camera', 'Camera')}</span>
      <Segmented<Graphics['camera']>
        label={tr('football.options.camera', 'Camera')}
        value={graphics.camera}
        onChange={(camera) => onGraphics({ ...graphics, camera })}
        options={[
          { value: 'near', name: tr('football.options.near', 'Near') },
          { value: 'normal', name: tr('football.normal', 'Normal') },
          { value: 'far', name: tr('football.options.far', 'Far') },
        ]}
      />
      <span className={css.Label}>{tr('football.options.replays', 'Replays')}</span>
      <Segmented<Graphics['replays']>
        label={tr('football.options.replays', 'Replays')}
        value={graphics.replays}
        onChange={(replays) => onGraphics({ ...graphics, replays })}
        options={[
          { value: 'all', name: tr('football.options.replays_all', 'All') },
          { value: 'goals', name: tr('football.options.replays_goals', 'Goals only') },
          { value: 'off', name: tr('football.options.replays_off', 'None') },
        ]}
      />
      <p className={css.Note}>
        {tr(
          'football.options.replays_help',
          'Goals, bookings, penalties, offsides, saves and near misses play again once the ball is dead. Pass or shoot skips one; online it ends once each side has skipped.'
        )}
      </p>
    </div>
  );
}

export function OptionsDialog({
  keys,
  graphics,
  onKeys,
  onGraphics,
  onClose,
  twoPlayers,
}: {
  keys: KeySets;
  graphics: Graphics;
  onKeys: (k: KeySets) => void;
  onGraphics: (g: Graphics) => void;
  onClose: () => void;
  twoPlayers: boolean;
}) {
  const [tab, setTab] = useState<'graphics' | 'keys'>('graphics');
  return (
    <GameDialog title={tr('football.options_title', 'Options')} onClose={onClose}>
      <div className={css.DialogBody}>
        <Segmented<'graphics' | 'keys'>
          label={tr('football.options_title', 'Options')}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'graphics', name: tr('football.options.graphics', 'Graphics') },
            { value: 'keys', name: tr('football.controls', 'Controls') },
          ]}
        />
        {tab === 'graphics' ? (
          <GraphicsTab graphics={graphics} onGraphics={onGraphics} />
        ) : (
          <KeysTab keys={keys} onKeys={onKeys} twoPlayers={twoPlayers} />
        )}
      </div>
    </GameDialog>
  );
}
