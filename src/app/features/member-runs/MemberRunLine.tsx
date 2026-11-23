import React, { ReactNode } from 'react';
import { Box, Icons, Text } from 'folds';
import { EventContent } from '../../components/message';
import { tr } from '../translation/tr';
import { memberRunSummary, MemberRunEntry } from './memberRun';
import * as css from './memberRuns.css';

// The one line a run of joins and leaves shows, with the button that opens it into its events.
export function MemberRunLine({
  messageLayout,
  time,
  entries,
  expanded,
  onToggle,
}: {
  messageLayout: number;
  time: ReactNode;
  entries: MemberRunEntry[];
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <EventContent
      messageLayout={messageLayout}
      time={time}
      iconSrc={Icons.User}
      content={
        <Box grow="Yes" direction="Column">
          <Text className={css.Summary} size="T300" priority="300">
            {memberRunSummary(entries).join(' · ')}
            <button
              type="button"
              className={css.Toggle}
              aria-expanded={expanded}
              onClick={onToggle}
            >
              {expanded
                ? tr('timeline.member_run.hide', 'Hide')
                : tr('timeline.member_run.show', 'Show {{count}}', { count: entries.length })}
            </button>
          </Text>
        </Box>
      }
    />
  );
}
