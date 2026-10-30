import React, { CSSProperties, useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  Header,
  Modal,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Spinner,
  Text,
  color,
  config,
  toRem,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { ImageViewer } from '../../../components/image-viewer';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { ModalWide } from '../../../styles/Modal.css';
import { stopPropagation } from '../../../utils/keyboard';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { mxcUrlToHttp } from '../../../utils/matrix';
import { feedbackTypeLabel } from '../../feedback/FeedbackForm';
import { FeedbackItem, feedbackErrorMessage, splitFeedback } from '../../feedback/feedbackApi';
import { useFeedbackApi } from '../../feedback/useFeedbackApi';
import { tr } from '../../translation/tr';

const HeaderStyle: CSSProperties = {
  padding: `0 ${config.space.S400}`,
  borderBottomWidth: config.borderWidth.B300,
};

type DeleteDialogProps = {
  onConfirm: () => Promise<unknown>;
  onClose: () => void;
};
function DeleteDialog({ onConfirm, onClose }: DeleteDialogProps) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    await onConfirm();
    setBusy(false);
    onClose();
  };

  return (
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: () => !busy && onClose(),
            clickOutsideDeactivates: true,
            escapeDeactivates: true,
          }}
        >
          <Dialog variant="Surface" style={{ maxWidth: toRem(440) }}>
            <Header style={HeaderStyle} variant="Surface" size="500">
              <Text size="H4" truncate>
                {tr('feedback.delete_title', 'Delete this feedback?')}
              </Text>
            </Header>
            <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
              <Text size="T300">
                {tr(
                  'feedback.delete_body',
                  "This can't be undone. The message and its screenshot are deleted from the server."
                )}
              </Text>
              <Box gap="200" justifyContent="End">
                <Button variant="Secondary" fill="Soft" onClick={onClose} disabled={busy}>
                  <Text size="B400">{tr('common.cancel', 'Cancel')}</Text>
                </Button>
                <Button
                  variant="Critical"
                  onClick={handleConfirm}
                  disabled={busy}
                  before={busy ? <Spinner variant="Critical" fill="Solid" size="200" /> : undefined}
                >
                  <Text size="B400">{tr('feedback.delete', 'Delete')}</Text>
                </Button>
              </Box>
            </Box>
          </Dialog>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}

type FeedbackRowProps = {
  item: FeedbackItem;
  act: (run: () => Promise<void>) => Promise<void>;
};
function FeedbackRow({ item, act }: FeedbackRowProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const api = useFeedbackApi();
  const [deleting, setDeleting] = useState(false);
  const [viewing, setViewing] = useState(false);
  const imageUrl = item.screenshotUrl
    ? mxcUrlToHttp(mx, item.screenshotUrl, useAuthentication) ?? undefined
    : undefined;

  return (
    <SequenceCard
      className={SequenceCardStyle}
      variant="SurfaceVariant"
      direction="Column"
      gap="200"
    >
      <Box direction="Column">
        <Text size="L400">{feedbackTypeLabel(item.type)}</Text>
        <Text size="T200" priority="300">
          {item.userId} · {new Date(item.createdAt).toLocaleString()}
        </Text>
      </Box>
      <Text size="T300" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
        {item.body}
      </Text>
      {imageUrl && (
        // Not a link: a new tab has no session for the service worker to authenticate media with.
        <button
          type="button"
          onClick={() => setViewing(true)}
          style={{ all: 'unset', cursor: 'zoom-in', maxWidth: '100%' }}
        >
          <img
            src={imageUrl}
            alt={tr('feedback.screenshot_alt', 'Screenshot')}
            style={{
              display: 'block',
              maxWidth: '100%',
              maxHeight: toRem(320),
              borderRadius: config.radii.R300,
            }}
          />
        </button>
      )}
      {imageUrl && viewing && (
        <Overlay open backdrop={<OverlayBackdrop />}>
          <OverlayCenter>
            <FocusTrap
              focusTrapOptions={{
                initialFocus: false,
                onDeactivate: () => setViewing(false),
                clickOutsideDeactivates: true,
                escapeDeactivates: stopPropagation,
              }}
            >
              <Modal className={ModalWide} size="500">
                <ImageViewer
                  src={imageUrl}
                  alt={tr('feedback.screenshot_alt', 'Screenshot')}
                  requestClose={() => setViewing(false)}
                />
              </Modal>
            </FocusTrap>
          </OverlayCenter>
        </Overlay>
      )}
      <Box gap="200" wrap="Wrap">
        <Button
          size="300"
          radii="300"
          variant="Secondary"
          fill="Soft"
          onClick={() => act(() => api.setDone(item.id, !item.doneAt))}
        >
          <Text size="B300">
            {item.doneAt
              ? tr('feedback.reopen', 'Reopen')
              : tr('feedback.mark_done', 'Mark as done')}
          </Text>
        </Button>
        <Button
          size="300"
          radii="300"
          variant="Critical"
          fill="Soft"
          onClick={() => setDeleting(true)}
        >
          <Text size="B300">{tr('feedback.delete', 'Delete')}</Text>
        </Button>
      </Box>
      {deleting && (
        <DeleteDialog
          onConfirm={() => act(() => api.remove(item.id))}
          onClose={() => setDeleting(false)}
        />
      )}
    </SequenceCard>
  );
}

export function FeedbackList() {
  const api = useFeedbackApi();
  const [items, setItems] = useState<FeedbackItem[]>();
  const [error, setError] = useState<string>();
  const [showDone, setShowDone] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await api.list());
    } catch (e) {
      setError(feedbackErrorMessage(e));
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  // The list reloads after a failure too: another admin may have just deleted the item.
  const act = useCallback(
    async (run: () => Promise<void>) => {
      setError(undefined);
      try {
        await run();
      } catch (e) {
        setError(feedbackErrorMessage(e));
      }
      await load();
    },
    [load]
  );

  const { open, done } = splitFeedback(items ?? []);

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">{tr('feedback.title', 'Help & feedback')}</Text>
      {error && (
        <Text size="T200" style={{ color: color.Critical.Main }}>
          <b>{error}</b>
        </Text>
      )}
      {items && open.length === 0 && (
        <Text size="T200" priority="300">
          {tr('feedback.none_open', 'Nothing open.')}
        </Text>
      )}
      {open.map((item) => (
        <FeedbackRow key={item.id} item={item} act={act} />
      ))}
      {done.length > 0 && (
        <Box>
          <Button
            size="300"
            radii="300"
            variant="Secondary"
            fill="None"
            aria-expanded={showDone}
            onClick={() => setShowDone((value) => !value)}
          >
            <Text size="B300">
              {tr('feedback.done_count', 'Done ({{count}})', { count: done.length })}
            </Text>
          </Button>
        </Box>
      )}
      {showDone && done.map((item) => <FeedbackRow key={item.id} item={item} act={act} />)}
    </Box>
  );
}
