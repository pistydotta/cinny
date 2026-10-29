import React, { ReactNode } from 'react';
import { Box } from 'folds';
import { Toaster } from '../../components/toast';
import { WordSwapEffect } from '../../features/word-swap/WordSwapEffect';
import { EncryptionSetup } from '../../features/encryption-setup/EncryptionSetup';
import { WhatsNew } from '../../features/whats-new/WhatsNew';

type ClientLayoutProps = {
  nav: ReactNode;
  children: ReactNode;
};
export function ClientLayout({ nav, children }: ClientLayoutProps) {
  return (
    <Box grow="Yes" direction="Column">
      {/* Before EncryptionSetup, so its prompt sits on top and is answered first. */}
      <WhatsNew />
      <EncryptionSetup />
      <Box grow="Yes">
        <Box shrink="No">{nav}</Box>
        <Box grow="Yes">{children}</Box>
        <Toaster />
        <WordSwapEffect />
      </Box>
    </Box>
  );
}
