import React, { useRef } from 'react';
import { KIND_COLOR, PlaybookItem, PlaybookMap, Point, pointIn } from './model';
import { PlaybookApi } from './api';
import { useFileUrl } from './usePlaybook';
import { tr } from '../translation/tr';
import * as css from './playbook.css';

type Pin = Pick<PlaybookItem, 'id' | 'kind' | 'from' | 'to'>;
type Placed = Pin & { from: Point };

type RadarProps = {
  api: PlaybookApi;
  map: PlaybookMap;
  // Where each throw lands (a spot sits where it's held). Lines show only for `hot`.
  pins: Pin[];
  hot?: string | null;
  onHover?: (id: string | null) => void;
  onPick?: (id: string) => void;
  // Placing mode (the add form): clicks and drags report a point.
  onPlace?: (p: Point) => void;
  onDrag?: (which: 'from' | 'to', p: Point) => void;
  label?: string;
};

const pct = (v: number) => `${v * 100}`;

export function Radar({
  api,
  map,
  pins: all,
  hot,
  onHover,
  onPick,
  onPlace,
  onDrag,
  label,
}: RadarProps) {
  const url = useFileUrl(api, map.radar);
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef<'from' | 'to' | null>(null);
  const placing = !!onPlace;

  const at = (e: React.PointerEvent) => {
    const rect = box.current?.getBoundingClientRect();
    return rect ? pointIn(rect, e.clientX, e.clientY) : null;
  };

  // Items with no point on the radar are simply not drawn.
  const pins = all.filter((p): p is Placed => !!p.from);
  const hotPin = pins.find((p) => p.id === hot);

  return (
    <div
      ref={box}
      className={css.Radar}
      role={placing ? 'application' : undefined}
      aria-label={label ?? tr('playbook.radar', '{{map}} radar', { map: map.name })}
      style={placing && map.radar ? { cursor: 'crosshair' } : undefined}
      onPointerDown={(e) => {
        if (!placing || !map.radar || dragging.current) return;
        const p = at(e);
        if (p) onPlace?.(p);
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        const p = at(e);
        if (p) onDrag?.(dragging.current, p);
      }}
      onPointerUp={() => {
        dragging.current = null;
      }}
    >
      {url ? (
        <img className={css.RadarImage} src={url} alt="" draggable={false} />
      ) : (
        <div className={css.RadarEmpty}>
          {map.radar ? '' : tr('playbook.no_radar', 'This map has no radar image yet.')}
        </div>
      )}
      <svg
        className={css.RadarSvg}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden={!onPick}
      >
        {hotPin?.to && (
          <line
            x1={pct(hotPin.from.x)}
            y1={pct(hotPin.from.y)}
            x2={pct(hotPin.to.x)}
            y2={pct(hotPin.to.y)}
            stroke="#fff"
            strokeWidth={0.6}
            strokeDasharray="1.6 1.2"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {hotPin?.to && (
          <circle cx={pct(hotPin.from.x)} cy={pct(hotPin.from.y)} r={1.3} fill="#fff" />
        )}
        {pins.map((p) => {
          const spot = p.to ?? p.from;
          const isHot = p.id === hot;
          return (
            <circle
              key={p.id}
              cx={pct(spot.x)}
              cy={pct(spot.y)}
              r={isHot ? 2.6 : 1.9}
              fill={KIND_COLOR[p.kind]}
              stroke={isHot ? '#fff' : '#0008'}
              strokeWidth={isHot ? 0.7 : 0.4}
              style={{ cursor: onPick ? 'pointer' : undefined }}
              onPointerEnter={() => onHover?.(p.id)}
              onPointerLeave={() => onHover?.(null)}
              onClick={(e) => {
                e.stopPropagation();
                onPick?.(p.id);
              }}
            />
          );
        })}
        {onDrag &&
          pins.flatMap((p) =>
            (['from', 'to'] as const).flatMap((which) => {
              const pt = p[which];
              if (!pt) return [];
              return [
                <circle
                  key={`${p.id}-${which}`}
                  cx={pct(pt.x)}
                  cy={pct(pt.y)}
                  r={3}
                  fill="transparent"
                  style={{ cursor: 'grab' }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    (
                      e.currentTarget.ownerSVGElement?.parentElement as HTMLElement | null
                    )?.setPointerCapture(e.pointerId);
                    dragging.current = which;
                  }}
                />,
              ];
            })
          )}
      </svg>
    </div>
  );
}
