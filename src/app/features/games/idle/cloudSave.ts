import { ApiError, createApiRequest } from '../../../utils/blazeroomApi';

// The save on the server (blazeroom API, /api/idle/save), so a hero follows the player across
// devices. The game still runs here and still keeps a copy in localStorage, which also covers
// the time offline; the server copy is the one that decides on the next load.
//
// Every write names the revision it was based on. When another device wrote since, the server
// says `conflict` and sends its copy: that device is the one playing, so this one stops and
// waits for the player to say "play here".

export type RemoteSave = {
  save: string | null;
  revision: number;
  device: string | null;
  updatedAt: string | null;
};

export type PutResult = { ok: true; revision: number } | { ok: false; conflict: RemoteSave };

export const createIdleSaveApi = (
  getToken: () => string | null,
  fetchImpl: typeof fetch = (...args) => fetch(...args)
) => {
  const request = createApiRequest(getToken, fetchImpl);
  return {
    async get(): Promise<RemoteSave> {
      return (await (await request('/api/idle/save', 'GET')).json()) as RemoteSave;
    },
    /** Rejects with ApiError on anything but success or a conflict. */
    async put(save: string, baseRevision: number, device: string): Promise<PutResult> {
      try {
        const res = await request('/api/idle/save', 'PUT', { save, baseRevision, device });
        return { ok: true, revision: ((await res.json()) as { revision: number }).revision };
      } catch (e) {
        if (e instanceof ApiError && e.code === 'conflict' && e.status === 409) {
          // createApiRequest drops the body; ask for what's there now.
          return { ok: false, conflict: await this.get() };
        }
        throw e;
      }
    },
    async remove(): Promise<void> {
      await request('/api/idle/save', 'DELETE');
    },
  };
};

export type IdleSaveApi = ReturnType<typeof createIdleSaveApi>;

export type SaveChoice =
  /** Keep playing the local save and send it up. */
  | 'local'
  /** Take the server's save: another device played since this one last synced. */
  | 'remote'
  /** Neither exists. */
  | 'none';

/**
 * Which save to play on load. `localRevision` is the server revision this browser last wrote or
 * read (0: never synced). If the server is still at it, nobody else wrote, so the local copy
 * is the same game with maybe more progress. If the server moved on, another device played
 * after us and its save wins.
 */
export const pickSave = (
  hasLocal: boolean,
  localRevision: number,
  remote: Pick<RemoteSave, 'save' | 'revision'>
): SaveChoice => {
  const hasRemote = remote.save !== null && remote.revision > 0;
  if (!hasRemote) return hasLocal ? 'local' : 'none';
  if (!hasLocal) return 'remote';
  return remote.revision === localRevision ? 'local' : 'remote';
};

/** A rough name for this device, shown to the other one ("playing on Android"). */
export const deviceLabel = (userAgent: string): string => {
  if (/Android/i.test(userAgent)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iPhone';
  if (/Windows/i.test(userAgent)) return 'Windows';
  if (/Macintosh|Mac OS/i.test(userAgent)) return 'Mac';
  if (/Linux/i.test(userAgent)) return 'Linux';
  return 'web';
};
