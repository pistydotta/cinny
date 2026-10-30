import { describe, expect, it, vi } from 'vitest';
import {
  FeedbackItem,
  MAX_SCREENSHOT_BYTES,
  checkScreenshot,
  createFeedbackApi,
  feedbackErrorMessage,
  firstImage,
  splitFeedback,
} from './feedbackApi';
import { ApiError } from '../../utils/blazeroomApi';

const respond = (status: number, body?: unknown) =>
  vi
    .fn()
    .mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status }));

describe('createFeedbackApi', () => {
  it('sends feedback with our token', async () => {
    const fetchImpl = respond(201, { id: '1' });
    const feedback = { type: 'bug' as const, body: 'It broke', screenshotUrl: 'mxc://a/b' };
    await createFeedbackApi(() => 'tok', fetchImpl).send(feedback);

    const [path, init] = fetchImpl.mock.calls[0];
    expect(path).toBe('/api/feedback');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body)).toEqual(feedback);
  });

  it('lists feedback for admins', async () => {
    const items = [{ id: '1', body: 'x' }];
    const fetchImpl = respond(200, { feedback: items });
    expect(await createFeedbackApi(() => 'tok', fetchImpl).list()).toEqual(items);
    expect(fetchImpl.mock.calls[0][0]).toBe('/api/admin/feedback');
  });

  it('marks feedback done', async () => {
    const fetchImpl = respond(200, { done: true });
    await createFeedbackApi(() => 'tok', fetchImpl).setDone('7', true);
    const [path, init] = fetchImpl.mock.calls[0];
    expect(path).toBe('/api/admin/feedback/7/done');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ done: true });
  });

  it('deletes feedback', async () => {
    const fetchImpl = respond(204);
    await createFeedbackApi(() => 'tok', fetchImpl).remove('7');
    const [path, init] = fetchImpl.mock.calls[0];
    expect(path).toBe('/api/admin/feedback/7');
    expect(init.method).toBe('DELETE');
  });

  it('rejects with the code the API sent', async () => {
    const api = createFeedbackApi(() => 'tok', respond(429, { error: 'too_many' }));
    await expect(api.send({ type: 'bug', body: 'x' })).rejects.toMatchObject({ code: 'too_many' });
  });
});

describe('checkScreenshot', () => {
  it('takes an image of up to 10 MB', () => {
    expect(checkScreenshot({ type: 'image/png', size: MAX_SCREENSHOT_BYTES })).toBeNull();
  });

  it('refuses a bigger image', () => {
    expect(checkScreenshot({ type: 'image/png', size: MAX_SCREENSHOT_BYTES + 1 })).toBe('too_big');
  });

  it('refuses anything else', () => {
    expect(checkScreenshot({ type: 'text/plain', size: 1 })).toBe('not_image');
  });
});

describe('firstImage', () => {
  const text = new File(['x'], 'a.txt', { type: 'text/plain' });
  const image = new File(['x'], 'a.png', { type: 'image/png' });

  it('picks the image out of what was pasted', () => {
    expect(firstImage([text, image])).toBe(image);
  });

  it('finds nothing when no image was pasted', () => {
    expect(firstImage([text])).toBeUndefined();
    expect(firstImage([])).toBeUndefined();
  });
});

describe('feedbackErrorMessage', () => {
  it('gives each failure its own message', () => {
    const messages = [
      new ApiError('too_many', 429),
      new ApiError('network', 0),
      new ApiError('not_found', 404),
      new Error('boom'),
    ].map(feedbackErrorMessage);
    expect(new Set(messages).size).toBe(4);
  });
});

describe('splitFeedback', () => {
  const item = (id: string, doneAt: string | null) => ({ id, doneAt } as FeedbackItem);

  it('separates open from done and keeps the order', () => {
    const { open, done } = splitFeedback([
      item('4', null),
      item('3', '2026-10-30'),
      item('2', null),
      item('1', '2026-10-29'),
    ]);
    expect(open.map((f) => f.id)).toEqual(['4', '2']);
    expect(done.map((f) => f.id)).toEqual(['3', '1']);
  });
});
