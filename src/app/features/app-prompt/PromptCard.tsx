import React, { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Box, Text, color, config, toRem } from 'folds';

// A small card at the bottom of the screen that leaves the page usable.
export function PromptCard({ text, children }: { text: ReactNode; children: ReactNode }) {
  return createPortal(
    <Box
      justifyContent="Center"
      style={{
        position: 'fixed',
        left: config.space.S400,
        right: config.space.S400,
        bottom: config.space.S500,
        zIndex: 9998,
        pointerEvents: 'none',
      }}
    >
      <Box
        role="status"
        alignItems="Center"
        wrap="Wrap"
        gap="300"
        style={{
          pointerEvents: 'auto',
          maxWidth: toRem(480),
          padding: `${config.space.S200} ${config.space.S200} ${config.space.S200} ${config.space.S400}`,
          borderRadius: config.radii.R400,
          background: color.Surface.Container,
          color: color.Surface.OnContainer,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
        }}
      >
        <Box grow="Yes">
          <Text size="T300">{text}</Text>
        </Box>
        <Box alignItems="Center" gap="200">
          {children}
        </Box>
      </Box>
    </Box>,
    document.body
  );
}
