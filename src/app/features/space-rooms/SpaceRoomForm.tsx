import React, { FormEventHandler, useCallback, useMemo, useState } from 'react';
import { MatrixError, Room } from 'matrix-js-sdk';
import {
  Box,
  Button,
  Checkbox,
  color,
  config,
  Icon,
  Icons,
  Input,
  Scroll,
  Spinner,
  Text,
  TextArea,
  toRem,
} from 'folds';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useCapabilities } from '../../hooks/useCapabilities';
import { useAlive } from '../../hooks/useAlive';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { createRoom, CreateRoomAccess, CreateRoomType } from '../../components/create-room';
import { CreateRoomTypeSelector } from '../../components/create-room/CreateRoomTypeSelector';
import { RoomType } from '../../../types/matrix/room';
import { getMemberDisplayName } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';
import { SequenceCard } from '../../components/sequence-card';
import { FriendAvatar } from '../friends/FriendAvatar';
import { pickableMembers } from './spaceRoomAccess';

const typeIcon = (type: CreateRoomType) =>
  type === CreateRoomType.VoiceRoom ? Icons.VolumeHigh : Icons.Hash;

type AccessOptionProps = {
  selected: boolean;
  icon: typeof Icons.Hash;
  title: string;
  description: string;
  onClick: () => void;
  disabled: boolean;
};
function AccessOption({
  selected,
  icon,
  title,
  description,
  onClick,
  disabled,
}: AccessOptionProps) {
  return (
    <SequenceCard
      as="button"
      type="button"
      variant={selected ? 'Primary' : 'SurfaceVariant'}
      aria-pressed={selected}
      onClick={onClick}
      disabled={disabled}
      direction="Row"
      alignItems="Center"
      gap="300"
      style={{ padding: config.space.S300, textAlign: 'left' }}
    >
      <Icon size="400" src={icon} />
      <Box grow="Yes" direction="Column">
        <Text size="H6">{title}</Text>
        <Text size="T300" priority="300">
          {description}
        </Text>
      </Box>
      {selected && <Icon src={Icons.Check} />}
    </SequenceCard>
  );
}

type SpaceRoomFormProps = {
  space: Room;
  defaultType?: CreateRoomType;
  onCreate?: (roomId: string) => void;
};

// Creating a room inside a space, Discord style: it's either for everyone in the space or
// only for the members you pick. Nobody outside the space can be in it.
export function SpaceRoomForm({ space, defaultType, onCreate }: SpaceRoomFormProps) {
  const mx = useMatrixClient();
  const alive = useAlive();
  const roomVersion = useCapabilities()['m.room_versions']?.default ?? '10';

  const [type, setType] = useState(defaultType ?? CreateRoomType.TextRoom);
  const [onlyPicked, setOnlyPicked] = useState(false);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());

  const members = useMemo(
    () =>
      pickableMembers(
        space.getJoinedMembers().map((m) => ({
          userId: m.userId,
          name: getMemberDisplayName(space, m.userId) ?? getMxIdLocalPart(m.userId) ?? m.userId,
        })),
        mx.getSafeUserId()
      ),
    [space, mx]
  );

  const togglePicked = (userId: string) =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });

  const [createState, create] = useAsyncCallback<
    string,
    Error | MatrixError,
    [string, string | undefined]
  >(
    useCallback(
      async (name, topic) => {
        const roomId = await createRoom(mx, {
          version: roomVersion,
          type: type === CreateRoomType.VoiceRoom ? RoomType.Call : undefined,
          parent: space,
          access: onlyPicked ? CreateRoomAccess.Private : CreateRoomAccess.Restricted,
          name,
          topic,
          encryption: true,
          knock: false,
          allowFederation: false,
        });
        // The room exists now; a failed invite shouldn't hide it, so invites go one by one.
        await Promise.allSettled(onlyPicked ? [...picked].map((id) => mx.invite(roomId, id)) : []);
        return roomId;
      },
      [mx, roomVersion, type, space, onlyPicked, picked]
    )
  );
  const loading = createState.status === AsyncStatus.Loading;
  const error = createState.status === AsyncStatus.Error ? createState.error : undefined;

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    if (loading) return;
    const form = evt.currentTarget;
    const name = (form.nameInput as HTMLInputElement | undefined)?.value.trim();
    const topic = (form.topicTextArea as HTMLTextAreaElement | undefined)?.value.trim();
    if (!name) return;

    create(name, topic || undefined).then((roomId) => {
      if (alive()) onCreate?.(roomId);
    });
  };

  return (
    <Box as="form" onSubmit={handleSubmit} grow="Yes" direction="Column" gap="500">
      <Box direction="Column" gap="100">
        <Text size="L400">Type</Text>
        <CreateRoomTypeSelector
          value={type}
          onSelect={setType}
          disabled={loading}
          getIcon={typeIcon}
        />
      </Box>
      <Box direction="Column" gap="100">
        <Text size="L400">Name</Text>
        <Input
          required
          before={<Icon size="100" src={typeIcon(type)} />}
          name="nameInput"
          autoFocus
          size="500"
          variant="SurfaceVariant"
          radii="400"
          autoComplete="off"
          disabled={loading}
        />
      </Box>
      <Box direction="Column" gap="100">
        <Text size="L400">Topic (Optional)</Text>
        <TextArea
          name="topicTextArea"
          size="500"
          variant="SurfaceVariant"
          radii="400"
          disabled={loading}
        />
      </Box>
      <Box direction="Column" gap="100">
        <Text size="L400">Who can see it</Text>
        <AccessOption
          selected={!onlyPicked}
          icon={Icons.Category}
          title={`Everyone in ${space.name}`}
          description="Anyone in the space can find and join it."
          onClick={() => setOnlyPicked(false)}
          disabled={loading}
        />
        <AccessOption
          selected={onlyPicked}
          icon={Icons.Lock}
          title="Only people I pick"
          description="Hidden from everyone else in the space."
          onClick={() => setOnlyPicked(true)}
          disabled={loading}
        />
      </Box>
      {onlyPicked && (
        <Box direction="Column" gap="100">
          <Text size="L400">Members{picked.size > 0 && ` (${picked.size} picked)`}</Text>
          {members.length === 0 ? (
            <Text size="T300" priority="300">
              Nobody else is in the space yet. You can invite space members later.
            </Text>
          ) : (
            <Scroll size="300" hideTrack style={{ maxHeight: toRem(240) }}>
              <Box direction="Column" gap="100">
                {members.map((member) => (
                  <Box
                    key={member.userId}
                    as="label"
                    alignItems="Center"
                    gap="200"
                    style={{ cursor: 'pointer', padding: `${config.space.S100} 0` }}
                  >
                    <Checkbox
                      variant="Primary"
                      checked={picked.has(member.userId)}
                      onClick={() => togglePicked(member.userId)}
                      disabled={loading}
                    />
                    <FriendAvatar userId={member.userId} />
                    <Text size="T300" truncate>
                      {member.name}
                    </Text>
                  </Box>
                ))}
              </Box>
            </Scroll>
          )}
        </Box>
      )}
      {error && (
        <Box style={{ color: color.Critical.Main }} alignItems="Center" gap="200">
          <Icon src={Icons.Warning} filled size="100" />
          <Text size="T300" style={{ color: color.Critical.Main }}>
            <b>{error.message}</b>
          </Text>
        </Box>
      )}
      <Button
        type="submit"
        size="500"
        variant="Primary"
        radii="400"
        disabled={loading}
        before={loading && <Spinner variant="Primary" fill="Solid" size="200" />}
      >
        <Text size="B500">Create</Text>
      </Button>
    </Box>
  );
}
