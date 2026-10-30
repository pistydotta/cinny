import { EncryptionStep } from '../encryption-setup/encryptionStep';

export type WelcomeItem = 'protect' | 'verify' | 'windows' | 'language';

// The lines of the welcome card on Visão geral, in order. Each one disappears once it no
// longer applies, so the card shrinks to what's left to do.
export const welcomeItems = ({
  encryptionStep,
  canDownloadDesktop,
}: {
  encryptionStep: EncryptionStep;
  canDownloadDesktop: boolean;
}): WelcomeItem[] => {
  const items: WelcomeItem[] = [];
  if (encryptionStep === 'create') items.push('protect');
  if (encryptionStep === 'unlock') items.push('verify');
  if (canDownloadDesktop) items.push('windows');
  items.push('language');
  return items;
};
