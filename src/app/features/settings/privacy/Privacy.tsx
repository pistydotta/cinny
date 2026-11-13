import React from 'react';
import { SettingsPage } from '../SettingsPage';
import { ActivityPrivacy } from '../general';
import { IgnoredUserList } from '../account/IgnoredUserList';
import { DeviceSections } from '../devices';
import { tr } from '../../translation/tr';

type PrivacyProps = {
  requestClose: () => void;
};
export function Privacy({ requestClose }: PrivacyProps) {
  return (
    <SettingsPage
      title={tr('settings.tab.privacy', 'Privacy & security')}
      requestClose={requestClose}
    >
      <ActivityPrivacy />
      <IgnoredUserList />
      <DeviceSections />
    </SettingsPage>
  );
}
