import React from 'react';
import { Icon, Icons } from 'folds';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { mxcUrlToHttp } from '../../../utils/matrix';
import { UserAvatar } from '../../../components/user-avatar';
import { StackedAvatar } from '../../../components/stacked-avatar';
import * as css from './peopleStack.css';

// The faces of the people at a table, overlapping, with "+n" past `max`.
export function PeopleStack({ userIds, max = 4 }: { userIds: string[]; max?: number }) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const shown = userIds.slice(0, max);
  const more = userIds.length - shown.length;

  return (
    <span className={css.Stack}>
      {shown.map((userId) => {
        const user = mx.getUser(userId);
        const name = user?.displayName ?? userId.replace(/^@|:.*$/g, '');
        const src = user?.avatarUrl
          ? mxcUrlToHttp(mx, user.avatarUrl, useAuthentication, 64, 64, 'crop') ?? undefined
          : undefined;
        return (
          <StackedAvatar
            key={userId}
            className={css.Face}
            title={name}
            variant="SurfaceVariant"
            size="200"
            radii="Pill"
          >
            <UserAvatar
              userId={userId}
              src={src}
              alt={name}
              renderFallback={() => <Icon size="50" src={Icons.User} filled />}
            />
          </StackedAvatar>
        );
      })}
      {more > 0 && <span className={css.More}>+{more}</span>}
    </span>
  );
}
