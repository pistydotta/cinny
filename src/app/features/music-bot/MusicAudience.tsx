import React from 'react';
import { Icon, Icons } from 'folds';
import { tr } from '../translation/tr';
import * as css from './musicBot.css';

export function MusicAudience({
  shared,
  roomName,
  disabled,
  onToggle,
}: {
  shared: boolean;
  roomName?: string;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`${css.Scope} ${shared ? css.ScopeShared : ''}`}>
      <div className={css.ScopeStatus} role="status">
        <Icon size="100" src={shared ? Icons.VolumeHigh : Icons.Headphone} />
        <div className={css.ScopeInfo}>
          <strong className={css.ScopeTitle}>
            {shared
              ? tr('music_bot.audience_shared', 'Sharing with {{name}}', { name: roomName ?? '' })
              : tr('music_bot.audience_private', 'Only you can hear')}
          </strong>
          <span className={css.ScopeHint}>
            {shared
              ? tr('music_bot.audience_shared_hint', 'Music is shared in this voice room.')
              : tr('music_bot.audience_private_hint', 'Your music stays private, even in a call.')}
          </span>
        </div>
      </div>
      {roomName && (
        <button type="button" className={css.ScopeButton} disabled={disabled} onClick={onToggle}>
          {shared
            ? tr('music_bot.audience_back', 'Switch to only me')
            : tr('music_bot.audience_share', 'Share with {{name}}', { name: roomName })}
        </button>
      )}
    </div>
  );
}
