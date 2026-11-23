import React, { ReactNode, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon, Icons } from 'folds';
import { tr } from '../translation/tr';
import * as css from './forgeDialog.css';

const FOCUSABLE =
  'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href], select:not(:disabled)';

export type ForgeDialogClassNames = { overlay?: string; panel?: string; close?: string };

// The app's dialog, over the whole window (a bottom sheet on phones). Escape or a click outside
// closes it, Tab stays inside, and focus goes back where it was. Games pass their own classes
// (games/ui/GameDialog.tsx).
export function ForgeDialog({
  title,
  onClose,
  size,
  classNames,
  children,
}: {
  title: string;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg';
  classNames?: ForgeDialogClassNames;
  children: ReactNode;
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    close.current?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);

  return createPortal(
    <div
      className={`${css.Overlay} ${classNames?.overlay ?? ''}`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        className={classNames?.panel ?? css.panel({ size })}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDownCapture={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            onClose();
          }
          if (event.key !== 'Tab') return;
          const focusable = panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
          if (!focusable?.length) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          }
          if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        <div className={css.Header}>
          <h2 id={titleId} className={css.Title}>
            {title}
          </h2>
          <button
            ref={close}
            type="button"
            className={classNames?.close ?? css.Close}
            onClick={onClose}
            aria-label={tr('common.close', 'Close')}
          >
            <Icon size="100" src={Icons.Cross} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
