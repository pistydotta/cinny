import { useMatch } from 'react-router-dom';
import { getGamesPath } from '../../pages/pathUtils';

export const useGamesSelected = (): boolean => {
  const match = useMatch({
    path: getGamesPath(),
    caseSensitive: true,
    end: false,
  });

  return !!match;
};
