import React, { useEffect, useId, useMemo, useState } from 'react';
import { Box, Button, Input, Text, color } from 'folds';
import type { Room } from 'matrix-js-sdk/lib/models/room';
import type { MatrixEvent } from 'matrix-js-sdk/lib/models/event';
import { createWebhookApi, Webhook } from '../../admin/webhookApi';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { tr } from '../../translation/tr';
import { ApiError } from '../../../utils/blazeroomApi';
import { copyToClipboard } from '../../../utils/dom';

const selectStyle = {
  width: '100%',
  padding: 10,
  borderRadius: 8,
  color: color.Surface.OnContainer,
  background: color.Surface.Container,
  border: `1px solid ${color.Surface.ContainerLine}`,
  font: 'inherit',
};

function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === 'encrypted_room')
      return tr(
        'webhooks.encrypted',
        'Encrypted rooms are not supported. Choose an unencrypted chat.'
      );
    if (error.code === 'webhooks_not_configured')
      return tr('webhooks.setup', 'An owner needs to configure the dedicated webhook bot first.');
    if (error.code === 'rate_limited')
      return tr('webhooks.rate_limit', 'Too many messages. Wait a minute and try again.');
    if (error.code === 'forbidden')
      return tr('webhooks.forbidden', 'Only superadmins can manage webhooks.');
  }
  return tr(
    'webhooks.error',
    'Could not complete the request. Check your connection and that the bot can join and post in this server and chat.'
  );
}

export function Webhooks() {
  const formId = useId();
  const mx = useMatrixClient();
  const api = useMemo(() => createWebhookApi(() => mx.getAccessToken()), [mx]);
  const [data, setData] = useState<{ configured: boolean; webhooks: Webhook[] }>();
  const [name, setName] = useState('');
  const [spaceId, setSpaceId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [deleteId, setDeleteId] = useState<string>();
  useEffect(() => {
    let active = true;
    api
      .list()
      .then((value) => active && setData(value))
      .catch((err) => {
        if (active) setError(errorMessage(err));
      });
    return () => {
      active = false;
    };
  }, [api]);
  const spaces: Room[] = mx
    .getRooms()
    .filter((room: Room) => room.isSpaceRoom() && room.getMyMembership() === 'join');
  const space = mx.getRoom(spaceId);
  const rooms: (Room | null)[] = (space?.currentState.getStateEvents('m.space.child') ?? [])
    .filter((event: MatrixEvent) => event.getContent().via?.length > 0)
    .map((event: MatrixEvent) => mx.getRoom(event.getStateKey() ?? ''))
    .filter(
      (room: Room | null) =>
        room &&
        !room.isSpaceRoom() &&
        room.getMyMembership() === 'join' &&
        !room.currentState.getStateEvents('m.room.encryption', '')
    );
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      await action();
      setData(await api.list());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const reveal = (path: string) => setUrl(new URL(path, window.location.origin).href);
  return (
    <Box direction="Column" gap="300" style={{ paddingTop: 24 }}>
      <Text size="L400">{tr('webhooks.title', 'Webhooks')}</Text>
      <Text size="T200">
        {tr(
          'webhooks.description',
          'Send text and links from external tools into one chat. Only superadmins can manage webhooks. Anyone with its URL can post to that chat.'
        )}
      </Text>
      {data && !data.configured && (
        <Text size="T200">
          {tr('webhooks.setup', 'An owner needs to configure the dedicated webhook bot first.')}
        </Text>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          run(async () => {
            reveal((await api.create(name.trim(), spaceId, roomId)).path);
            setName('');
          });
        }}
      >
        <Box direction="Column" gap="200">
          <label htmlFor={`${formId}-name`}>
            <Text as="span" size="T200">
              {tr('webhooks.name', 'Integration name')}
            </Text>
            <Input
              id={`${formId}-name`}
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              maxLength={60}
              required
              disabled={busy || !data?.configured}
            />
          </label>
          <label htmlFor={`${formId}-space`}>
            <Text as="span" size="T200">
              {tr('webhooks.server', 'Server')}
            </Text>
            <select
              id={`${formId}-space`}
              style={selectStyle}
              value={spaceId}
              required
              disabled={busy || !data?.configured}
              onChange={(event) => {
                setSpaceId(event.target.value);
                setRoomId('');
              }}
            >
              <option value="">{tr('webhooks.choose_server', 'Choose a server')}</option>
              {spaces.map((item) => (
                <option key={item.roomId} value={item.roomId}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor={`${formId}-room`}>
            <Text as="span" size="T200">
              {tr('webhooks.chat', 'Chat (unencrypted)')}
            </Text>
            <select
              id={`${formId}-room`}
              style={selectStyle}
              value={roomId}
              required
              disabled={busy || !data?.configured || !spaceId}
              onChange={(event) => setRoomId(event.target.value)}
            >
              <option value="">{tr('webhooks.choose_chat', 'Choose a chat')}</option>
              {rooms.map(
                (item) =>
                  item && (
                    <option key={item.roomId} value={item.roomId}>
                      {item.name}
                    </option>
                  )
              )}
            </select>
          </label>
          <Button
            type="submit"
            size="400"
            disabled={busy || !data?.configured || !name.trim() || !roomId}
          >
            <Text size="B400">{tr('webhooks.create', 'Create webhook')}</Text>
          </Button>
        </Box>
      </form>
      {url && (
        <Box direction="Column" gap="200">
          <Text size="T200">
            {tr(
              'webhooks.url_notice',
              'Copy this URL now. It is only shown when created or rotated. Rotating invalidates the old URL.'
            )}
          </Text>
          <Input
            aria-label={tr('webhooks.url', 'Webhook URL')}
            value={url}
            readOnly
            autoComplete="off"
          />
          <Box gap="200">
            <Button
              size="300"
              onClick={() => {
                copyToClipboard(url);
                setStatus(tr('webhooks.copied', 'URL copied'));
              }}
            >
              <Text size="B400">{tr('webhooks.copy', 'Copy URL')}</Text>
            </Button>
            <Button size="300" onClick={() => setUrl('')}>
              <Text size="B400">{tr('webhooks.hide', 'Hide URL')}</Text>
            </Button>
          </Box>
        </Box>
      )}
      {error && (
        <Text size="T200" role="alert" style={{ color: color.Critical.Main }}>
          {error}
        </Text>
      )}
      {status && (
        <Text size="T200" role="status">
          {status}
        </Text>
      )}
      {data?.webhooks.map((hook) => (
        <Box
          key={hook.id}
          direction="Column"
          gap="200"
          style={{
            padding: 12,
            border: `1px solid ${color.Surface.ContainerLine}`,
            borderRadius: 8,
          }}
        >
          <Text size="T300">
            {hook.name} ·{' '}
            {hook.enabled ? tr('webhooks.enabled', 'Enabled') : tr('webhooks.disabled', 'Disabled')}
          </Text>
          <Text size="T200">
            {mx.getRoom(hook.space_id)?.name ?? hook.space_id} /{' '}
            {mx.getRoom(hook.room_id)?.name ?? hook.room_id}
          </Text>
          <Text size="T200">
            {tr('webhooks.last_used', 'Last successful delivery')}:{' '}
            {hook.last_used_at
              ? new Date(hook.last_used_at).toLocaleString()
              : tr('webhooks.never', 'Never')}
          </Text>
          <Box gap="200" wrap="Wrap">
            <Button
              size="300"
              disabled={busy || !hook.enabled || !data.configured}
              onClick={() =>
                run(async () => {
                  await api.test(hook.id);
                  setStatus(tr('webhooks.test_sent', 'Test message sent'));
                })
              }
            >
              <Text size="B400">{tr('webhooks.test', 'Send test')}</Text>
            </Button>
            <Button
              size="300"
              disabled={busy}
              onClick={() => run(() => api.enabled(hook.id, !hook.enabled))}
            >
              <Text size="B400">
                {hook.enabled ? tr('webhooks.disable', 'Disable') : tr('webhooks.enable', 'Enable')}
              </Text>
            </Button>
            <Button
              size="300"
              disabled={busy}
              onClick={() => run(async () => reveal((await api.rotate(hook.id)).path))}
            >
              <Text size="B400">{tr('webhooks.rotate', 'Rotate URL')}</Text>
            </Button>
            <Button
              size="300"
              variant="Critical"
              disabled={busy}
              onClick={() => setDeleteId(hook.id)}
            >
              <Text size="B400">{tr('webhooks.delete', 'Delete')}</Text>
            </Button>
          </Box>
          {deleteId === hook.id && (
            <Box direction="Column" gap="200">
              <Text size="T200">
                {tr(
                  'webhooks.delete_notice',
                  'Delete this webhook permanently? Its URL will stop working. Posted messages stay in chat.'
                )}
              </Text>
              <Box gap="200">
                <Button
                  size="300"
                  variant="Critical"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await api.remove(hook.id);
                      setUrl('');
                      setDeleteId(undefined);
                    })
                  }
                >
                  <Text size="B400">{tr('webhooks.confirm_delete', 'Confirm deletion')}</Text>
                </Button>
                <Button size="300" disabled={busy} onClick={() => setDeleteId(undefined)}>
                  <Text size="B400">{tr('webhooks.cancel', 'Cancel')}</Text>
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
}
