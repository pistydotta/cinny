import { ApiError, createApiRequest } from '../../utils/blazeroomApi';
import { Kind, PlaybookItem, PlaybookMap, Point, Side, Technique } from './model';

export type ItemInput = {
  mapId: string;
  kind: Kind;
  side: Side;
  area: string;
  name: string;
  technique?: Technique | null;
  techniqueNote?: string | null;
  fromLabel?: string | null;
  note?: string | null;
  video: string;
  cover?: string | null;
  stand?: string | null;
  aim?: string | null;
  result?: string | null;
  from?: Point | null;
  to?: Point | null;
};

export type MediaType = 'video' | 'image';
export type MediaStatus = {
  id: string;
  type: MediaType;
  status: 'processing' | 'ready' | 'failed';
  reason: string | null;
};

export const createPlaybookApi = (getToken: () => string | null) => {
  const request = createApiRequest(getToken);
  const json = async <T>(path: string, method: string, body?: unknown): Promise<T> =>
    (await (await request(path, method, body)).json()) as T;

  // Files need the token, so they're fetched and shown from memory. One copy per id.
  const files = new Map<string, Promise<string>>();

  return {
    maps: () =>
      json<{ maps: PlaybookMap[]; canManage: boolean }>('/api/playbook/maps?game=cs2', 'GET'),
    addMap: (slug: string, name: string) =>
      json<PlaybookMap>('/api/playbook/maps?game=cs2', 'POST', { slug, name }),
    updateMap: (
      id: string,
      changes: Partial<Pick<PlaybookMap, 'name' | 'areas' | 'active' | 'radar'>>
    ) => json<PlaybookMap>(`/api/playbook/maps/${encodeURIComponent(id)}`, 'PATCH', changes),

    items: async (map: string) =>
      (
        await json<{ items: PlaybookItem[] }>(
          `/api/playbook/items?game=cs2&map=${encodeURIComponent(map)}`,
          'GET'
        )
      ).items,
    item: (id: string) =>
      json<PlaybookItem>(`/api/playbook/items/${encodeURIComponent(id)}`, 'GET'),
    create: (input: ItemInput) => json<PlaybookItem>('/api/playbook/items', 'POST', input),
    update: (id: string, input: ItemInput) =>
      json<PlaybookItem>(`/api/playbook/items/${encodeURIComponent(id)}`, 'PATCH', input),
    remove: async (id: string) => {
      await request(`/api/playbook/items/${encodeURIComponent(id)}`, 'DELETE');
    },

    // XHR rather than fetch, for the progress bar.
    upload: (file: File, onProgress: (fraction: number) => void) =>
      new Promise<MediaStatus>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/playbook/media');
        xhr.setRequestHeader('Authorization', `Bearer ${getToken() ?? ''}`);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
        xhr.onload = () => {
          let body: { error?: string } & Partial<MediaStatus> = {};
          try {
            body = JSON.parse(xhr.responseText);
          } catch {
            // empty or not JSON
          }
          if (xhr.status === 202) resolve(body as MediaStatus);
          else reject(new ApiError(body.error ?? 'unknown', xhr.status));
        };
        xhr.onerror = () => reject(new ApiError('network', 0));
        xhr.send(file);
      }),
    // The server downloads a YouTube link itself; it answers at once and works in the background.
    addLink: (url: string) => json<MediaStatus>('/api/playbook/media/link', 'POST', { url }),
    mediaStatus: (id: string) =>
      json<MediaStatus>(`/api/playbook/media/${encodeURIComponent(id)}`, 'GET'),
    // `poster` is the still the server took from a video.
    fileUrl(id: string, part: 'file' | 'poster' = 'file'): Promise<string> {
      const key = `${id}/${part}`;
      let url = files.get(key);
      if (!url) {
        url = request(`/api/playbook/media/${encodeURIComponent(id)}/${part}`, 'GET')
          .then((res) => res.blob())
          .then((blob) => URL.createObjectURL(blob));
        url.catch(() => files.delete(key));
        files.set(key, url);
      }
      return url;
    },
  };
};

export type PlaybookApi = ReturnType<typeof createPlaybookApi>;
