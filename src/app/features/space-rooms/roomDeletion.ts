import { ApiRequest } from '../../utils/blazeroomApi';

const pause = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 1500);
  });

export async function deleteServerRoom(
  request: ApiRequest,
  spaceId: string,
  roomId: string,
  wait = pause,
  maxAttempts = 120
): Promise<void> {
  const path = `/api/spaces/${encodeURIComponent(spaceId)}/rooms/${encodeURIComponent(roomId)}`;
  const poll = async (remaining: number): Promise<void> => {
    const response = await request(path, 'DELETE', { confirmRoomId: roomId });
    if (response.status === 204) return;
    if (response.status !== 202 || remaining <= 1) throw new Error('deletion pending');
    await wait();
    await poll(remaining - 1);
  };
  await poll(maxAttempts);
}
