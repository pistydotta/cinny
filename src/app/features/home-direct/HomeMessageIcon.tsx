import React from 'react';
import { Icons } from 'folds';

// Home and Direct messages are one sidebar tab, so its icon is both: the house with a speech
// bubble over its corner. The mask leaves a gap between them so both read at sidebar size.
export function HomeMessageIcon(filled?: boolean) {
  return (
    <>
      <mask id="home-message-cut">
        <rect width="24" height="24" fill="white" />
        <rect x="11" y="11.5" width="13" height="12.5" fill="black" />
      </mask>
      <g mask="url(#home-message-cut)">
        <g transform="translate(-0.4 -0.6) scale(0.8)">{Icons.Home(filled)}</g>
      </g>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
        d={
          filled
            ? 'M12.5 13H23.5V23.5L20.5 21.5H12.5V13Z'
            : 'M12.5 13H23.5V23.5L20.5 21.5H12.5V13ZM13.7 14.2V20.3H20.9L22.3 21.2V14.2H13.7Z'
        }
      />
    </>
  );
}
