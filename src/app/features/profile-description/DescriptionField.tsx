import React, { FormEventHandler, useCallback, useEffect, useState } from 'react';
import { Box, Button, Input, Spinner, Text, color } from 'folds';
import { SettingTile } from '../../components/setting-tile';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { tr } from '../translation/tr';
import { DESCRIPTION_FIELD, MAX_DESCRIPTION_LENGTH, cleanDescription } from './profileDescription';
import { useUserDescription } from './useUserDescription';

export function DescriptionField({ userId }: { userId: string }) {
  const mx = useMatrixClient();
  const loaded = useUserDescription(userId);
  const [saved, setSaved] = useState<string>();
  const current = saved ?? loaded;
  const [value, setValue] = useState('');

  useEffect(() => {
    if (current !== undefined) setValue(current);
  }, [current]);

  const [saveState, save] = useAsyncCallback(
    useCallback(
      async (text: string) => {
        if (text) await mx.setExtendedProfileProperty(DESCRIPTION_FIELD, text);
        else await mx.deleteExtendedProfileProperty(DESCRIPTION_FIELD);
        setSaved(text);
      },
      [mx]
    )
  );
  const saving = saveState.status === AsyncStatus.Loading;
  const cleaned = cleanDescription(value);
  const hasChanges = current !== undefined && cleaned !== current;

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    if (hasChanges && !saving) save(cleaned);
  };

  return (
    <SettingTile
      title={
        <Text as="span" size="L400">
          {tr('profile_description.title', 'Description')}
        </Text>
      }
    >
      <Box direction="Column" grow="Yes" gap="100">
        <Box as="form" onSubmit={handleSubmit} gap="200">
          <Box grow="Yes" direction="Column">
            <Input
              value={value}
              onChange={(evt) => setValue(evt.currentTarget.value)}
              maxLength={MAX_DESCRIPTION_LENGTH}
              placeholder={tr('profile_description.placeholder', 'Shows on your profile card')}
              variant="Secondary"
              radii="300"
              readOnly={saving || current === undefined}
            />
          </Box>
          <Button
            size="400"
            variant={hasChanges ? 'Success' : 'Secondary'}
            fill={hasChanges ? 'Solid' : 'Soft'}
            outlined
            radii="300"
            disabled={!hasChanges || saving}
            type="submit"
          >
            {saving && <Spinner variant="Success" fill="Solid" size="300" />}
            <Text size="B400">{tr('profile_description.save', 'Save')}</Text>
          </Button>
        </Box>
        <Text size="T200" priority="300">
          {value.length}/{MAX_DESCRIPTION_LENGTH}
        </Text>
        {saveState.status === AsyncStatus.Error && (
          <Text size="T200" style={{ color: color.Critical.Main }}>
            {tr('profile_description.failed', 'Could not save it. Try again.')}
          </Text>
        )}
      </Box>
    </SettingTile>
  );
}
