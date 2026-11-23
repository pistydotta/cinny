import React, { useCallback, useEffect } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { Icon, IconButton, Icons } from 'folds';
import { TOAST_DURATION_MS, Toast, removeToast, toastsAtom } from './toast';
import { ToastCard } from './ToastCard';
import * as css from './toast.css';
import { tr } from '../../features/translation/tr';

function ToastItem({ toast }: { toast: Toast }) {
  const setToasts = useSetAtom(toastsAtom);
  const onDismiss = useCallback(
    () => setToasts((list) => removeToast(list, toast.id)),
    [setToasts, toast.id]
  );

  useEffect(() => {
    const id = window.setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => window.clearTimeout(id);
  }, [onDismiss]);

  return (
    <ToastCard
      icon={
        <Icon
          className={css.Tone[toast.variant]}
          size="100"
          src={toast.variant === 'Success' ? Icons.Check : Icons.Warning}
        />
      }
      text={toast.message}
      actions={
        <IconButton
          size="300"
          radii="300"
          variant="Surface"
          fill="None"
          onClick={onDismiss}
          aria-label={tr('common.close', 'Close')}
        >
          <Icon size="50" src={Icons.Cross} />
        </IconButton>
      }
    />
  );
}

// Mount once; toasts go in the shared stack (ToastCard), above every overlay.
export function Toaster() {
  const toasts = useAtomValue(toastsAtom);
  return (
    <>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </>
  );
}
