import React from 'react';
import { tr } from '../translation/tr';
import * as css from './live.css';

// A call or a share happening now, after a room's or a person's name.
export function LivePill() {
  return (
    <span className={css.LivePill}>
      <span className={css.LiveDot} aria-hidden />
      {tr('nav.live', 'Live')}
    </span>
  );
}
