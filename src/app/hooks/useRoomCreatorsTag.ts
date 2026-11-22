import { useMemo } from 'react';
import { MemberPowerTag } from '../../types/matrix/room';
import { tr } from '../features/translation/tr';

const DEFAULT_TAG: MemberPowerTag = {
  name: 'Founder',
  color: '#0000ff',
};

export const useRoomCreatorsTag = (): MemberPowerTag =>
  useMemo(() => ({ ...DEFAULT_TAG, name: tr('power_tags.founder', 'Founder') }), []);
