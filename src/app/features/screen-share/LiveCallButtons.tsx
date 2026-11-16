import React, { ReactNode, useCallback } from 'react';
import { Button, Icon, Icons, Spinner, Text } from 'folds';
import { useAtom } from 'jotai';
import classNames from 'classnames';
import { CallEmbed, useCallControlState } from '../../plugins/call';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { callChatAtom } from '../../state/callEmbed';
import { TipIconButton } from '../tooltips/TipIconButton';
import { AudioMenuArrow } from '../call-audio-settings';
import { CHAT, Glyph } from './Glyph';
import { tr } from '../translation/tr';
import * as css from './styles.css';

type LiveCallButtonsProps = {
  callEmbed: CallEmbed;
  // Width of the watched share: narrow shares drop the extras first.
  width: number;
  // The device and ⋮ menus open outside the fullscreen box, where they can't be seen.
  fullscreen: boolean;
  // Float under the picture when the tile leaves room there, else over its bottom edge.
  below: number | null;
  // The call's bar when nothing is watched: the same row, in the page's flow.
  docked?: boolean;
  // Faded out while the pointer rests over the picture it covers.
  asleep?: boolean;
  // The watched share's own sound, kept at the right end of the row.
  children?: ReactNode;
};

// The call's own buttons while a share is watched: bare icons centred on the share's bottom edge,
// in place of the call bar under it. Leaving is the one solid shape.
export function LiveCallButtons({
  callEmbed,
  width,
  fullscreen,
  below,
  docked,
  asleep,
  children,
}: LiveCallButtonsProps) {
  const { microphone, video, sound, screenshare } = useCallControlState(callEmbed.control);
  const [chat, setChat] = useAtom(callChatAtom);
  const [micState, toggleMic] = useAsyncCallback(
    useCallback(() => callEmbed.control.toggleMicrophone(), [callEmbed])
  );
  const [videoState, toggleVideo] = useAsyncCallback(
    useCallback(() => callEmbed.control.toggleVideo(), [callEmbed])
  );
  const [hangupState, hangup] = useAsyncCallback(
    useCallback(() => callEmbed.hangup(), [callEmbed])
  );
  const exiting =
    hangupState.status === AsyncStatus.Loading || hangupState.status === AsyncStatus.Success;

  const menus = !fullscreen && width >= 520;
  const leaveLabel = width >= 400;

  return (
    <div
      className={classNames(
        css.LiveCall,
        docked && css.LiveCallDocked,
        !docked && below !== null && css.LiveCallBelow,
        asleep && css.LiveAsleep
      )}
      // Low in the free space, near the call's bottom edge, not glued to the picture.
      style={
        !docked && below !== null ? { top: `calc(100% + ${Math.max(8, below - 56)}px)` } : undefined
      }
    >
      <div className={css.LiveCallCenter}>
        <div className={css.LiveCallGroup}>
          <TipIconButton
            label={microphone ? 'Turn Off Microphone' : 'Turn On Microphone'}
            className={classNames(css.LiveChipButton, !microphone && css.LiveOff)}
            variant="Secondary"
            fill="None"
            size="400"
            radii="300"
            onClick={toggleMic}
            disabled={micState.status === AsyncStatus.Loading}
          >
            <Icon size="400" src={microphone ? Icons.Mic : Icons.MicMute} filled={!microphone} />
          </TipIconButton>
          {menus && <AudioMenuArrow kind="input" className={css.LiveArrow} />}
          <TipIconButton
            label={sound ? 'Turn Off Sound' : 'Turn On Sound'}
            className={classNames(css.LiveChipButton, !sound && css.LiveOff)}
            variant="Secondary"
            fill="None"
            size="400"
            radii="300"
            onClick={() => callEmbed.control.toggleSound()}
          >
            <Icon size="400" src={sound ? Icons.Headphone : Icons.HeadphoneMute} filled={!sound} />
          </TipIconButton>
          {menus && <AudioMenuArrow kind="output" className={css.LiveArrow} />}
        </div>
        <div className={css.LiveCallGroup}>
          <TipIconButton
            label={video ? 'Stop Camera' : 'Start Camera'}
            className={css.LiveChipButton}
            variant="Secondary"
            fill="None"
            size="400"
            radii="300"
            onClick={toggleVideo}
            disabled={videoState.status === AsyncStatus.Loading}
          >
            <Icon
              size="400"
              src={video ? Icons.VideoCamera : Icons.VideoCameraMute}
              filled={video}
            />
          </TipIconButton>
          <TipIconButton
            label={screenshare ? 'Stop Screenshare' : 'Start Screenshare'}
            className={classNames(css.LiveChipButton, screenshare && css.LiveOn)}
            variant="Secondary"
            fill="None"
            size="400"
            radii="300"
            onClick={() => callEmbed.control.toggleScreenshare()}
          >
            <Icon size="400" src={Icons.ScreenShare} filled={screenshare} />
          </TipIconButton>
        </div>
        {width >= 440 && <span className={css.LiveCallDivider} />}
        <div className={css.LiveCallGroup}>
          <TipIconButton
            label={chat ? 'Close Chat' : 'Open Chat'}
            className={classNames(css.LiveChipButton, chat && css.LiveOn)}
            variant="Secondary"
            fill="None"
            size="400"
            radii="300"
            onClick={() => setChat(!chat)}
          >
            <Glyph d={CHAT} size={22} />
          </TipIconButton>
          {width >= 440 && (
            <TipIconButton
              label={tr('screen_share.reactions', 'Reactions')}
              className={css.LiveChipButton}
              variant="Secondary"
              fill="None"
              size="400"
              radii="300"
              onClick={() => callEmbed.control.toggleReactions()}
            >
              <Icon size="400" src={Icons.Smile} />
            </TipIconButton>
          )}
        </div>
        <Button
          className={css.LiveLeave}
          variant="Critical"
          fill="Solid"
          size="400"
          radii="300"
          onClick={hangup}
          disabled={exiting}
          aria-label={tr('screen_share.leave_call', 'Leave call')}
          before={
            exiting ? (
              <Spinner variant="Critical" fill="Solid" size="200" />
            ) : (
              <Icon src={Icons.PhoneDown} size="200" filled />
            )
          }
        >
          {leaveLabel && <Text size="B400">{tr('screen_share.leave', 'Leave')}</Text>}
        </Button>
      </div>
      {children}
    </div>
  );
}
