import { ApiError } from '../../utils/blazeroomApi';
import { tr } from '../translation/tr';
import { MediaType, PlaybookApi } from './api';

const POLL_MS = 1000;
// A YouTube download plus its conversion can take a few minutes on the VPS.
const MAX_WAIT_MS = 15 * 60_000;

// Limits the API enforces (api/src/playbook/media.js), checked here too so a big file fails
// before it's sent.
export const MAX_BYTES: Record<MediaType, number> = {
  video: 100 * 1024 * 1024,
  image: 15 * 1024 * 1024,
};
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export const fileError = (file: File, type: MediaType): string | null => {
  if (type === 'video' && !file.type.startsWith('video/'))
    return tr('playbook.upload.not_video', 'That file is not a video.');
  if (type === 'image' && !IMAGE_TYPES.includes(file.type))
    return tr('playbook.upload.not_image', 'Use a PNG, JPEG or WebP image.');
  if (file.size > MAX_BYTES[type])
    return type === 'video'
      ? tr(
          'playbook.upload.video_too_large',
          'The video is over 100 MB. Trim it or record at lower quality.'
        )
      : tr('playbook.upload.image_too_large', 'The image is over 15 MB.');
  return null;
};

class UploadFailed extends Error {}

async function waitReady(api: PlaybookApi, id: string): Promise<string> {
  const started = Date.now();
  for (;;) {
    // eslint-disable-next-line no-await-in-loop
    const s = await api.mediaStatus(id);
    if (s.status === 'ready') return id;
    if (s.status === 'failed') throw new ApiError(s.reason ?? 'convert_failed', 422);
    if (Date.now() - started > MAX_WAIT_MS) throw new ApiError('convert_failed', 422);
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => {
      setTimeout(r, POLL_MS);
    });
  }
}

// Sends the file, then waits while the server converts it. Resolves with the ready file's id.
export async function uploadAndWait(
  api: PlaybookApi,
  file: File,
  type: MediaType,
  onStage: (stage: { sending?: number; processing?: true }) => void
): Promise<string> {
  const problem = fileError(file, type);
  if (problem) throw new UploadFailed(problem);
  const { id } = await api.upload(file, (sending) => onStage({ sending }));
  onStage({ processing: true });
  return waitReady(api, id);
}

// Sends a YouTube link for the server to download. Resolves with the ready video's id.
export async function linkAndWait(
  api: PlaybookApi,
  url: string,
  onStage: (stage: { processing: true }) => void
): Promise<string> {
  const { id } = await api.addLink(url.trim());
  onStage({ processing: true });
  return waitReady(api, id);
}

export const uploadError = (e: unknown): string => {
  if (e instanceof UploadFailed) return e.message;
  const code = e instanceof ApiError ? e.code : '';
  switch (code) {
    case 'too_large':
      return tr('playbook.upload.too_large', 'The file is too large.');
    case 'too_long':
      return tr(
        'playbook.upload.too_long',
        'That video is over 30 minutes. Link a shorter one, or add ?t= at the moment it starts.'
      );
    case 'invalid_link':
      return tr('playbook.upload.invalid_link', "That doesn't look like a link.");
    case 'unsupported_link':
      return tr('playbook.upload.unsupported_link', 'Only YouTube links for now.');
    case 'source_blocked':
      return tr(
        'playbook.upload.source_blocked',
        "YouTube didn't let the server download this one (private, age-restricted or blocked). Try another link or send the file."
      );
    case 'download_failed':
      return tr(
        'playbook.upload.download_failed',
        "Couldn't download that video. Check the link or send the file."
      );
    case 'not_video':
    case 'not_media':
      return tr('playbook.upload.unreadable_video', "That file couldn't be read as a video.");
    case 'not_image':
      return tr('playbook.upload.unreadable_image', "That file couldn't be read as an image.");
    case 'too_big_image':
      return tr('playbook.upload.image_dimensions', 'The image is larger than 3840×2160.');
    case 'too_many':
      return tr('playbook.upload.too_many', 'Too many uploads this hour. Try again later.');
    case 'interrupted':
      return tr(
        'playbook.upload.interrupted',
        'The server restarted while converting. Send it again.'
      );
    case 'forbidden':
      return tr('playbook.error.forbidden', "You can't change this.");
    case 'slug_taken':
      return tr('playbook.error.slug_taken', 'A map with that id already exists.');
    case 'network':
      return tr('playbook.error.network', "Couldn't reach the server. Check your connection.");
    default:
      return tr('playbook.error.generic', 'Something went wrong ({{code}}). Try again.', {
        code: code || 'unknown',
      });
  }
};
