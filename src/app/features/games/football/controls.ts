import { Input, NO_INPUT } from './engine/types';
import { tr } from '../../translation/tr';

// Keys and gamepads into the engine's Input. The TV camera never turns, so the screen's right
// is always +x and up is -z: a direction on the keys is a direction on the pitch.
//
// Keys are saved per browser by `KeyboardEvent.code` (the key's place, whatever the layout), in
// three sets: playing alone, and players 1 and 2 on one computer. Each action takes up to two
// keys. Escape and P always pause. Gamepads use the standard layout: A pass, B shoot, Y through
// ball, X lob, RT or RB sprint, left stick or d-pad to move.

export const ACTIONS = [
  'up',
  'down',
  'left',
  'right',
  'sprint',
  'pass',
  'shoot',
  'through',
  'lob',
] as const;

export type Action = typeof ACTIONS[number];

export type KeyMap = Record<Action, string[]>;

export type KeySet = 'alone' | 'p1' | 'p2';

export type KeySets = Record<KeySet, KeyMap>;

export const PAUSE_KEYS = ['Escape', 'KeyP'];

export const DEFAULT_KEYS: KeySets = {
  alone: {
    up: ['KeyW', 'ArrowUp'],
    down: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    sprint: ['ShiftLeft', 'ShiftRight'],
    pass: ['KeyJ', 'Space'],
    shoot: ['KeyK'],
    through: ['KeyL'],
    lob: ['KeyI'],
  },
  p1: {
    up: ['KeyW'],
    down: ['KeyS'],
    left: ['KeyA'],
    right: ['KeyD'],
    sprint: ['ShiftLeft'],
    pass: ['KeyJ'],
    shoot: ['KeyK'],
    through: ['KeyL'],
    lob: ['KeyI'],
  },
  // The numpad, and comma and period, sit in the same place on ABNT2 and US keyboards.
  p2: {
    up: ['ArrowUp'],
    down: ['ArrowDown'],
    left: ['ArrowLeft'],
    right: ['ArrowRight'],
    sprint: ['ShiftRight', 'Numpad0'],
    pass: ['Numpad1', 'Comma'],
    shoot: ['Numpad2', 'Period'],
    through: ['Numpad3'],
    lob: ['Numpad5'],
  },
};

const STORAGE_KEY = 'blazeroom.football.keys';

const isCode = (v: unknown): v is string =>
  typeof v === 'string' && /^[A-Za-z0-9]{2,24}$/.test(v) && !PAUSE_KEYS.includes(v);

export const parseKeys = (text: string | null): KeySets => {
  if (!text) return DEFAULT_KEYS;
  try {
    const raw = JSON.parse(text) as Partial<Record<KeySet, Partial<Record<Action, unknown>>>>;
    const set = (name: KeySet): KeyMap =>
      Object.fromEntries(
        ACTIONS.map((a) => {
          const codes = raw?.[name]?.[a];
          return [
            a,
            Array.isArray(codes) ? codes.filter(isCode).slice(0, 2) : DEFAULT_KEYS[name][a],
          ];
        })
      ) as KeyMap;
    return { alone: set('alone'), p1: set('p1'), p2: set('p2') };
  } catch {
    return DEFAULT_KEYS;
  }
};

export const loadKeys = (): KeySets => {
  try {
    return parseKeys(localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_KEYS;
  }
};

export const saveKeys = (keys: KeySets): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch {
    // Private windows may refuse; the keys still work until the page closes.
  }
};

// Puts `code` in one slot (0 or 1) of an action, or clears the slot with undefined. A key does
// one thing: it leaves any other action in the same set, and for two players on one computer
// it leaves the other player's set too.
export const bindKey = (
  keys: KeySets,
  set: KeySet,
  action: Action,
  slot: 0 | 1,
  code: string | undefined
): KeySets => {
  const next = structuredClone(keys);
  if (code) {
    const sets: KeySet[] = set === 'alone' ? ['alone'] : ['p1', 'p2'];
    sets.forEach((s) =>
      ACTIONS.forEach((a) => {
        next[s][a] = next[s][a].filter((c) => c !== code);
      })
    );
  }
  const slots = [...next[set][action]];
  if (code) slots[Math.min(slot, slots.length)] = code;
  else slots.splice(slot, 1);
  next[set][action] = slots.filter(Boolean).slice(0, 2);
  return next;
};

export const keysIn = (maps: KeyMap[]): Set<string> =>
  new Set(maps.flatMap((map) => ACTIONS.flatMap((a) => map[a])));

const NAMES: Record<string, string> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  AltLeft: 'Alt',
  AltRight: 'AltGr',
  Enter: 'Enter',
  Tab: 'Tab',
  Backspace: '⌫',
  CapsLock: 'Caps',
  NumpadAdd: 'Num +',
  NumpadSubtract: 'Num −',
  NumpadMultiply: 'Num ×',
  NumpadDivide: 'Num ÷',
  NumpadDecimal: 'Num ,',
  NumpadEnter: 'Num Enter',
};

// What is printed on a key: the layout's own character when the browser can tell
// (navigator.keyboard, so ABNT2's Ç shows as Ç), otherwise a name from the code.
export const keyLabel = (code: string, layout?: Map<string, string>): string => {
  if (code === 'Space') return tr('football.key.space', 'Space');
  if (code === 'ShiftLeft') return tr('football.key.shift_left', 'Left Shift');
  if (code === 'ShiftRight') return tr('football.key.shift_right', 'Right Shift');
  if (code === 'ControlLeft') return tr('football.key.ctrl_left', 'Left Ctrl');
  if (code === 'ControlRight') return tr('football.key.ctrl_right', 'Right Ctrl');
  if (NAMES[code]) return NAMES[code];
  if (/^Numpad\d$/.test(code)) return `Num ${code.slice(6)}`;
  const printed = layout?.get(code);
  if (printed) return printed.toUpperCase();
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  return code;
};

const any = (held: Set<string>, codes: string[]) => codes.some((c) => held.has(c));

// Rounds a direction to whole numbers on a circle of 100, so it travels and replays exactly.
export const quantize = (x: number, z: number): [number, number] => {
  const l = Math.hypot(x, z);
  if (l < 0.2) return [0, 0];
  const k = Math.min(1, l) / l;
  return [Math.round(x * k * 100), Math.round(z * k * 100)];
};

export const fromKeys = (held: Set<string>, map: KeyMap): Input => {
  const x = (any(held, map.right) ? 1 : 0) - (any(held, map.left) ? 1 : 0);
  const z = (any(held, map.down) ? 1 : 0) - (any(held, map.up) ? 1 : 0);
  const [mx, mz] = quantize(x, z);
  return {
    mx,
    mz,
    sprint: any(held, map.sprint),
    pass: any(held, map.pass),
    shoot: any(held, map.shoot),
    through: any(held, map.through),
    lob: any(held, map.lob),
  };
};

const DEAD_ZONE = 0.25;

export const fromGamepad = (pad: Gamepad | null | undefined): Input | undefined => {
  if (!pad || !pad.connected) return undefined;
  const b = (k: number) => !!pad.buttons[k]?.pressed;
  let x = pad.axes[0] ?? 0;
  let z = pad.axes[1] ?? 0;
  if (Math.hypot(x, z) < DEAD_ZONE) [x, z] = [0, 0];
  if (b(15)) x = 1;
  if (b(14)) x = -1;
  if (b(13)) z = 1;
  if (b(12)) z = -1;
  const [mx, mz] = quantize(x, z);
  return {
    mx,
    mz,
    pass: b(0),
    shoot: b(1),
    lob: b(2),
    through: b(3),
    sprint: b(5) || b(7),
  };
};

// Keys and a pad on the same side add up.
export const merge = (a: Input, b: Input | undefined): Input => {
  if (!b) return a;
  const [mx, mz] = a.mx || a.mz ? [a.mx, a.mz] : [b.mx, b.mz];
  return {
    mx,
    mz,
    sprint: a.sprint || b.sprint,
    pass: a.pass || b.pass,
    shoot: a.shoot || b.shoot,
    through: a.through || b.through,
    lob: a.lob || b.lob,
  };
};

// Whether a key went to something being typed in, which the game must leave alone.
export const typingIn = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null;
  if (!el || typeof el.tagName !== 'string') return false;
  return (
    el.isContentEditable ||
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT'
  );
};

export { NO_INPUT };
