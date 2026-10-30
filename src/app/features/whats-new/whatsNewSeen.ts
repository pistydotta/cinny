import { useCallback } from 'react';
import { atom, useAtom } from 'jotai';
import { isDesktopApp } from '../desktop-download/desktopDownload';
import { hasUnseen, SEEN_KEY, WHATS_NEW } from './entries';

const readSeen = (): string | null => {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
};

const writeSeen = (id: string) => {
  try {
    localStorage.setItem(SEEN_KEY, id);
  } catch {
    // Without storage the dot just shows again next time.
  }
};

// Shared so the Home nav's dot goes away as soon as Visão geral marks the entries seen.
const seenAtom = atom<string | null>(readSeen());

export const useWhatsNewSeen = () => {
  const [seen, setSeen] = useAtom(seenAtom);

  const markSeen = useCallback(() => {
    const newest = WHATS_NEW[0]?.id;
    if (!newest) return;
    writeSeen(newest);
    setSeen(newest);
  }, [setSeen]);

  return { unseen: hasUnseen(WHATS_NEW, seen, isDesktopApp(navigator.userAgent)), markSeen };
};
