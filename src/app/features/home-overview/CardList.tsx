import React, { Children, ReactNode } from 'react';
import { Box, config } from 'folds';
import { SequenceCard } from '../../components/sequence-card';
import { SequenceCardStyle } from '../settings/styles.css';

// Each item in its own card, with a thin gap between them, the way the settings screens
// separate their rows.
export function CardList({ children }: { children: ReactNode }) {
  return (
    <Box direction="Column" gap="100">
      {Children.map(children, (child) => (
        <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
          {child}
        </SequenceCard>
      ))}
    </Box>
  );
}

// A row title a step stronger than its description, so each item's start is easy to find.
export function ItemTitle({ children }: { children: ReactNode }) {
  return <span style={{ fontWeight: config.fontWeight.W500 }}>{children}</span>;
}
