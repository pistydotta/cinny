import { useMemo } from 'react';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { createFeedbackApi } from './feedbackApi';

export const useFeedbackApi = () => {
  const mx = useMatrixClient();
  return useMemo(() => createFeedbackApi(() => mx.getAccessToken()), [mx]);
};
