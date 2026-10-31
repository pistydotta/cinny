import React from 'react';
import { Text } from 'folds';
import { BreakWord } from '../../styles/Text.css';
import { useUserDescription } from './useUserDescription';

export function UserDescription({ userId }: { userId: string }) {
  const description = useUserDescription(userId);
  if (!description) return null;

  return (
    <Text size="T300" className={BreakWord}>
      {description}
    </Text>
  );
}
