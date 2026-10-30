import { EncryptionStep } from '../encryption-setup/encryptionStep';

export type WelcomeItem = 'protect' | 'verify' | 'language';

// The lines of the welcome card on Visão geral, in order. Each one disappears once it no
// longer applies, so the card shrinks to what's left to do.
export const welcomeItems = ({
  encryptionStep,
}: {
  encryptionStep: EncryptionStep;
}): WelcomeItem[] => {
  const items: WelcomeItem[] = [];
  if (encryptionStep === 'create') items.push('protect');
  if (encryptionStep === 'unlock') items.push('verify');
  items.push('language');
  return items;
};
