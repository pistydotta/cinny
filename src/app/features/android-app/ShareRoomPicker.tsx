import React, { useCallback, useEffect, useMemo, useState } from 'react';
import FocusTrap from 'focus-trap-react';
import { useStore } from 'jotai';
import {
  Box,
  Button,
  Dialog,
  Input,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Spinner,
  Text,
  color,
  config,
} from 'folds';
import { Room } from 'matrix-js-sdk';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import {
  roomIdToMsgDraftAtomFamily,
  roomIdToUploadItemsAtomFamily,
  TUploadItem,
} from '../../state/room/roomInputDrafts';
import { encryptFile } from '../../utils/matrix';
import { safeFile } from '../../utils/mimeTypes';
import { isRoom } from '../../utils/room';
import { stopPropagation } from '../../utils/keyboard';
import { tr } from '../translation/tr';
import { androidBridge } from './androidBridge';
import { matchingRooms, parseShare, Share, shareFileUrl, textDraft } from './share';

const uploadItem = async (file: File, encrypted: boolean): Promise<TUploadItem> => {
  const metadata = { markedAsSpoiler: false };
  const safe = safeFile(file);
  if (encrypted) return { ...(await encryptFile(safe)), metadata };
  return { file: safe, originalFile: safe, encInfo: undefined, metadata };
};

const fetchShared = async (share: Share): Promise<File[]> =>
  Promise.all(
    share.files.map(async ({ id, name, mime }) => {
      const response = await fetch(shareFileUrl(window.location.origin, share.id, id));
      if (!response.ok) throw new Error(`shared file ${response.status}`);
      return new File([await response.blob()], name, { type: mime });
    })
  );

// What another app shared through Android's Share menu. It comes over the bridge, after login,
// so a link can't fill it and logging in first doesn't lose it.
export function AndroidShare() {
  const mx = useMatrixClient();
  const store = useStore();
  const { navigateRoom } = useRoomNavigate();
  const [share, setShare] = useState<Share>();
  const [query, setQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!androidBridge.available()) return undefined;
    const off = androidBridge.on('share', (message) => {
      const received = parseShare(message);
      if (!received) return;
      setShare(received);
      setQuery('');
      setFailed(false);
    });
    androidBridge.send({ type: 'getShare' });
    return off;
  }, []);

  const rooms = useMemo(
    () =>
      share
        ? mx
            .getRooms()
            .filter((room: Room) => isRoom(room) && room.getMyMembership() === 'join')
            .map((room: Room) => ({
              id: room.roomId,
              name: room.name,
              lastActive: room.getLastActiveTimestamp(),
            }))
        : [],
    [mx, share]
  );

  const finish = useCallback(() => {
    if (share) androidBridge.send({ type: 'shareDone', id: share.id });
    setShare(undefined);
  }, [share]);

  const send = useCallback(
    async (roomId: string) => {
      if (!share || sending) return;
      setSending(true);
      setFailed(false);
      try {
        const encrypted = !!mx.getRoom(roomId)?.hasEncryptionStateEvent();
        const files = await fetchShared(share);
        const items = await Promise.all(files.map((file) => uploadItem(file, encrypted)));
        if (items.length > 0) {
          store.set(roomIdToUploadItemsAtomFamily(roomId), { type: 'PUT', item: items });
        }
        if (share.text) store.set(roomIdToMsgDraftAtomFamily(roomId), textDraft(share.text));
        navigateRoom(roomId);
        finish();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("Couldn't prepare what was shared", e);
        setFailed(true);
      } finally {
        setSending(false);
      }
    },
    [mx, store, share, sending, navigateRoom, finish]
  );

  if (!share) return null;

  return (
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            clickOutsideDeactivates: false,
            escapeDeactivates: stopPropagation,
          }}
        >
          <Dialog variant="Surface" style={{ width: '100%', maxHeight: '85vh' }}>
            <Box
              direction="Column"
              gap="300"
              style={{ padding: config.space.S400, height: '80vh' }}
            >
              <Text size="H4">{tr('android_app.share_title', 'Share to...')}</Text>
              <Input
                value={query}
                onChange={(evt) => setQuery(evt.currentTarget.value)}
                placeholder={tr('android_app.share_search', 'Search rooms')}
                variant="Background"
                size="400"
                radii="400"
              />
              {failed && (
                <Text size="T300" style={{ color: color.Critical.Main }}>
                  {tr(
                    'android_app.share_failed',
                    "Couldn't read what was shared. It may have been deleted, or be too large."
                  )}
                </Text>
              )}
              <Box
                grow="Yes"
                direction="Column"
                gap="100"
                style={{ overflowY: 'auto', minHeight: 0 }}
              >
                {matchingRooms(rooms, query).map((room) => (
                  <Button
                    key={room.id}
                    variant="Secondary"
                    fill="None"
                    size="400"
                    radii="300"
                    disabled={sending}
                    onClick={() => send(room.id)}
                    style={{ justifyContent: 'flex-start', flexShrink: 0 }}
                  >
                    <Text as="span" size="B400" truncate>
                      {room.name}
                    </Text>
                  </Button>
                ))}
              </Box>
              <Button
                variant="Secondary"
                fill="Soft"
                size="400"
                radii="300"
                disabled={sending}
                onClick={finish}
                before={sending ? <Spinner size="200" variant="Secondary" /> : undefined}
              >
                <Text as="span" size="B400">
                  {tr('android_app.share_cancel', 'Cancel')}
                </Text>
              </Button>
            </Box>
          </Dialog>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}
