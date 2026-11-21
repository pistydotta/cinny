import { useEffect, useState } from 'react';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { createPlaybookApi, PlaybookApi } from './api';

// One client for the whole app, so a file fetched once is shown again from memory.
let client: ReturnType<typeof useMatrixClient> | undefined;
const api = createPlaybookApi(() => client?.getAccessToken() ?? null);

export const usePlaybookApi = (): PlaybookApi => {
  client = useMatrixClient();
  return api;
};

// A blob URL for an uploaded file, or undefined while it loads (or if it can't).
export const useFileUrl = (
  from: PlaybookApi,
  id: string | null | undefined,
  part: 'file' | 'poster' = 'file'
): string | undefined => {
  const [url, setUrl] = useState<{ id: string; url: string }>();
  useEffect(() => {
    if (!id) return undefined;
    let live = true;
    from.fileUrl(id, part).then(
      (u) => live && setUrl({ id, url: u }),
      () => undefined
    );
    return () => {
      live = false;
    };
  }, [from, id, part]);
  return id && url?.id === id ? url.url : undefined;
};
