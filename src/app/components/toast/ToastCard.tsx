import React, { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Text } from 'folds';
import * as css from './toast.css';

// The one fixed stack every toast and corner card goes in, made on first use.
const toastLayer = (): HTMLElement => {
  const existing = document.getElementById('forge-toasts');
  if (existing) return existing;
  const layer = document.createElement('div');
  layer.id = 'forge-toasts';
  layer.className = css.Stack;
  document.body.appendChild(layer);
  return layer;
};

// A card in the toast stack: a short text, an optional icon before it and actions after it.
export function ToastCard({
  icon,
  text,
  actions,
}: {
  icon?: ReactNode;
  text: ReactNode;
  actions?: ReactNode;
}) {
  return createPortal(
    <div className={css.Card} role="status">
      {icon}
      <div className={css.Text}>
        <Text size="T300">{text}</Text>
      </div>
      {actions && <div className={css.Actions}>{actions}</div>}
    </div>,
    toastLayer()
  );
}
