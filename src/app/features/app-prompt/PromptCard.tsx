import React, { ReactNode } from 'react';
import { ToastCard } from '../../components/toast';

// A card in the toast stack, above the composer row, that leaves the page usable.
export function PromptCard({ text, children }: { text: ReactNode; children: ReactNode }) {
  return <ToastCard text={text} actions={children} />;
}
