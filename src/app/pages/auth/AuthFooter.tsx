import React from 'react';
import { Box, Text } from 'folds';
import * as css from './styles.css';
import { sourceUrl } from '../../features/source/sourceUrl';
import { tr } from '../../features/translation/tr';

export function AuthFooter() {
  return (
    <Box className={css.AuthFooter} justifyContent="Center" gap="400" wrap="Wrap">
      <Text as="a" size="T300" href={sourceUrl} target="_blank" rel="noreferrer">
        {tr('welcome.source_code', 'Source code')}
      </Text>
      <Text as="a" size="T300" href="https://matrix.org" target="_blank" rel="noreferrer">
        {tr('welcome.powered_by_matrix', 'Powered by Matrix')}
      </Text>
    </Box>
  );
}
