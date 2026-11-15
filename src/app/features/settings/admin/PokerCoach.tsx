import React, { useEffect, useId, useMemo, useState } from 'react';
import { Box, Button, Input, Text } from 'folds';
import { CoachUser, createPokerCoachApi } from '../../admin/pokerCoachApi';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { tr } from '../../translation/tr';
import { ApiError } from '../../../utils/blazeroomApi';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';

const localpart = (userId: string) => userId.replace(/^@|:.*$/g, '');

function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === 'no_such_user')
      return tr('poker_coach.no_such_user', 'That account does not exist.');
    if (error.code === 'invalid_user_id')
      return tr('poker_coach.invalid', 'Write a user of this server, like @ana.');
  }
  return tr('poker_coach.failed', 'That did not work. Try again.');
}

/** Superadmins release the poker coach to specific accounts; nobody else sees it. */
export function PokerCoach() {
  const formId = useId();
  const mx = useMatrixClient();
  const api = useMemo(() => createPokerCoachApi(() => mx.getAccessToken()), [mx]);
  const [users, setUsers] = useState<CoachUser[]>();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api
      .list()
      .then((value) => active && setUsers(value))
      .catch((err) => {
        if (active) setError(errorMessage(err));
      });
    return () => {
      active = false;
    };
  }, [api]);

  const run = async (action: () => Promise<CoachUser[]>) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      setUsers(await action());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box direction="Column" gap="100">
      <Box direction="Column" gap="100">
        <Text size="L400">{tr('poker_coach.title', 'Poker coach')}</Text>
        <Text size="T200" priority="300">
          {tr(
            'poker_coach.about',
            'The hints, the hand review and the tournament report are hidden from everyone. Superadmins always see them; release them here to specific accounts. It applies from the next tournament the person enters.'
          )}
        </Text>
      </Box>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="300"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const wanted = name.trim();
            if (!wanted) return;
            run(async () => {
              const next = await api.grant(wanted.startsWith('@') ? wanted : `@${wanted}`);
              setName('');
              return next;
            });
          }}
        >
          <Box gap="200" alignItems="End">
            <Box grow="Yes" direction="Column" gap="100">
              <label htmlFor={`${formId}-user`}>
                <Text as="span" size="T200">
                  {tr('poker_coach.user', 'User')}
                </Text>
              </label>
              <Input
                id={`${formId}-user`}
                value={name}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setName(event.target.value)
                }
                placeholder={tr('poker_coach.placeholder', '@user')}
                variant="Background"
                size="400"
                radii="300"
                autoComplete="off"
              />
            </Box>
            <Button type="submit" size="400" radii="300" disabled={busy || !name.trim()}>
              <Text size="B400">{tr('poker_coach.add', 'Release')}</Text>
            </Button>
          </Box>
        </form>
        {error && (
          <Text size="T200" style={{ color: 'var(--mx-tc-critical, #e5484d)' }}>
            {error}
          </Text>
        )}
        {users && users.length === 0 && (
          <Text size="T200" priority="300">
            {tr('poker_coach.empty', 'Nobody released yet.')}
          </Text>
        )}
        {users?.map((user) => (
          <Box key={user.userId} alignItems="Center" gap="200">
            <Box grow="Yes" direction="Column">
              <Text size="T300">{user.userId}</Text>
              <Text size="T200" priority="300">
                {tr('poker_coach.by', 'released by {{name}}', { name: localpart(user.grantedBy) })}
              </Text>
            </Box>
            <Button
              size="300"
              radii="300"
              variant="Secondary"
              fill="Soft"
              disabled={busy}
              onClick={() => run(() => api.revoke(user.userId))}
            >
              <Text size="B300">{tr('poker_coach.remove', 'Remove')}</Text>
            </Button>
          </Box>
        ))}
      </SequenceCard>
    </Box>
  );
}
