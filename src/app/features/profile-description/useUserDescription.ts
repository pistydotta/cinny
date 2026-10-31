import { useEffect, useState } from 'react';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { DESCRIPTION_FIELD, cleanDescription } from './profileDescription';

// Undefined until it loads, and if it can't. getExtendedProfile because the SDK's single-field call
// answers from a cache, which would keep showing someone's old description.
export const useUserDescription = (userId: string): string | undefined => {
  const mx = useMatrixClient();
  const [description, setDescription] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    setDescription(undefined);
    mx.getExtendedProfile(userId)
      .then((profile: Record<string, unknown>) => {
        if (!cancelled) setDescription(cleanDescription(profile[DESCRIPTION_FIELD]));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [mx, userId]);

  return description;
};
