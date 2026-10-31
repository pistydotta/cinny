import React from 'react';
import { Text } from 'folds';
import { tr } from '../translation/tr';

// Someone arriving from an invite link may never have heard of this site.
export function RegisterIntro() {
  return (
    <Text size="T300" priority="400">
      {tr(
        'register.intro',
        'Blazeroom is a private Discord-style chat for people who got an invite. It is free, and all you need is a username and a password.'
      )}
    </Text>
  );
}
