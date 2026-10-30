import React, { ClipboardEventHandler, FormEventHandler, useCallback, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Icon,
  IconButton,
  Icons,
  Spinner,
  Text,
  TextArea,
  color,
  config,
  toRem,
} from 'folds';
import { SequenceCard } from '../../components/sequence-card';
import { SequenceCardStyle } from '../settings/styles.css';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { useAlive } from '../../hooks/useAlive';
import { useFilePicker } from '../../hooks/useFilePicker';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useObjectURL } from '../../hooks/useObjectURL';
import { getDataTransferFiles } from '../../utils/dom';
import { tr } from '../translation/tr';
import {
  FEEDBACK_TYPES,
  FeedbackType,
  MAX_BODY_LENGTH,
  ScreenshotProblem,
  checkScreenshot,
  feedbackErrorMessage,
  firstImage,
} from './feedbackApi';
import { useFeedbackApi } from './useFeedbackApi';

export const feedbackTypeLabel = (type: FeedbackType): string => {
  if (type === 'bug') return tr('feedback.type_bug', 'Bug');
  if (type === 'improvement') return tr('feedback.type_improvement', 'Improvement');
  return tr('feedback.type_other', 'Other');
};

const screenshotProblemMessage = (problem: ScreenshotProblem): string =>
  problem === 'too_big'
    ? tr('feedback.image_too_big', 'The image can be up to 10 MB.')
    : tr('feedback.image_not_image', 'That file is not an image.');

export function FeedbackForm() {
  const mx = useMatrixClient();
  const api = useFeedbackApi();
  const alive = useAlive();

  const [type, setType] = useState<FeedbackType>('bug');
  const [body, setBody] = useState('');
  const [image, setImage] = useState<File>();
  const [imageProblem, setImageProblem] = useState<ScreenshotProblem | null>(null);
  const [sent, setSent] = useState(false);
  const imageUrl = useObjectURL(image);

  const chooseImage = useCallback((file: File) => {
    const problem = checkScreenshot(file);
    setImageProblem(problem);
    if (!problem) setImage(file);
  }, []);
  const pickImage = useFilePicker(chooseImage, false);

  const handlePaste: ClipboardEventHandler<HTMLTextAreaElement> = (evt) => {
    const pasted = firstImage(getDataTransferFiles(evt.clipboardData) ?? []);
    if (!pasted) return;
    evt.preventDefault();
    chooseImage(pasted);
  };

  const [sendState, send] = useAsyncCallback<void, unknown, []>(
    useCallback(async () => {
      const screenshotUrl = image
        ? (await mx.uploadContent(image, { name: image.name, type: image.type })).content_uri
        : undefined;
      await api.send({ type, body: body.trim(), screenshotUrl });
    }, [api, mx, type, body, image])
  );
  const sending = sendState.status === AsyncStatus.Loading;

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    if (sending || !body.trim()) return;
    setSent(false);
    // A failure is shown below the form from sendState, and what was typed stays.
    send()
      .then(() => {
        if (!alive()) return;
        setSent(true);
        setBody('');
        setImage(undefined);
        setImageProblem(null);
      })
      .catch(() => undefined);
  };

  return (
    <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
      <Box as="form" onSubmit={handleSubmit} direction="Column" gap="400">
        <Box direction="Column" gap="100">
          <Text size="L400">{tr('feedback.type', 'Type')}</Text>
          <Box gap="200" wrap="Wrap">
            {FEEDBACK_TYPES.map((option) => (
              <Chip
                key={option}
                type="button"
                variant={option === type ? 'Primary' : 'Secondary'}
                radii="Pill"
                aria-pressed={option === type}
                onClick={() => setType(option)}
              >
                <Text size="T200">{feedbackTypeLabel(option)}</Text>
              </Chip>
            ))}
          </Box>
        </Box>
        <Box direction="Column" gap="100">
          <Text size="L400">{tr('feedback.message', 'Message')}</Text>
          <TextArea
            size="400"
            variant="Secondary"
            radii="300"
            rows={6}
            required
            maxLength={MAX_BODY_LENGTH}
            readOnly={sending}
            value={body}
            onChange={(evt) => {
              setBody(evt.currentTarget.value);
              setSent(false);
            }}
            onPaste={handlePaste}
          />
        </Box>
        <Box direction="Column" gap="100">
          <Text size="L400">{tr('feedback.screenshot', 'Screenshot (optional)')}</Text>
          {image && imageUrl ? (
            <Box gap="200" alignItems="Start">
              <img
                src={imageUrl}
                alt={image.name}
                style={{
                  maxWidth: '100%',
                  maxHeight: toRem(200),
                  borderRadius: config.radii.R300,
                  minWidth: 0,
                }}
              />
              <IconButton
                type="button"
                size="300"
                radii="300"
                variant="Secondary"
                aria-label={tr('feedback.image_remove', 'Remove image')}
                disabled={sending}
                onClick={() => setImage(undefined)}
              >
                <Icon size="100" src={Icons.Cross} />
              </IconButton>
            </Box>
          ) : (
            <Box gap="200" alignItems="Center" wrap="Wrap">
              <Button
                type="button"
                size="300"
                radii="300"
                variant="Secondary"
                fill="Soft"
                onClick={() => pickImage('image/*')}
              >
                <Text size="B300">{tr('feedback.image_choose', 'Choose image')}</Text>
              </Button>
              <Text size="T200" priority="300">
                {tr('feedback.image_paste', 'or paste it in the message.')}
              </Text>
            </Box>
          )}
          {imageProblem && (
            <Text size="T200" style={{ color: color.Critical.Main }}>
              <b>{screenshotProblemMessage(imageProblem)}</b>
            </Text>
          )}
        </Box>
        {sendState.status === AsyncStatus.Error && (
          <Text size="T200" style={{ color: color.Critical.Main }}>
            <b>{feedbackErrorMessage(sendState.error)}</b>
          </Text>
        )}
        {sent && <Text size="T200">{tr('feedback.sent', 'Sent. Thank you.')}</Text>}
        <Box>
          <Button
            type="submit"
            size="400"
            radii="300"
            variant="Primary"
            disabled={sending || !body.trim()}
            before={sending ? <Spinner size="200" variant="Primary" fill="Solid" /> : undefined}
          >
            <Text size="B400">{tr('feedback.send', 'Send')}</Text>
          </Button>
        </Box>
      </Box>
    </SequenceCard>
  );
}
