import React, { useCallback, useRef, useState } from 'react';
import { CallEmbed } from '../../plugins/call';
import { useResizeObserver } from '../../hooks/useResizeObserver';
import { LiveCallButtons } from './LiveCallButtons';

// The call's bar under the cameras: the watch screen's own row, so both look the same.
export function LiveCallBar({ callEmbed }: { callEmbed: CallEmbed }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(document.body.clientWidth);
  useResizeObserver(
    useCallback(() => {
      const element = ref.current;
      if (element) setWidth(element.clientWidth);
    }, []),
    useCallback(() => ref.current, [])
  );
  return (
    <div ref={ref}>
      <LiveCallButtons callEmbed={callEmbed} width={width} fullscreen={false} below={null} docked />
    </div>
  );
}
