import React from 'react';
import { Link } from 'react-router-dom';
import { Text } from 'folds';
import { getHomeFeedbackPath } from '../../pages/pathUtils';
import { tr } from '../translation/tr';

// The one place the feedback feature jokes. The struck-through words are the joke, so they're
// dimmed but still readable.
export function JokeLine() {
  return (
    <Text size="T200" priority="300">
      {tr(
        'feedback.joke_start',
        'If you found any bugs or have possible improvements to be made you can feel free to'
      )}{' '}
      <s style={{ opacity: 0.5 }}>{tr('feedback.joke_struck', 'go fuck yourself')}</s>{' '}
      <Link to={getHomeFeedbackPath()}>{tr('feedback.joke_link', 'send them here')}</Link>
      {tr('feedback.joke_end', '')}
    </Text>
  );
}
