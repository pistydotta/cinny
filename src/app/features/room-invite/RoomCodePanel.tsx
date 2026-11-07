import React, { useCallback, useMemo, useState } from 'react';
import { Box, Button, Chip, Icon, Icons, Spinner, Text, color, config, toRem } from 'folds';
import { Room } from 'matrix-js-sdk';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useAlive } from '../../hooks/useAlive';
import { useToast } from '../../components/toast';
import { copyToClipboard } from '../../utils/dom';
import { tr } from '../translation/tr';
import { expiresInLabel, minutesLabel, usesLabel } from '../invites/invitesApi';
import {
  RoomCode,
  RoomCodeChoice,
  RoomCodesInfo,
  codeUsesLabel,
  createRoomCodesApi,
  roomCodeErrorMessage,
} from './roomCodesApi';

type ChoiceRowProps<T> = {
  label: string;
  values: T[];
  selected: T;
  name: (value: T) => string;
  onSelect: (value: T) => void;
};
function ChoiceRow<T>({ label, values, selected, name, onSelect }: ChoiceRowProps<T>) {
  return (
    <Box direction="Column" gap="100">
      <Text size="L400" priority="300">
        {label}
      </Text>
      <Box gap="100" wrap="Wrap" role="radiogroup" aria-label={label}>
        {values.map((value) => (
          <Chip
            key={String(value)}
            role="radio"
            aria-checked={value === selected}
            variant={value === selected ? 'Primary' : 'Secondary'}
            outlined={value !== selected}
            radii="Pill"
            onClick={() => onSelect(value)}
          >
            <Text size="T200">{name(value)}</Text>
          </Chip>
        ))}
      </Box>
    </Box>
  );
}

function CodeCard({ code, onRevoke }: { code: RoomCode; onRevoke: () => Promise<void> }) {
  const toast = useToast();
  const [revoking, setRevoking] = useState(false);
  return (
    <Box
      direction="Column"
      gap="300"
      style={{
        padding: config.space.S400,
        borderRadius: config.radii.R400,
        background: color.SurfaceVariant.Container,
      }}
    >
      <Box alignItems="Center" justifyContent="SpaceBetween" gap="300" wrap="Wrap">
        <Text
          as="span"
          style={{
            fontSize: toRem(36),
            fontWeight: 700,
            letterSpacing: '0.3em',
            fontVariantNumeric: 'tabular-nums',
          }}
          aria-label={tr('room_codes.code_aria', 'Code {{code}}', { code: code.code })}
        >
          {code.code}
        </Text>
        <Text size="T200" priority="300">
          {expiresInLabel(code.expiresAt)} · {codeUsesLabel(code)}
        </Text>
      </Box>
      <Box gap="200" wrap="Wrap">
        <Chip
          variant="Primary"
          radii="Pill"
          before={<Icon size="50" src={Icons.Hash} />}
          onClick={() => {
            copyToClipboard(code.code);
            toast(tr('room_codes.code_copied', 'Code copied'));
          }}
        >
          <Text size="T200">{tr('room_codes.copy_code', 'Copy code')}</Text>
        </Chip>
        <Chip
          variant="Primary"
          radii="Pill"
          before={<Icon size="50" src={Icons.Link} />}
          onClick={() => {
            copyToClipboard(code.link);
            toast(tr('room_codes.link_copied', 'Invite link copied'));
          }}
        >
          <Text size="T200">{tr('room_codes.copy_link', 'Copy link')}</Text>
        </Chip>
        <Chip
          variant="Critical"
          radii="Pill"
          disabled={revoking}
          onClick={async () => {
            setRevoking(true);
            await onRevoke();
            setRevoking(false);
          }}
        >
          <Text size="T200">{tr('room_codes.revoke', 'Revoke')}</Text>
        </Chip>
      </Box>
    </Box>
  );
}

// "Invite with a link or code": a four-digit code and a link for this room or space. Anyone on
// blazeroom who has it gets in, invited by you (api/src/roomCodeRoutes.js).
export function RoomCodePanel({ room }: { room: Room }) {
  const mx = useMatrixClient();
  const api = useMemo(() => createRoomCodesApi(() => mx.getAccessToken()), [mx]);
  const alive = useAlive();
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<RoomCodesInfo>();
  const [choice, setChoice] = useState<RoomCodeChoice>();
  const [picking, setPicking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    try {
      const next = await api.info(room.roomId);
      if (!alive()) return;
      setInfo(next);
      setChoice((current) => current ?? next.defaults);
      setPicking(next.codes.length === 0);
    } catch (e) {
      if (alive()) setError(roomCodeErrorMessage(e));
    }
  }, [api, room, alive]);

  const handleOpen = () => {
    setOpen(true);
    load();
  };

  const handleCreate = async () => {
    if (creating || !choice) return;
    setCreating(true);
    setError(undefined);
    try {
      await api.create(room.roomId, choice);
      await load();
    } catch (e) {
      if (alive()) setError(roomCodeErrorMessage(e));
    } finally {
      if (alive()) setCreating(false);
    }
  };

  const handleRevoke = async (code: RoomCode) => {
    try {
      await api.revoke(code.linkToken);
      toast(tr('room_codes.revoked', 'Code revoked'));
    } catch (e) {
      toast(roomCodeErrorMessage(e), 'Critical');
    }
    await load();
  };

  if (!open) {
    return (
      <Button
        type="button"
        size="400"
        variant="Secondary"
        fill="Soft"
        radii="300"
        style={{ width: '100%' }}
        before={<Icon size="100" src={Icons.Link} />}
        onClick={handleOpen}
      >
        <Text size="B400">{tr('room_codes.open', 'Invite with a link or code')}</Text>
      </Button>
    );
  }

  const current = info?.codes[0];
  return (
    <Box direction="Column" gap="300">
      <Box direction="Column" gap="100">
        <Text size="L400">{tr('room_codes.title', 'Link or code')}</Text>
        <Text size="T200" priority="300">
          {tr(
            'room_codes.description',
            'Anyone on blazeroom with the link, or who types the code in "Join with code" on Home, gets in. You send the invite.'
          )}
        </Text>
      </Box>
      {!info && !error && <Spinner variant="Secondary" />}
      {!picking &&
        info?.codes.map((code) => (
          <CodeCard key={code.linkToken} code={code} onRevoke={() => handleRevoke(code)} />
        ))}
      {info && current && !picking && (
        <Box>
          <Button
            type="button"
            size="300"
            variant="Secondary"
            fill="None"
            radii="300"
            onClick={() => setPicking(true)}
          >
            <Text size="B300">{tr('room_codes.new', 'New code')}</Text>
          </Button>
        </Box>
      )}
      {info && choice && picking && (
        <>
          <ChoiceRow
            label={tr('room_codes.expires_after', 'Expires after')}
            values={info.options.minutes}
            selected={choice.minutes}
            name={minutesLabel}
            onSelect={(minutes) => setChoice({ ...choice, minutes })}
          />
          <ChoiceRow
            label={tr('room_codes.who', 'How many people')}
            values={info.options.uses}
            selected={choice.uses}
            name={usesLabel}
            onSelect={(uses) => setChoice({ ...choice, uses })}
          />
          <Box gap="200">
            <Button
              type="button"
              size="400"
              variant="Primary"
              radii="300"
              disabled={creating}
              onClick={handleCreate}
              before={creating ? <Spinner size="200" variant="Primary" fill="Solid" /> : undefined}
            >
              <Text size="B400">{tr('room_codes.create', 'Create code')}</Text>
            </Button>
            {current && (
              <Button
                type="button"
                size="400"
                variant="Secondary"
                fill="None"
                radii="300"
                onClick={() => setPicking(false)}
              >
                <Text size="B400">{tr('room_codes.cancel', 'Cancel')}</Text>
              </Button>
            )}
          </Box>
        </>
      )}
      {error && (
        <Text size="T200" style={{ color: color.Critical.Main }}>
          {error}
        </Text>
      )}
    </Box>
  );
}
