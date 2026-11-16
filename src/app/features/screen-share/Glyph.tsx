import React from 'react';

// Line icons folds doesn't have, drawn like its own: 24 grid, round 2px strokes.
export function Glyph({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

export const PEOPLE =
  'M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6M20 19v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.6a3 3 0 0 1 0 5.8';
export const ENTER_FULL = 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5';
export const EXIT_FULL = 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5';
// A round speech bubble with two lines of text.
export const CHAT = 'M7.9 20A9 9 0 1 0 4 16.1L2 22ZM8 10h8M8 14h5';
// Back to the call room: a window with an arrow out of its corner.
export const RETURN_TO_CALL =
  'M14 4h6v6M20 4l-8 8M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4';
