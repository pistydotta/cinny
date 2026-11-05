import React, { useState } from 'react';
import FocusTrap from 'focus-trap-react';
import {
  Box,
  Button,
  Dialog,
  Input,
  MenuItem,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Spinner,
  Text,
  color,
  config,
  toRem,
} from 'folds';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { createApiRequest } from '../../utils/blazeroomApi';
import { StateEvent } from '../../../types/matrix/room';
import { tr } from '../translation/tr';
import { isSpaceOwner } from './spaceOwner';
import { deleteServerRoom } from './roomDeletion';

export function DeleteRoomMenuItem({
  spaceId,
  roomId,
  requestClose,
}: {
  spaceId?: string;
  roomId: string;
  requestClose: () => void;
}) {
  const mx = useMatrixClient();
  const { navigateSpace } = useRoomNavigate();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const space = spaceId ? mx.getRoom(spaceId) : undefined;
  const create = space?.currentState.getStateEvents(StateEvent.RoomCreate, '');
  const room = mx.getRoom(roomId);
  const name = room?.name || roomId;
  const owner = isSpaceOwner(
    create
      ? {
          sender: create.getSender(),
          content: create.getContent(),
        }
      : undefined,
    mx.getSafeUserId()
  );
  if (!space || !owner || room?.isSpaceRoom()) return null;

  const remove = async () => {
    if (busy || confirmation !== name) return;
    setBusy(true);
    setError(false);
    const request = createApiRequest(() => mx.getAccessToken());
    try {
      // Keep following the accepted deletion even if sync removes this room's menu.
      // Each repeat resumes the same persisted task; it never starts another purge.
      await deleteServerRoom(request, space.roomId, roomId);
      requestClose();
      navigateSpace(space.roomId);
    } catch {
      setError(true);
      setBusy(false);
    }
  };

  return (
    <>
      <MenuItem variant="Critical" fill="None" size="300" radii="300" onClick={() => setOpen(true)}>
        <Text as="span" size="T300">
          {tr('room_delete.action', 'Delete room')}
        </Text>
      </MenuItem>
      {open && (
        <Overlay open backdrop={<OverlayBackdrop />}>
          <OverlayCenter>
            <FocusTrap
              focusTrapOptions={{
                initialFocus: false,
                escapeDeactivates: !busy,
                clickOutsideDeactivates: !busy,
                onDeactivate: () => {
                  if (!busy) setOpen(false);
                },
              }}
            >
              <Dialog variant="Surface" style={{ maxWidth: toRem(440) }}>
                <Box direction="Column" gap="400" style={{ padding: config.space.S400 }}>
                  <Text size="H4">{tr('room_delete.title', 'Delete room for everyone?')}</Text>
                  <Text>
                    {tr(
                      'room_delete.warning',
                      'This permanently removes everyone from this room, blocks rejoining, and deletes its history from this server. This cannot be undone. Copies already saved on devices or other servers cannot be erased.'
                    )}
                  </Text>
                  <Text size="T300">
                    {tr('room_delete.type_name', 'Type the room name to confirm:')} <b>{name}</b>
                  </Text>
                  <Input
                    aria-label={tr('room_delete.confirm_name', 'Room name confirmation')}
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.currentTarget.value)}
                    disabled={busy}
                  />
                  {error && (
                    <Text role="alert" style={{ color: color.Critical.Main }}>
                      {tr(
                        'room_delete.error',
                        'Deletion could not be completed. Check your connection and retry to resume. If it still fails, ask a Blazeroom administrator to check the deletion status.'
                      )}
                    </Text>
                  )}
                  <Box gap="200" justifyContent="End">
                    <Button variant="Secondary" disabled={busy} onClick={() => setOpen(false)}>
                      <Text>{tr('room_delete.cancel', 'Cancel')}</Text>
                    </Button>
                    <Button
                      variant="Critical"
                      disabled={busy || confirmation !== name}
                      onClick={remove}
                      before={
                        busy ? <Spinner size="200" variant="Critical" fill="Solid" /> : undefined
                      }
                    >
                      <Text>
                        {busy
                          ? tr('room_delete.deleting', 'Deleting…')
                          : tr('room_delete.action', 'Delete room')}
                      </Text>
                    </Button>
                  </Box>
                </Box>
              </Dialog>
            </FocusTrap>
          </OverlayCenter>
        </Overlay>
      )}
    </>
  );
}
