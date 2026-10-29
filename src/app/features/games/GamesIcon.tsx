import React from 'react';
import { IconSrc } from 'folds';

const BODY =
  'M7.5 6h9A5.5 5.5 0 0 1 22 11.5v3a3.5 3.5 0 0 1-6.3 2.1L14.5 15h-5l-1.2 1.6A3.5 3.5 0 0 1 2 14.5v-3A5.5 5.5 0 0 1 7.5 6Z';
const CONTROLS =
  'M6.75 9.25h1.5v1.5h1.5v1.5h-1.5v1.5h-1.5v-1.5h-1.5v-1.5h1.5ZM16.5 9.25a1 1 0 1 1 0 2a1 1 0 1 1 0-2ZM18.25 11.75a1 1 0 1 1 0 2a1 1 0 1 1 0-2Z';

/** Game controller icon in the folds icon format. */
export function GamesIcon(filled?: boolean): ReturnType<IconSrc> {
  return filled ? (
    <path fillRule="evenodd" clipRule="evenodd" d={`${BODY}${CONTROLS}`} fill="currentColor" />
  ) : (
    <>
      <path d={BODY} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d={CONTROLS} fill="currentColor" />
    </>
  );
}
