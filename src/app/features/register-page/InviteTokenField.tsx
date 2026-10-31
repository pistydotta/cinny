import React from 'react';
import { Box, Icon, Icons, Text, color, config } from 'folds';
import { tr } from '../translation/tr';

// The invite link fills the token in, so it shows as a locked value and not as a field to type in.
// The hidden input is what the form reads when it's submitted.
export function InviteTokenField({ token }: { token?: string }) {
  if (!token) {
    return (
      <Text size="T300" style={{ color: color.Critical.Main }}>
        {tr(
          'register.needs_invite',
          'Sign-up is by invite only. Ask the person who invited you for a link.'
        )}
      </Text>
    );
  }

  return (
    <Box direction="Column" gap="100">
      <Text size="L400" priority="300">
        {tr('register.token', 'Invite token')}
      </Text>
      <input type="hidden" name="tokenInput" value={token} />
      <Box
        alignItems="Center"
        gap="200"
        style={{
          padding: `${config.space.S300} ${config.space.S300}`,
          borderRadius: config.radii.R400,
          background: color.SurfaceVariant.Container,
          color: color.SurfaceVariant.OnContainer,
          cursor: 'default',
          userSelect: 'none',
        }}
      >
        <Icon size="100" src={Icons.Lock} filled />
        <Text size="T300" priority="300" truncate>
          {token}
        </Text>
      </Box>
      <Text size="T200" priority="300">
        {tr('register.token_hint', 'It came with your invite link. Nothing to do here.')}
      </Text>
    </Box>
  );
}
