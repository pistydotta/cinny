import React, { FormEventHandler, useEffect, useMemo, useRef, useState } from 'react';
import { useMatch, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  Icon,
  Icons,
  Input,
  Scroll,
  Spinner,
  Text,
  color,
  config,
  toRem,
} from 'folds';
import { Page, PageContent } from '../../components/page';
import { NavButton, NavItem, NavItemContent } from '../../components/nav';
import { MobileBackHeader } from '../home-overview/MobileBackHeader';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { useAlive } from '../../hooks/useAlive';
import { useToast } from '../../components/toast';
import { getHomeJoinPath } from '../../pages/pathUtils';
import { tr } from '../translation/tr';
import {
  RedeemInput,
  cleanCode,
  createRoomCodesApi,
  linkTokenFrom,
  roomCodeErrorMessage,
} from './roomCodesApi';
import { redeemAndJoin } from './joinByCode';

// "Join with code" in the Home nav, beside "Join with Address".
export function JoinByCodeNavItem() {
  const navigate = useNavigate();
  const selected = !!useMatch({ path: getHomeJoinPath(), caseSensitive: true, end: false });
  return (
    <NavItem variant="Background" radii="400" aria-selected={selected}>
      <NavButton onClick={() => navigate(getHomeJoinPath())}>
        <NavItemContent>
          <Box as="span" grow="Yes" alignItems="Center" gap="200">
            <Avatar size="200" radii="400">
              <Icon src={Icons.Hash} size="100" />
            </Avatar>
            <Box as="span" grow="Yes">
              <Text as="span" size="Inherit" truncate>
                {tr('room_codes.join_nav', 'Join with code')}
              </Text>
            </Box>
          </Box>
        </NavItemContent>
      </NavButton>
    </NavItem>
  );
}

// /home/join/: type a four-digit code, or open an invite link (?link=...), and join the room or
// space it's for.
export function JoinByCodePage() {
  const mx = useMatrixClient();
  const api = useMemo(() => createRoomCodesApi(() => mx.getAccessToken()), [mx]);
  const { navigateRoom, navigateSpace } = useRoomNavigate();
  const [params, setParams] = useSearchParams();
  const alive = useAlive();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string>();

  const join = async (input: RedeemInput) => {
    if (joining) return;
    setJoining(true);
    setError(undefined);
    try {
      const joined = await redeemAndJoin(api.redeem, (roomId) => mx.joinRoom(roomId), input);
      if (!alive()) return;
      const name = joined.name ?? mx.getRoom(joined.roomId)?.name ?? '';
      toast(tr('room_codes.joined', 'You joined {{name}}', { name }));
      if (mx.getRoom(joined.roomId)?.isSpaceRoom()) navigateSpace(joined.roomId);
      else navigateRoom(joined.roomId);
    } catch (e) {
      if (!alive()) return;
      setError(roomCodeErrorMessage(e));
      setJoining(false);
    }
  };

  // An invite link opens this page with its token; use it once and take it out of the address.
  const linkToken = params.get('link');
  const usedLink = useRef(false);
  useEffect(() => {
    if (!linkToken || usedLink.current) return;
    usedLink.current = true;
    setParams({}, { replace: true });
    join({ link: linkToken });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkToken]);

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    if (code.length === 4) join({ code });
  };

  return (
    <Page>
      <MobileBackHeader />
      <Scroll hideTrack visibility="Hover">
        <PageContent>
          <Box
            as="form"
            onSubmit={handleSubmit}
            direction="Column"
            gap="400"
            style={{
              maxWidth: toRem(420),
              margin: '0 auto',
              paddingTop: config.space.S700,
              paddingBottom: config.space.S700,
            }}
          >
            <Box direction="Column" gap="100">
              <Text size="H3">{tr('room_codes.join_title', 'Join with code')}</Text>
              <Text size="T300" priority="300">
                {tr(
                  'room_codes.join_body',
                  'Type the four-digit code a friend gave you, or paste their invite link.'
                )}
              </Text>
            </Box>
            <Input
              ref={inputRef}
              size="500"
              variant="Background"
              radii="400"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              placeholder="0000"
              aria-label={tr('room_codes.code_label', 'Code')}
              value={code}
              disabled={joining}
              onChange={(evt) => {
                const { value } = evt.currentTarget;
                const token = linkTokenFrom(value);
                if (token) {
                  setCode('');
                  join({ link: token });
                  return;
                }
                setCode(cleanCode(value));
                setError(undefined);
              }}
            />
            {error && (
              <Text size="T300" style={{ color: color.Critical.Main }}>
                {error}
              </Text>
            )}
            <Button
              type="submit"
              size="500"
              variant="Primary"
              radii="400"
              disabled={joining || code.length !== 4}
              before={joining ? <Spinner size="200" variant="Primary" fill="Solid" /> : undefined}
            >
              <Text size="B500">{tr('room_codes.join', 'Join')}</Text>
            </Button>
          </Box>
        </PageContent>
      </Scroll>
    </Page>
  );
}
