import { DIRECTIONS, POWER_STEPS, moveOf } from './engine/replay';

// Which key does what, and how the camera feels. Kept per browser. Keys are saved by
// `KeyboardEvent.code`, the place of the key on the keyboard, so WASD stays in the same place on
// any layout; mouse buttons are `Mouse0` (left), `Mouse1` (middle), `Mouse2` (right) and so on.

export type Action =
  | 'forward'
  | 'back'
  | 'left'
  | 'right'
  | 'jump'
  | 'dash'
  | 'ability'
  | 'pause'
  | 'pick1'
  | 'pick2'
  | 'pick3'
  | 'reroll';

export const ACTIONS: Action[] = [
  'forward',
  'back',
  'left',
  'right',
  'jump',
  'dash',
  'ability',
  'pause',
  'pick1',
  'pick2',
  'pick3',
  'reroll',
];

// Each action takes two keys; '' is an empty slot.
export type Binding = [string, string];

export type Quality = 'auto' | 'low' | 'medium' | 'high';
export const QUALITIES: Quality[] = ['auto', 'low', 'medium', 'high'];

export type Controls = {
  keys: Record<Action, Binding>;
  // Radians the camera turns per pixel the mouse moves, times 1000.
  sensitivity: number;
  invertY: boolean;
  // Vertical field of view, in degrees.
  fov: number;
  // How far behind the hero the camera sits.
  distance: number;
  // On touch screens: the camera slowly turns to look where the hero walks.
  autoCamera: boolean;
  // Sound, from 0 to 1, and the mute switch.
  volume: number;
  muted: boolean;
  // No screen shake, flashes or freeze frames.
  reduceMotion: boolean;
  // How much the 3D draws: 'auto' starts at medium and steps down if frames run slow.
  quality: Quality;
  // A short buzz on phones when the hero is hit.
  vibrate: boolean;
};

export const DEFAULT_CONTROLS: Controls = {
  keys: {
    forward: ['KeyW', 'ArrowUp'],
    back: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    jump: ['Space', ''],
    dash: ['ShiftLeft', 'ShiftRight'],
    ability: ['KeyQ', 'Mouse2'],
    pause: ['Escape', 'KeyP'],
    pick1: ['Digit1', ''],
    pick2: ['Digit2', ''],
    pick3: ['Digit3', ''],
    reroll: ['KeyR', ''],
  },
  sensitivity: 2.4,
  invertY: false,
  fov: 60,
  distance: 9,
  autoCamera: true,
  volume: 0.6,
  muted: false,
  reduceMotion: false,
  quality: 'auto',
  vibrate: true,
};

export const LIMITS = {
  sensitivity: [0.5, 8],
  fov: [45, 90],
  distance: [5, 16],
  volume: [0, 1],
} as const;

const CODE = /^[A-Za-z0-9]{1,24}$/;

const clamp = (value: unknown, [min, max]: readonly [number, number], fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;

// Reads saved controls. Whatever is missing or broken comes from the defaults, so a save from an
// older version (or one edited by hand) never leaves the hero without a key to move.
export const parseControls = (raw: string | null | undefined): Controls => {
  let data: Partial<Record<keyof Controls, unknown>> = {};
  try {
    const parsed = raw ? JSON.parse(raw) : undefined;
    if (parsed && typeof parsed === 'object') data = parsed;
  } catch {
    // A broken save is the same as none.
  }
  const savedKeys =
    data.keys && typeof data.keys === 'object' ? (data.keys as Record<string, unknown>) : {};
  const keys = { ...DEFAULT_CONTROLS.keys };
  ACTIONS.forEach((action) => {
    const saved = savedKeys[action];
    if (Array.isArray(saved) && saved.length === 2) {
      const [a, b] = saved.map((code) => (typeof code === 'string' && CODE.test(code) ? code : ''));
      if (a || b) keys[action] = [a, b];
    }
  });
  const d = DEFAULT_CONTROLS;
  return {
    keys,
    sensitivity: clamp(data.sensitivity, LIMITS.sensitivity, d.sensitivity),
    invertY: typeof data.invertY === 'boolean' ? data.invertY : d.invertY,
    fov: clamp(data.fov, LIMITS.fov, d.fov),
    distance: clamp(data.distance, LIMITS.distance, d.distance),
    autoCamera: typeof data.autoCamera === 'boolean' ? data.autoCamera : d.autoCamera,
    volume: clamp(data.volume, LIMITS.volume, d.volume),
    muted: typeof data.muted === 'boolean' ? data.muted : d.muted,
    reduceMotion: typeof data.reduceMotion === 'boolean' ? data.reduceMotion : d.reduceMotion,
    quality: QUALITIES.includes(data.quality as Quality) ? (data.quality as Quality) : d.quality,
    vibrate: typeof data.vibrate === 'boolean' ? data.vibrate : d.vibrate,
  };
};

// Gives `action` the key `code` in `slot`. The other actions keep theirs: a clash is shown, not
// fixed behind the player's back.
export const bindKey = (
  controls: Controls,
  action: Action,
  slot: 0 | 1,
  code: string
): Controls => {
  const binding: Binding = [...controls.keys[action]];
  binding[slot] = code;
  // The same key twice on one action is just one key.
  if (binding[0] === binding[1]) binding[1 - slot] = '';
  return { ...controls, keys: { ...controls.keys, [action]: binding } };
};

// Keys given to more than one action.
export const conflicts = (controls: Controls): Set<string> => {
  const seen = new Map<string, number>();
  ACTIONS.forEach((action) =>
    controls.keys[action].forEach((code) => {
      if (code) seen.set(code, (seen.get(code) ?? 0) + 1);
    })
  );
  return new Set([...seen].filter(([, n]) => n > 1).map(([code]) => code));
};

// What a key does. More than one action when keys clash.
export const actionsOf = (controls: Controls, code: string): Action[] =>
  ACTIONS.filter((action) => controls.keys[action].includes(code));

export const isHeld = (controls: Controls, action: Action, held: Set<string>): boolean =>
  controls.keys[action].some((code) => code !== '' && held.has(code));

// A name for a key when the browser can't say how it is labelled on this keyboard.
export const fallbackKeyName = (code: string): string => {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `Num ${code.slice(6)}`;
  const arrows: Record<string, string> = {
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
  };
  if (arrows[code]) return arrows[code];
  return code.replace(/(Left|Right)$/, '');
};

const STORAGE_KEY = 'blazeroom.horde.controls.v1';

// Someone who asked the system for less motion gets it here too, until they choose otherwise.
const systemReducesMotion = (): boolean =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const loadControls = (): Controls => {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    // No storage: the defaults.
  }
  const controls = parseControls(raw);
  if (!raw?.includes('reduceMotion')) controls.reduceMotion = systemReducesMotion();
  return controls;
};

export const saveControls = (controls: Controls) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(controls));
  } catch {
    // Private mode or full storage: the controls work, they just won't be remembered.
  }
};

// The direction to move in the world from where the player wants to go on screen (`right`, and
// `forward` into the screen) and where the camera looks. The camera at `yaw` 0 sits on +z looking
// towards -z. The answer is rounded to one of 1024 directions and 16 lengths, so a recorded run
// replays the same commands the live one used.
export { DIRECTIONS };

export type WorldMove = { moveX: number; moveZ: number; sector: number; power: number };

export const worldMove = (right: number, forward: number, yaw: number): WorldMove => {
  const len = Math.min(1, Math.hypot(right, forward));
  if (len < 0.05) return { moveX: 0, moveZ: 0, sector: 0, power: 0 };
  const x = right * Math.cos(yaw) - forward * Math.sin(yaw);
  const z = -right * Math.sin(yaw) - forward * Math.cos(yaw);
  const turn = Math.round((Math.atan2(x, z) / (Math.PI * 2)) * DIRECTIONS);
  const sector = ((turn % DIRECTIONS) + DIRECTIONS) % DIRECTIONS;
  const power = Math.round(len * POWER_STEPS);
  return { ...moveOf(sector, power), sector, power };
};
