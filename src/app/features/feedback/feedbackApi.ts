import { ApiError, createApiRequest } from '../../utils/blazeroomApi';
import { tr } from '../translation/tr';

export type FeedbackType = 'bug' | 'improvement' | 'other';
export const FEEDBACK_TYPES: FeedbackType[] = ['bug', 'improvement', 'other'];

// Matches api/src/feedback.js.
export const MAX_BODY_LENGTH = 4000;

export const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;

export type NewFeedback = { type: FeedbackType; body: string; screenshotUrl?: string };

export type FeedbackItem = {
  id: string;
  userId: string;
  type: FeedbackType;
  body: string;
  screenshotUrl: string | null;
  userAgent: string | null;
  createdAt: string;
  doneAt: string | null;
  doneBy: string | null;
};

// Talks to /api/feedback and /api/admin/feedback (blazeroom api/).
export const createFeedbackApi = (
  getToken: () => string | null,
  fetchImpl: typeof fetch = (...args) => fetch(...args)
) => {
  const request = createApiRequest(getToken, fetchImpl);
  const itemPath = (id: string) => `/api/admin/feedback/${encodeURIComponent(id)}`;

  return {
    async send(feedback: NewFeedback): Promise<void> {
      await request('/api/feedback', 'POST', feedback);
    },
    async list(): Promise<FeedbackItem[]> {
      const res = await request('/api/admin/feedback', 'GET');
      return ((await res.json()) as { feedback: FeedbackItem[] }).feedback;
    },
    async setDone(id: string, done: boolean): Promise<void> {
      await request(`${itemPath(id)}/done`, 'POST', { done });
    },
    // Can't be undone: the screenshot is deleted from the server too.
    async remove(id: string): Promise<void> {
      await request(itemPath(id), 'DELETE');
    },
  };
};

export type ScreenshotProblem = 'not_image' | 'too_big';

export const checkScreenshot = (file: { type: string; size: number }): ScreenshotProblem | null => {
  if (!file.type.startsWith('image/')) return 'not_image';
  return file.size > MAX_SCREENSHOT_BYTES ? 'too_big' : null;
};

export const firstImage = (files: File[]): File | undefined =>
  files.find((file) => file.type.startsWith('image/'));

export const feedbackErrorMessage = (error: unknown): string => {
  if (!(error instanceof ApiError)) return tr('feedback.error_generic', 'Something went wrong.');
  switch (error.code) {
    case 'too_many':
      return tr('feedback.error_too_many', "You've sent a lot today. Try again tomorrow.");
    case 'not_found':
      return tr('feedback.error_not_found', 'That item no longer exists.');
    case 'network':
      return tr('feedback.error_network', "Couldn't reach the server.");
    default:
      return tr('feedback.error_code', 'Something went wrong ({{code}}).', { code: error.code });
  }
};
