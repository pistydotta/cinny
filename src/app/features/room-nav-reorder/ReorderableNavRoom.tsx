import React, { ReactNode, useEffect, useRef, useState } from 'react';
import {
  draggable,
  dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
  attachClosestEdge,
  extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { isNavRoomDragData, NavRoomDragData } from './useRoomNavReorder';
import { DropEdge } from './roomOrder';
import * as css from './ReorderableNavRoom.css';

type ReorderableNavRoomProps = {
  roomId: string;
  parentId: string;
  enabled: boolean;
  children: ReactNode;
};

// Lets a room in the space's room list be dragged above or below its siblings.
export function ReorderableNavRoom({
  roomId,
  parentId,
  enabled,
  children,
}: ReorderableNavRoomProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState<DropEdge>();
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return undefined;
    const data: NavRoomDragData = { navRoomId: roomId, parentId };

    return combine(
      draggable({
        element,
        getInitialData: () => data,
        onDragStart: () => setDragging(true),
        onDrop: () => setDragging(false),
      }),
      dropTargetForElements({
        element,
        canDrop: ({ source }) =>
          isNavRoomDragData(source.data) &&
          source.data.parentId === parentId &&
          source.data.navRoomId !== roomId,
        getData: ({ input }) =>
          attachClosestEdge(data, { element, input, allowedEdges: ['top', 'bottom'] }),
        onDrag: ({ self }) => {
          const closest = extractClosestEdge(self.data);
          setEdge(closest === 'top' || closest === 'bottom' ? closest : undefined);
        },
        onDragLeave: () => setEdge(undefined),
        onDrop: () => setEdge(undefined),
      })
    );
  }, [roomId, parentId, enabled]);

  return (
    <div
      ref={ref}
      className={css.ReorderableNavRoom}
      data-drop-edge={edge}
      data-dragging={dragging}
    >
      {children}
    </div>
  );
}
