import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { createPokerApi } from './api';
import { newerView, parseSse } from './tableStream';
import type { PlayReply, TableView } from './types';

export const BACKOFF_MS = [1000, 2000, 4000, 8000, 15000];

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      window.clearTimeout(timer);
      resolve();
    });
  });

export const useTable = (
  tableId: string
): {
  view?: TableView;
  connected: boolean;
  closed: boolean;
  notFound: boolean;
  api: ReturnType<typeof createPokerApi>;
} => {
  const mx = useMatrixClient();
  const [view, setView] = useState<TableView>();
  const [connected, setConnected] = useState(false);
  const [closed, setClosed] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const applyReply = useCallback((reply: PlayReply) => {
    if ('closed' in reply) setClosed(true);
    else setView((current) => newerView(current, reply));
  }, []);

  const api = useMemo(
    () => createPokerApi(() => mx.getAccessToken(), { onPlay: applyReply }),
    [mx, applyReply]
  );

  useEffect(() => {
    const abort = new AbortController();
    const { signal } = abort;
    setView(undefined);
    setConnected(false);
    setClosed(false);
    setNotFound(false);

    // Resolves when the stream ends; false means it must not be reopened.
    const readStream = async (onOpen: () => void): Promise<boolean> => {
      const res = await fetch(`/api/poker/tables/${encodeURIComponent(tableId)}/stream`, {
        headers: { Authorization: `Bearer ${mx.getAccessToken() ?? ''}` },
        signal,
      });
      if (res.status === 401) return false;
      if (res.status === 404) {
        setNotFound(true);
        return false;
      }
      // Anything else, a 503 while the server shuts down included, is a drop like any other.
      if (!res.ok || !res.body) return true;

      onOpen();
      setConnected(true);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const pump = async (): Promise<boolean> => {
        const { done, value } = await reader.read();
        if (done) return true;
        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSse(buffer);
        buffer = parsed.rest;
        parsed.events.forEach((sse) => {
          if (sse.event !== 'message') return;
          const incoming = JSON.parse(sse.data) as TableView;
          setView((current) => newerView(current, incoming));
        });
        if (parsed.events.some((sse) => sse.event === 'closed')) {
          setClosed(true);
          return false;
        }
        return pump();
      };
      return pump();
    };

    const run = async (attempt: number): Promise<void> => {
      let next = attempt;
      try {
        const again = await readStream(() => {
          next = 0;
        });
        if (!again) return;
      } catch {
        // A dropped connection, or a frame we couldn't read: reconnect.
      }
      if (signal.aborted) return;
      setConnected(false);
      await wait(BACKOFF_MS[Math.min(next, BACKOFF_MS.length - 1)], signal);
      if (!signal.aborted) await run(next + 1);
    };
    run(0);

    return () => abort.abort();
  }, [mx, tableId]);

  return { view, connected, closed, notFound, api };
};
