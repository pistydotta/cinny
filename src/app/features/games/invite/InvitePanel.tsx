import React, { useState } from 'react';
import { tr } from '../../translation/tr';
import { InvitePicker } from './InvitePicker';
import type { TableStatus } from './inviteCandidates';
import * as css from '../poker/pokerPage.css';

type InvitePanelProps = {
  /** Anyone on the server can be picked, not only friends. */
  everyone: boolean;
  /** Who is already at the table or invited; never selectable. */
  status: ReadonlyMap<string, TableStatus>;
  /** Stores the invites; the invited see the table in their lobby and on the games page. */
  onInvite: (userIds: string[]) => Promise<unknown>;
  /** The table's join link, made the first time someone asks for it. */
  getLink: () => Promise<string>;
  /** Turns a failed request into the sentence shown under the buttons. */
  describeError: (e: unknown) => string;
  disabled?: boolean;
  hint?: string;
};

/** How every game invites: pick people (friends, my call, the directory) or copy the table's link. */
export function InvitePanel({
  everyone,
  status,
  onInvite,
  getLink,
  describeError,
  disabled,
  hint,
}: InvitePanelProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  // Shown when the browser refuses the clipboard, so the link can still be copied by hand.
  const [shownLink, setShownLink] = useState<string>();
  const [error, setError] = useState<string>();

  const task = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(undefined);
    try {
      await fn();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const invite = () =>
    task(async () => {
      await onInvite(selected);
      setSelected([]);
    });

  const copy = () =>
    task(async () => {
      const link = await getLink();
      try {
        await navigator.clipboard.writeText(link);
      } catch {
        setShownLink(link);
        return;
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });

  return (
    <div className={css.Field}>
      <InvitePicker
        everyone={everyone}
        status={status}
        selected={selected}
        onChange={setSelected}
      />
      {error && <p className={css.ErrorText}>{error}</p>}
      <button
        type="button"
        className={css.PrimaryButton}
        disabled={busy || disabled || selected.length === 0}
        onClick={invite}
      >
        {tr('games.invite.send', 'Invite {{count}}', { count: selected.length })}
      </button>
      <button
        type="button"
        className={css.SecondaryButton}
        disabled={busy || disabled}
        onClick={copy}
      >
        {copied
          ? tr('games.invite.link_copied', 'Link copied')
          : tr('games.invite.copy_link', 'Copy invite link')}
      </button>
      {shownLink && (
        <input
          className={css.TextInput}
          readOnly
          value={shownLink}
          aria-label={tr('games.invite.link_label', 'Invite link')}
          onFocus={(e) => e.target.select()}
        />
      )}
      {hint && <p className={css.Note}>{hint}</p>}
    </div>
  );
}
