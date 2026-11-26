import React, { CSSProperties, useLayoutEffect, useRef, useState } from 'react';
import { Text } from 'folds';
import { TICKER_GAP, tickerTiming } from './slide';
import * as css from './callAudio.css';

// A name that doesn't fit ends in "…"; pointing at its row (or reaching it with the keyboard)
// scrolls it like a ticker, with a second copy following so the loop has no seam
// (callAudio.css.ts starts it).
export function SlidingName({ name }: { name: string }) {
  const box = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const [timing, setTiming] = useState<ReturnType<typeof tickerTiming>>();

  useLayoutEffect(() => {
    const outer = box.current;
    const inner = text.current;
    if (!outer || !inner) return undefined;
    const measure = () =>
      setTiming(tickerTiming(inner.getBoundingClientRect().width, outer.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    return () => observer.disconnect();
  }, [name]);

  return (
    <Text
      as="span"
      size="T300"
      ref={box}
      className={css.SlidingName}
      data-overflows={!!timing}
      style={
        timing
          ? ({
              '--shift': `${-timing.shift}px`,
              '--slide-duration': `${timing.duration}s`,
              '--ticker-gap': `${TICKER_GAP}px`,
            } as CSSProperties)
          : undefined
      }
    >
      <span className={css.SlidingNameInner}>
        <span ref={text}>{name}</span>
        {timing && (
          <span className={css.SlidingNameCopy} aria-hidden>
            {name}
          </span>
        )}
      </span>
    </Text>
  );
}
