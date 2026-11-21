import { useCallback, useEffect, useRef, useState } from 'react';
import { Arming, ARMING_MS, armingLeft, isArmed, rearm } from './clickGuard';

/**
 * `armed` turns true ARMING_MS after `key` last changed; `guard` wraps a click handler so it
 * does nothing before then. The key names what the control does: change it when the meaning
 * changes, not when the player's own choice changes it (a raise slider, say).
 */
export function useArmed(key: string) {
  const arming = useRef<Arming>();
  // Same key, same object: the extra renders of StrictMode don't restart it.
  arming.current = rearm(arming.current, key, performance.now());
  const { since } = arming.current;
  const armed = isArmed(arming.current, performance.now());
  const [, rerender] = useState(0);

  useEffect(() => {
    if (armed || !arming.current) return undefined;
    const id = window.setTimeout(
      () => rerender((n) => n + 1),
      armingLeft(arming.current, performance.now())
    );
    return () => window.clearTimeout(id);
  }, [since, armed]);

  const guard = useCallback(
    <A extends unknown[]>(handler: (...args: A) => void) =>
      (...args: A) => {
        if (arming.current && isArmed(arming.current, performance.now(), ARMING_MS)) {
          handler(...args);
        }
      },
    []
  );

  return { armed, guard };
}
