import React, { useState } from 'react';
import classNames from 'classnames';
import { CallEmbed } from '../../plugins/call/CallEmbed';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { TipIconButton } from '../tooltips/TipIconButton';
import { tr } from '../translation/tr';
import { Face, useCallPeople } from './RoomPill';
import { Glyph, PEOPLE } from './Glyph';
import * as css from './styles.css';

// Faces the rail fits before the rest become a count.
const RAIL_FACES = 6;

type LivePeopleProps = {
  callEmbed: CallEmbed;
  open: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onShowAll: () => void;
};

// Who is in the call, while the people column is hidden: a column of faces over the share's
// right edge that shows only while the pointer is near that edge, so the share stays clear. The
// key under them brings the people column back.
export function LivePeople({ callEmbed, open, onEnter, onLeave, onShowAll }: LivePeopleProps) {
  const { room } = callEmbed;
  const mx = useMatrixClient();
  const { people: inCall, speakers } = useCallPeople(callEmbed);
  const people = inCall.length > 0 ? inCall : [mx.getSafeUserId()];
  const extra = people.length > RAIL_FACES ? people.length - (RAIL_FACES - 1) : 0;
  const railFaces = people.slice(0, extra ? RAIL_FACES - 1 : RAIL_FACES);
  const [hovered, setHovered] = useState(false);
  const shown = open || hovered;

  return (
    <div
      className={css.LivePeople}
      onPointerEnter={() => {
        setHovered(true);
        onEnter();
      }}
      onPointerLeave={() => {
        setHovered(false);
        onLeave();
      }}
    >
      <div className={classNames(css.LivePeopleRail, !shown && css.LivePeopleClosed)}>
        {railFaces.map((userId) => (
          <Face
            key={userId}
            room={room}
            userId={userId}
            speaking={speakers.has(userId)}
            small={false}
          />
        ))}
        {extra > 0 && <span className={css.LivePeopleMore}>+{extra}</span>}
        <TipIconButton
          label={tr('screen_share.show_people', 'Show people')}
          className={css.LivePeopleAll}
          variant="Secondary"
          fill="None"
          size="300"
          radii="Pill"
          onClick={onShowAll}
        >
          <Glyph d={PEOPLE} />
        </TipIconButton>
      </div>
    </div>
  );
}
