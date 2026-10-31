import { Descendant } from 'slate';
import { BlockType } from '../../components/editor/types';

export type SharedFile = { id: string; name: string; mime: string; size: number };
export type Share = { id: string; text?: string; files: SharedFile[] };
export type ShareRoom = { id: string; name: string; lastActive: number };

// Answered by the Android app itself, never reaching the server.
export const shareFileUrl = (origin: string, shareId: string, fileId: string): string =>
  `${origin}/__android_share/${shareId}/${fileId}`;

const isSharedFile = (file: unknown): file is SharedFile => {
  const f = file as SharedFile | null;
  return (
    typeof f?.id === 'string' &&
    typeof f.name === 'string' &&
    typeof f.mime === 'string' &&
    typeof f.size === 'number'
  );
};

export const parseShare = (message: Record<string, unknown>): Share | undefined => {
  const { id, text, files } = message;
  if (typeof id !== 'string' || !id) return undefined;
  const validFiles = Array.isArray(files) ? files.filter(isSharedFile) : [];
  const validText = typeof text === 'string' && text ? text : undefined;
  if (!validText && validFiles.length === 0) return undefined;
  return { id, text: validText, files: validFiles };
};

const normalized = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

export const matchingRooms = (rooms: ShareRoom[], query: string): ShareRoom[] => {
  const wanted = normalized(query.trim());
  return rooms
    .filter((room) => normalized(room.name).includes(wanted))
    .sort((a, b) => b.lastActive - a.lastActive);
};

export const textDraft = (text: string): Descendant[] => [
  { type: BlockType.Paragraph, children: [{ text }] },
];
