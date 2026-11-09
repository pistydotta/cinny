import React from 'react';
import { Icon, Icons, Text } from 'folds';
import { CallEmbed } from '../../plugins/call/CallEmbed';
import { useCallSpeakers } from '../../hooks/useCallSpeakers';
import { useCallJoined } from '../../hooks/useCallEmbed';
import { useRoomName } from '../../hooks/useRoomMeta';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { tr } from '../translation/tr';
import { useShares } from '../screen-share/useShares';
import { SpeakerWaves } from '../screen-share/SpeakerWaves';
import { useCallSpaceName } from '../screen-share/useCallSpaceName';
import * as css from './styles.css';

// The call's room as one pill beside the call buttons: a green speaker that says you are in
// it (its waves ripple while anyone talks, a green dot pulses on it for the whole call) and
// the room, whose name opens it. While the
// floating card is folded away the pill grows an
// up arrow, the reverse of the card's down arrow, that brings the card back; it sits right
// under where the card opens.
export function CallPresence({
  callEmbed,
  viewer,
}: {
  callEmbed: CallEmbed;
  viewer?: { hidden: boolean; onShow: () => void };
}) {
  const { room } = callEmbed;
  const name = useRoomName(room);
  const space = useCallSpaceName(room);
  const talking = useCallSpeakers(callEmbed).size > 0;
  const live = useShares(callEmbed.control).remotes.length;
  const { navigateRoom } = useRoomNavigate();
  const folded = !!viewer?.hidden;
  const joined = useCallJoined(callEmbed);

  const show = tr('screen_share.show_card', 'Show call card');
  const showLabel =
    live > 0
      ? tr('screen_share.show_viewer_live', '{{label}} · {{count}} live', {
          label: show,
          count: live,
        })
      : show;

  const goLabel = tr('screen_share.go_to_room', 'Go to {{room}}', { room: name });

  // Only the room's name goes to the room (it underlines on hover). Folded, the rest of the pill
  // opens the card, which has its own Go; keyboards reach the same through the two buttons.
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className={css.CallPill({ folded })}
      onClick={folded ? viewer?.onShow : undefined}
      title={folded ? showLabel : undefined}
    >
      <span className={css.PillSpeaker}>
        <SpeakerWaves talking={talking} inCall size={18} />
        {joined && <span className={css.OnlineDot} />}
      </span>
      <Text as="span" size="L400" truncate>
        <button
          type="button"
          className={css.PillName}
          onClick={(evt) => {
            evt.stopPropagation();
            navigateRoom(room.roomId);
          }}
          title={goLabel}
        >
          {name}
        </button>
        {space && <span className={css.PillSpace}> · {space}</span>}
      </Text>
      {folded && viewer && (
        <button
          type="button"
          className={css.PillRestore}
          onClick={(evt) => {
            evt.stopPropagation();
            viewer.onShow();
          }}
          aria-label={showLabel}
        >
          <Icon size="100" src={Icons.ChevronTop} />
          {live > 0 && <span className={css.PillLiveDot} />}
        </button>
      )}
    </div>
  );
}
