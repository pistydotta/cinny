import { useCallback, useEffect } from 'react';
import { MatrixClient } from 'matrix-js-sdk';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { StateEvent } from '../../../types/matrix/room';
import { getStateEvent } from '../../utils/room';
import { rateLimitedActions } from '../../utils/matrix';
import { getPowersLevelFromMatrixEvent } from '../../hooks/usePowerLevels';
import { getRoomCreatorsForRoomId } from '../../hooks/useRoomCreators';
import { getRoomPermissionsAPI } from '../../hooks/useRoomPermissions';
import { DropEdge, moveChild, SpaceChild } from './roomOrder';

export type NavRoomDragData = {
  navRoomId: string;
  parentId: string;
};

export const isNavRoomDragData = (data: Record<string | symbol, unknown>): boolean =>
  typeof data.navRoomId === 'string' && typeof data.parentId === 'string';

// Every child of the space, joined or not, so new keys don't collide with rooms you can't see.
const spaceChildren = (mx: MatrixClient, spaceId: string): SpaceChild[] =>
  (mx.getRoom(spaceId)?.currentState.getStateEvents(StateEvent.SpaceChild) ?? [])
    .filter((event) => Array.isArray(event.getContent().via) && event.getContent().via.length > 0)
    .map((event) => ({
      roomId: event.getStateKey() ?? '',
      order: typeof event.getContent().order === 'string' ? event.getContent().order : undefined,
      ts: event.getTs(),
    }))
    .filter((child) => child.roomId !== '');

export const canReorderSpace = (mx: MatrixClient, spaceId: string): boolean => {
  const space = mx.getRoom(spaceId);
  if (!space) return false;
  const powerLevels = getPowersLevelFromMatrixEvent(
    getStateEvent(space, StateEvent.RoomPowerLevels)
  );
  const permissions = getRoomPermissionsAPI(getRoomCreatorsForRoomId(mx, spaceId), powerLevels);
  return permissions.stateEvent(StateEvent.SpaceChild, mx.getSafeUserId());
};

// Dragging a room in the space's room list, within its own category, writes the same
// m.space.child order keys the lobby does.
export const useRoomNavReorder = () => {
  const mx = useMatrixClient();

  const move = useCallback(
    async (source: NavRoomDragData, target: NavRoomDragData, edge: DropEdge) => {
      if (source.parentId !== target.parentId) return;
      const { parentId } = target;
      const changes = moveChild(
        spaceChildren(mx, parentId),
        source.navRoomId,
        target.navRoomId,
        edge
      );
      const children = mx.getRoom(parentId)?.currentState;
      await rateLimitedActions(changes, async ({ roomId, order }) => {
        const content = children?.getStateEvents(StateEvent.SpaceChild, roomId)?.getContent();
        await mx.sendStateEvent(
          parentId,
          StateEvent.SpaceChild as any,
          { ...content, order },
          roomId
        );
      });
    },
    [mx]
  );

  useEffect(
    () =>
      monitorForElements({
        canMonitor: ({ source }) => isNavRoomDragData(source.data),
        onDrop: ({ source, location }) => {
          const target = location.current.dropTargets[0];
          if (!target || !isNavRoomDragData(target.data)) return;
          const edge = extractClosestEdge(target.data);
          if (edge !== 'top' && edge !== 'bottom') return;
          move(
            source.data as unknown as NavRoomDragData,
            target.data as unknown as NavRoomDragData,
            edge
          ).catch((e: unknown) => {
            // eslint-disable-next-line no-console
            console.warn("Couldn't reorder the room", e);
          });
        },
      }),
    [move]
  );
};
