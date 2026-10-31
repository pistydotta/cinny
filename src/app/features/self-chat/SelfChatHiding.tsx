import React, { ReactElement, useCallback, useState } from 'react';
import FocusTrap from 'focus-trap-react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Dialog,
  Header,
  Icon,
  IconButton,
  Icons,
  MenuItem,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Spinner,
  Switch,
  Text,
  color,
  config,
} from 'folds';
import { SequenceCard } from '../../components/sequence-card';
import { SettingTile } from '../../components/setting-tile';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useAccountData } from '../../hooks/useAccountData';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { useSelectedRoom } from '../../hooks/router/useSelectedRoom';
import { getHomePath } from '../../pages/pathUtils';
import { stopPropagation } from '../../utils/keyboard';
import { SequenceCardStyle } from '../settings/styles.css';
import { tr } from '../translation/tr';
import { SELF_CHAT_SETTINGS, parseSelfChatHidden } from './selfChat';
import { isSelfChatRoom } from './selfChatRoom';

export const useSelfChatHidden = (): boolean =>
  parseSelfChatHidden(useAccountData(SELF_CHAT_SETTINGS)?.getContent());

const useSetSelfChatHidden = () => {
  const mx = useMatrixClient();
  return useAsyncCallback<unknown, Error, [boolean]>(
    useCallback(
      (hidden) => mx.setAccountData(SELF_CHAT_SETTINGS as never, { hidden } as never),
      [mx]
    )
  );
};

function HideSelfChatPrompt({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const navigate = useNavigate();
  const selected = useSelectedRoom();
  const [state, setHidden] = useSetSelfChatHidden();
  const hiding = state.status === AsyncStatus.Loading;

  const handleHide = () => {
    setHidden(true).then(() => {
      onDone();
      // Open, it would stay on the list: an open chat always shows there.
      if (selected) navigate(getHomePath());
    });
  };

  return (
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: onCancel,
            clickOutsideDeactivates: true,
            escapeDeactivates: stopPropagation,
          }}
        >
          <Dialog variant="Surface">
            <Header
              style={{
                padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
                borderBottomWidth: config.borderWidth.B300,
              }}
              variant="Surface"
              size="500"
            >
              <Box grow="Yes">
                <Text size="H4">{tr('self_chat.hide_title', 'Hide this chat')}</Text>
              </Box>
              <IconButton size="300" onClick={onCancel} radii="300">
                <Icon src={Icons.Cross} />
              </IconButton>
            </Header>
            <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
              <Box direction="Column" gap="200">
                <Text priority="400">
                  {tr(
                    'self_chat.hide_body',
                    'This chat leaves your list, but nothing is deleted. To bring it back, open Settings > Account.'
                  )}
                </Text>
                {state.status === AsyncStatus.Error && (
                  <Text style={{ color: color.Critical.Main }} size="T300">
                    {state.error.message}
                  </Text>
                )}
              </Box>
              <Button
                variant="Primary"
                onClick={handleHide}
                disabled={hiding}
                before={hiding ? <Spinner fill="Solid" variant="Primary" size="200" /> : undefined}
              >
                <Text size="B400">{tr('self_chat.hide', 'Hide')}</Text>
              </Button>
            </Box>
          </Dialog>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}

type LeaveOrHideProps = {
  roomId: string;
  onDone: () => void;
  // The usual Leave Room item, for every other room.
  children: ReactElement;
};
// Your chat with yourself can't be left, only hidden: leaving would lose it for good.
export function LeaveOrHideSelfChat({ roomId, onDone, children }: LeaveOrHideProps) {
  const mx = useMatrixClient();
  const [prompt, setPrompt] = useState(false);

  if (!isSelfChatRoom(mx, roomId)) return children;

  return (
    <>
      <MenuItem
        onClick={() => setPrompt(true)}
        size="300"
        after={<Icon size="100" src={Icons.EyeBlind} />}
        radii="300"
        aria-pressed={prompt}
      >
        <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
          {tr('self_chat.hide_title', 'Hide this chat')}
        </Text>
      </MenuItem>
      {prompt && <HideSelfChatPrompt onDone={onDone} onCancel={() => setPrompt(false)} />}
    </>
  );
}

// The way back after hiding. It belongs at the bottom of Account: few people will ever need it.
export function SelfChatSetting() {
  const hidden = useSelfChatHidden();
  const [state, setHidden] = useSetSelfChatHidden();

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">{tr('self_chat.setting_section', 'Chat with yourself')}</Text>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="400"
      >
        <SettingTile
          title={tr('self_chat.setting_title', 'Show in my chat list')}
          after={
            <Switch
              variant="Primary"
              value={!hidden}
              onChange={(show: boolean) => setHidden(!show)}
              disabled={state.status === AsyncStatus.Loading}
            />
          }
        />
      </SequenceCard>
    </Box>
  );
}
