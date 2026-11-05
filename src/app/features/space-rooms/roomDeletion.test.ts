import { expect, it, vi } from 'vitest';
import { deleteServerRoom } from './roomDeletion';

it('waits for confirmed completion and reuses the same destination and confirmation', async () => {
  const request = vi
    .fn()
    .mockResolvedValueOnce(new Response(null, { status: 202 }))
    .mockResolvedValueOnce(new Response(null, { status: 204 }));
  const wait = vi.fn().mockResolvedValue(undefined);
  await deleteServerRoom(request, '!s:test', '!r:test', wait);
  expect(request.mock.calls).toEqual([
    ['/api/spaces/!s%3Atest/rooms/!r%3Atest', 'DELETE', { confirmRoomId: '!r:test' }],
    ['/api/spaces/!s%3Atest/rooms/!r%3Atest', 'DELETE', { confirmRoomId: '!r:test' }],
  ]);
  expect(wait).toHaveBeenCalledTimes(1);
});

it('reports a refused or stalled deletion without claiming success or polling forever', async () => {
  const wait = vi.fn().mockResolvedValue(undefined);
  const refused = vi.fn().mockRejectedValue(new Error('owner required'));
  await expect(deleteServerRoom(refused, '!s:test', '!r:test', wait)).rejects.toThrow(
    'owner required'
  );
  expect(wait).not.toHaveBeenCalled();
  const pending = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
  await expect(deleteServerRoom(pending, '!s:test', '!r:test', wait, 2)).rejects.toThrow(
    'deletion pending'
  );
  expect(pending).toHaveBeenCalledTimes(2);
});
