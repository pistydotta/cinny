import React, {
  ChangeEventHandler,
  FormEventHandler,
  KeyboardEventHandler,
  MouseEventHandler,
  useEffect,
  useState,
} from 'react';
import dayjs from 'dayjs';
import {
  Box,
  Button,
  config,
  Header,
  Icon,
  IconButton,
  Icons,
  Input,
  Menu,
  MenuItem,
  PopOut,
  RectCords,
  Switch,
  Text,
  toRem,
} from 'folds';
import { isKeyHotkey } from 'is-hotkey';
import FocusTrap from 'focus-trap-react';
import { useSetting } from '../../../state/hooks/settings';
import { DateFormat, MessageLayout, MessageSpacing, settingsAtom } from '../../../state/settings';
import { SettingTile } from '../../../components/setting-tile';
import { ThemeModeSetting } from '../../forge-theme/ThemeModeSetting';
import { DividerMotionSetting } from '../../forge-theme/DividerMotionSetting';
import { KeySymbol } from '../../../utils/key-symbol';
import { isMacOS } from '../../../utils/user-agent';
import { stopPropagation } from '../../../utils/keyboard';
import { useMessageLayoutItems } from '../../../hooks/useMessageLayout';
import { useMessageSpacingItems } from '../../../hooks/useMessageSpacing';
import { useDateFormatItems } from '../../../hooks/useDateFormat';
import { SettingsPage, SettingsRow, SettingsSection } from '../SettingsPage';
import { SelfChatSetting } from '../../self-chat/SelfChatHiding';
import { LanguageSetting } from '../../translation/LanguageSetting';
import { TipIconButton } from '../../tooltips/TipIconButton';
import { tr } from '../../translation/tr';

function PageZoomInput() {
  const [pageZoom, setPageZoom] = useSetting(settingsAtom, 'pageZoom');
  const [currentZoom, setCurrentZoom] = useState(`${pageZoom}`);

  const handleZoomChange: ChangeEventHandler<HTMLInputElement> = (evt) => {
    setCurrentZoom(evt.target.value);
  };

  const handleZoomEnter: KeyboardEventHandler<HTMLInputElement> = (evt) => {
    if (isKeyHotkey('escape', evt)) {
      evt.stopPropagation();
      setCurrentZoom(pageZoom.toString());
    }
    if (
      isKeyHotkey('enter', evt) &&
      'value' in evt.target &&
      typeof evt.target.value === 'string'
    ) {
      const newZoom = parseInt(evt.target.value, 10);
      if (Number.isNaN(newZoom)) return;
      const safeZoom = Math.max(Math.min(newZoom, 150), 75);
      setPageZoom(safeZoom);
      setCurrentZoom(safeZoom.toString());
    }
  };

  return (
    <Input
      style={{ width: toRem(100) }}
      variant={pageZoom === parseInt(currentZoom, 10) ? 'Secondary' : 'Success'}
      size="300"
      radii="300"
      type="number"
      min="75"
      max="150"
      value={currentZoom}
      onChange={handleZoomChange}
      onKeyDown={handleZoomEnter}
      after={<Text size="T300">%</Text>}
      outlined
    />
  );
}

function Theme() {
  const [monochromeMode, setMonochromeMode] = useSetting(settingsAtom, 'monochromeMode');

  return (
    <SettingsSection
      title={tr('settings.section.theme', 'Theme')}
      description={tr('settings.about_section.theme', 'How blazeroom looks to you.')}
    >
      <SettingsRow>
        <ThemeModeSetting />
      </SettingsRow>
      <SettingsRow>
        <DividerMotionSetting />
      </SettingsRow>
      <SettingsRow>
        <SettingTile
          title={tr('settings.monochrome', 'Monochrome mode')}
          after={<Switch variant="Primary" value={monochromeMode} onChange={setMonochromeMode} />}
        />
      </SettingsRow>
      <SettingsRow>
        <SettingTile title={tr('settings.page_zoom', 'Page zoom')} after={<PageZoomInput />} />
      </SettingsRow>
    </SettingsSection>
  );
}

type DateHintProps = {
  hasChanges: boolean;
  handleReset: () => void;
};
function DateHint({ hasChanges, handleReset }: DateHintProps) {
  const [anchor, setAnchor] = useState<RectCords>();
  const categoryPadding = { padding: config.space.S200, paddingTop: 0 };

  const handleOpenMenu: MouseEventHandler<HTMLElement> = (evt) => {
    setAnchor(evt.currentTarget.getBoundingClientRect());
  };
  return (
    <PopOut
      anchor={anchor}
      position="Top"
      align="End"
      content={
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: () => setAnchor(undefined),
            clickOutsideDeactivates: true,
            escapeDeactivates: stopPropagation,
          }}
        >
          <Menu style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            <Header size="300" style={{ padding: `0 ${config.space.S200}` }}>
              <Text size="L400">Formatting</Text>
            </Header>

            <Box direction="Column">
              <Box style={categoryPadding} direction="Column">
                <Header size="300">
                  <Text size="L400">Year</Text>
                </Header>
                <Box direction="Column" tabIndex={0} gap="100">
                  <Text size="T300">
                    YY
                    <Text as="span" size="Inherit" priority="300">
                      {': '}
                      Two-digit year
                    </Text>{' '}
                  </Text>
                  <Text size="T300">
                    YYYY
                    <Text as="span" size="Inherit" priority="300">
                      {': '}Four-digit year
                    </Text>
                  </Text>
                </Box>
              </Box>

              <Box style={categoryPadding} direction="Column">
                <Header size="300">
                  <Text size="L400">Month</Text>
                </Header>
                <Box direction="Column" tabIndex={0} gap="100">
                  <Text size="T300">
                    M
                    <Text as="span" size="Inherit" priority="300">
                      {': '}The month
                    </Text>
                  </Text>
                  <Text size="T300">
                    MM
                    <Text as="span" size="Inherit" priority="300">
                      {': '}Two-digit month
                    </Text>{' '}
                  </Text>
                  <Text size="T300">
                    MMM
                    <Text as="span" size="Inherit" priority="300">
                      {': '}Short month name
                    </Text>
                  </Text>
                  <Text size="T300">
                    MMMM
                    <Text as="span" size="Inherit" priority="300">
                      {': '}Full month name
                    </Text>
                  </Text>
                </Box>
              </Box>

              <Box style={categoryPadding} direction="Column">
                <Header size="300">
                  <Text size="L400">Day of the Month</Text>
                </Header>
                <Box direction="Column" tabIndex={0} gap="100">
                  <Text size="T300">
                    D
                    <Text as="span" size="Inherit" priority="300">
                      {': '}Day of the month
                    </Text>
                  </Text>
                  <Text size="T300">
                    DD
                    <Text as="span" size="Inherit" priority="300">
                      {': '}Two-digit day of the month
                    </Text>
                  </Text>
                </Box>
              </Box>
              <Box style={categoryPadding} direction="Column">
                <Header size="300">
                  <Text size="L400">Day of the Week</Text>
                </Header>
                <Box direction="Column" tabIndex={0} gap="100">
                  <Text size="T300">
                    d
                    <Text as="span" size="Inherit" priority="300">
                      {': '}Day of the week (Sunday = 0)
                    </Text>
                  </Text>
                  <Text size="T300">
                    dd
                    <Text as="span" size="Inherit" priority="300">
                      {': '}Two-letter day name
                    </Text>
                  </Text>
                  <Text size="T300">
                    ddd
                    <Text as="span" size="Inherit" priority="300">
                      {': '}Short day name
                    </Text>
                  </Text>
                  <Text size="T300">
                    dddd
                    <Text as="span" size="Inherit" priority="300">
                      {': '}Full day name
                    </Text>
                  </Text>
                </Box>
              </Box>
            </Box>
          </Menu>
        </FocusTrap>
      }
    >
      {hasChanges ? (
        <IconButton
          tabIndex={-1}
          onClick={handleReset}
          type="reset"
          variant="Secondary"
          size="300"
          radii="300"
        >
          <Icon src={Icons.Cross} size="100" />
        </IconButton>
      ) : (
        <TipIconButton
          label={tr('tips.more', 'More options')}
          tabIndex={-1}
          onClick={handleOpenMenu}
          type="button"
          variant="Secondary"
          size="300"
          radii="300"
          aria-pressed={!!anchor}
        >
          <Icon style={{ opacity: config.opacity.P300 }} size="100" src={Icons.Info} />
        </TipIconButton>
      )}
    </PopOut>
  );
}

type CustomDateFormatProps = {
  value: string;
  onChange: (format: string) => void;
};
function CustomDateFormat({ value, onChange }: CustomDateFormatProps) {
  const [dateFormatCustom, setDateFormatCustom] = useState(value);

  useEffect(() => {
    setDateFormatCustom(value);
  }, [value]);

  const handleChange: ChangeEventHandler<HTMLInputElement> = (evt) => {
    const format = evt.currentTarget.value;
    setDateFormatCustom(format);
  };

  const handleReset = () => {
    setDateFormatCustom(value);
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();

    const target = evt.target as HTMLFormElement | undefined;
    const customDateFormatInput = target?.customDateFormatInput as HTMLInputElement | undefined;
    const format = customDateFormatInput?.value;
    if (!format) return;

    onChange(format);
  };

  const hasChanges = dateFormatCustom !== value;
  return (
    <SettingTile>
      <Box as="form" onSubmit={handleSubmit} gap="200">
        <Box grow="Yes" direction="Column">
          <Input
            required
            name="customDateFormatInput"
            value={dateFormatCustom}
            onChange={handleChange}
            maxLength={16}
            autoComplete="off"
            variant="Secondary"
            radii="300"
            style={{ paddingRight: config.space.S200 }}
            after={<DateHint hasChanges={hasChanges} handleReset={handleReset} />}
          />
        </Box>
        <Button
          size="400"
          variant={hasChanges ? 'Success' : 'Secondary'}
          fill={hasChanges ? 'Solid' : 'Soft'}
          outlined
          radii="300"
          disabled={!hasChanges}
          type="submit"
        >
          <Text size="B400">Save</Text>
        </Button>
      </Box>
    </SettingTile>
  );
}

type PresetDateFormatProps = {
  value: string;
  onChange: (format: string) => void;
};
function PresetDateFormat({ value, onChange }: PresetDateFormatProps) {
  const [menuCords, setMenuCords] = useState<RectCords>();
  const dateFormatItems = useDateFormatItems();

  const getDisplayDate = (format: string): string =>
    format !== '' ? dayjs().format(format) : 'Custom';

  const handleMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setMenuCords(evt.currentTarget.getBoundingClientRect());
  };

  const handleSelect = (format: DateFormat) => {
    onChange(format);
    setMenuCords(undefined);
  };

  return (
    <>
      <Button
        size="300"
        variant="Secondary"
        outlined
        fill="Soft"
        radii="300"
        after={<Icon size="300" src={Icons.ChevronBottom} />}
        onClick={handleMenu}
      >
        <Text size="T300">
          {getDisplayDate(dateFormatItems.find((i) => i.format === value)?.format ?? value)}
        </Text>
      </Button>
      <PopOut
        anchor={menuCords}
        offset={5}
        position="Bottom"
        align="End"
        content={
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: () => setMenuCords(undefined),
              clickOutsideDeactivates: true,
              isKeyForward: (evt: KeyboardEvent) =>
                evt.key === 'ArrowDown' || evt.key === 'ArrowRight',
              isKeyBackward: (evt: KeyboardEvent) =>
                evt.key === 'ArrowUp' || evt.key === 'ArrowLeft',
              escapeDeactivates: stopPropagation,
            }}
          >
            <Menu>
              <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
                {dateFormatItems.map((item) => (
                  <MenuItem
                    key={item.format}
                    size="300"
                    variant={value === item.format ? 'Primary' : 'Surface'}
                    radii="300"
                    onClick={() => handleSelect(item.format)}
                  >
                    <Text size="T300">{getDisplayDate(item.format)}</Text>
                  </MenuItem>
                ))}
              </Box>
            </Menu>
          </FocusTrap>
        }
      />
    </>
  );
}

function SelectDateFormat() {
  const [dateFormatString, setDateFormatString] = useSetting(settingsAtom, 'dateFormatString');
  const [selectedDateFormat, setSelectedDateFormat] = useState(dateFormatString);
  const customDateFormat = selectedDateFormat === '';

  const handlePresetChange = (format: string) => {
    setSelectedDateFormat(format);
    if (format !== '') {
      setDateFormatString(format);
    }
  };

  return (
    <>
      <SettingTile
        title={tr('settings.date_format', 'Date format')}
        description={customDateFormat ? dayjs().format(dateFormatString) : ''}
        after={<PresetDateFormat value={selectedDateFormat} onChange={handlePresetChange} />}
      />
      {customDateFormat && (
        <CustomDateFormat value={dateFormatString} onChange={setDateFormatString} />
      )}
    </>
  );
}

function DateAndTime() {
  const [hour24Clock, setHour24Clock] = useSetting(settingsAtom, 'hour24Clock');

  return (
    <SettingsSection
      title={tr('settings.section.date_time', 'Date & time')}
      description={tr('settings.about_section.date_time', 'How times and dates show in chats.')}
    >
      <SettingsRow>
        <SettingTile
          title={tr('settings.hour24', '24-hour clock')}
          after={<Switch variant="Primary" value={hour24Clock} onChange={setHour24Clock} />}
        />
      </SettingsRow>
      <SettingsRow>
        <SelectDateFormat />
      </SettingsRow>
    </SettingsSection>
  );
}

function Editor() {
  const [enterForNewline, setEnterForNewline] = useSetting(settingsAtom, 'enterForNewline');
  const [isMarkdown, setIsMarkdown] = useSetting(settingsAtom, 'isMarkdown');

  return (
    <SettingsSection
      title={tr('settings.section.editor', 'Editor')}
      description={tr('settings.about_section.editor', 'How you write and send messages.')}
    >
      <SettingsRow>
        <SettingTile
          title={tr('settings.enter_newline', 'Enter for a new line')}
          description={tr(
            'settings.enter_newline_description',
            '{{key}} + Enter sends the message and Enter starts a new line.',
            { key: isMacOS() ? KeySymbol.Command : 'Ctrl' }
          )}
          after={<Switch variant="Primary" value={enterForNewline} onChange={setEnterForNewline} />}
        />
      </SettingsRow>
      <SettingsRow>
        <SettingTile
          title={tr('settings.markdown', 'Markdown formatting')}
          after={<Switch variant="Primary" value={isMarkdown} onChange={setIsMarkdown} />}
        />
      </SettingsRow>
    </SettingsSection>
  );
}

export function ActivityPrivacy() {
  const [hideActivity, setHideActivity] = useSetting(settingsAtom, 'hideActivity');

  return (
    <SettingsSection
      title={tr('settings.section.privacy', 'Privacy')}
      description={tr('settings.about_section.privacy', 'What others see of your activity.')}
    >
      <SettingsRow>
        <SettingTile
          title={tr('settings.hide_activity', 'Hide typing and read receipts')}
          description={tr(
            'settings.hide_activity_description',
            "Others won't see when you're typing or what you've read."
          )}
          after={<Switch variant="Primary" value={hideActivity} onChange={setHideActivity} />}
        />
      </SettingsRow>
    </SettingsSection>
  );
}

function Calls() {
  const [noiseSuppression, setNoiseSuppression] = useSetting(settingsAtom, 'callNoiseSuppression');

  return (
    <SettingsSection
      title={tr('settings.section.microphone', 'Microphone')}
      description={tr(
        'settings.about_section.microphone',
        'How your voice reaches others in calls.'
      )}
    >
      <SettingsRow>
        <SettingTile
          title={tr('settings.noise_suppression', 'Noise suppression')}
          description={tr(
            'settings.noise_suppression_description',
            'Filter background noise like keyboards, fans and voices from your microphone (RNNoise). Applies from the next call you join.'
          )}
          after={
            <Switch variant="Primary" value={noiseSuppression} onChange={setNoiseSuppression} />
          }
        />
      </SettingsRow>
    </SettingsSection>
  );
}

function SelectMessageLayout() {
  const [menuCords, setMenuCords] = useState<RectCords>();
  const [messageLayout, setMessageLayout] = useSetting(settingsAtom, 'messageLayout');
  const messageLayoutItems = useMessageLayoutItems();

  const handleMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setMenuCords(evt.currentTarget.getBoundingClientRect());
  };

  const handleSelect = (layout: MessageLayout) => {
    setMessageLayout(layout);
    setMenuCords(undefined);
  };

  return (
    <>
      <Button
        size="300"
        variant="Secondary"
        outlined
        fill="Soft"
        radii="300"
        after={<Icon size="300" src={Icons.ChevronBottom} />}
        onClick={handleMenu}
      >
        <Text size="T300">
          {messageLayoutItems.find((i) => i.layout === messageLayout)?.name ?? messageLayout}
        </Text>
      </Button>
      <PopOut
        anchor={menuCords}
        offset={5}
        position="Bottom"
        align="End"
        content={
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: () => setMenuCords(undefined),
              clickOutsideDeactivates: true,
              isKeyForward: (evt: KeyboardEvent) =>
                evt.key === 'ArrowDown' || evt.key === 'ArrowRight',
              isKeyBackward: (evt: KeyboardEvent) =>
                evt.key === 'ArrowUp' || evt.key === 'ArrowLeft',
              escapeDeactivates: stopPropagation,
            }}
          >
            <Menu>
              <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
                {messageLayoutItems.map((item) => (
                  <MenuItem
                    key={item.layout}
                    size="300"
                    variant={messageLayout === item.layout ? 'Primary' : 'Surface'}
                    radii="300"
                    onClick={() => handleSelect(item.layout)}
                  >
                    <Text size="T300">{item.name}</Text>
                  </MenuItem>
                ))}
              </Box>
            </Menu>
          </FocusTrap>
        }
      />
    </>
  );
}

function SelectMessageSpacing() {
  const [menuCords, setMenuCords] = useState<RectCords>();
  const [messageSpacing, setMessageSpacing] = useSetting(settingsAtom, 'messageSpacing');
  const messageSpacingItems = useMessageSpacingItems();

  const handleMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setMenuCords(evt.currentTarget.getBoundingClientRect());
  };

  const handleSelect = (layout: MessageSpacing) => {
    setMessageSpacing(layout);
    setMenuCords(undefined);
  };

  return (
    <>
      <Button
        size="300"
        variant="Secondary"
        outlined
        fill="Soft"
        radii="300"
        after={<Icon size="300" src={Icons.ChevronBottom} />}
        onClick={handleMenu}
      >
        <Text size="T300">
          {messageSpacingItems.find((i) => i.spacing === messageSpacing)?.name ?? messageSpacing}
        </Text>
      </Button>
      <PopOut
        anchor={menuCords}
        offset={5}
        position="Bottom"
        align="End"
        content={
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: () => setMenuCords(undefined),
              clickOutsideDeactivates: true,
              isKeyForward: (evt: KeyboardEvent) =>
                evt.key === 'ArrowDown' || evt.key === 'ArrowRight',
              isKeyBackward: (evt: KeyboardEvent) =>
                evt.key === 'ArrowUp' || evt.key === 'ArrowLeft',
              escapeDeactivates: stopPropagation,
            }}
          >
            <Menu>
              <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
                {messageSpacingItems.map((item) => (
                  <MenuItem
                    key={item.spacing}
                    size="300"
                    variant={messageSpacing === item.spacing ? 'Primary' : 'Surface'}
                    radii="300"
                    onClick={() => handleSelect(item.spacing)}
                  >
                    <Text size="T300">{item.name}</Text>
                  </MenuItem>
                ))}
              </Box>
            </Menu>
          </FocusTrap>
        }
      />
    </>
  );
}

function MessageLook() {
  const [legacyUsernameColor, setLegacyUsernameColor] = useSetting(
    settingsAtom,
    'legacyUsernameColor'
  );
  const [twitterEmoji, setTwitterEmoji] = useSetting(settingsAtom, 'twitterEmoji');

  return (
    <SettingsSection
      title={tr('settings.section.messages', 'Messages')}
      description={tr('settings.about_section.messages', 'How messages look in chats.')}
    >
      <SettingsRow>
        <SettingTile
          title={tr('settings.message_layout', 'Message layout')}
          after={<SelectMessageLayout />}
        />
      </SettingsRow>
      <SettingsRow>
        <SettingTile
          title={tr('settings.message_spacing', 'Message spacing')}
          after={<SelectMessageSpacing />}
        />
      </SettingsRow>
      <SettingsRow>
        <SettingTile
          title={tr('settings.legacy_username_color', 'Legacy username colors')}
          after={
            <Switch
              variant="Primary"
              value={legacyUsernameColor}
              onChange={setLegacyUsernameColor}
            />
          }
        />
      </SettingsRow>
      <SettingsRow>
        <SettingTile
          title={tr('settings.twitter_emoji', 'Twitter emoji')}
          after={<Switch variant="Primary" value={twitterEmoji} onChange={setTwitterEmoji} />}
        />
      </SettingsRow>
    </SettingsSection>
  );
}

function Timeline() {
  const [hideMembershipEvents, setHideMembershipEvents] = useSetting(
    settingsAtom,
    'hideMembershipEvents'
  );
  const [hideNickAvatarEvents, setHideNickAvatarEvents] = useSetting(
    settingsAtom,
    'hideNickAvatarEvents'
  );
  const [mediaAutoLoad, setMediaAutoLoad] = useSetting(settingsAtom, 'mediaAutoLoad');
  const [urlPreview, setUrlPreview] = useSetting(settingsAtom, 'urlPreview');
  const [encUrlPreview, setEncUrlPreview] = useSetting(settingsAtom, 'encUrlPreview');

  return (
    <SettingsSection
      title={tr('settings.section.timeline', 'Timeline')}
      description={tr('settings.about_section.timeline', 'What shows up between messages.')}
    >
      <SettingsRow>
        <SettingTile
          title={tr('settings.hide_membership', 'Hide joins and leaves')}
          after={
            <Switch
              variant="Primary"
              value={hideMembershipEvents}
              onChange={setHideMembershipEvents}
            />
          }
        />
      </SettingsRow>
      <SettingsRow>
        <SettingTile
          title={tr('settings.hide_profile_changes', 'Hide name and avatar changes')}
          after={
            <Switch
              variant="Primary"
              value={hideNickAvatarEvents}
              onChange={setHideNickAvatarEvents}
            />
          }
        />
      </SettingsRow>
      <SettingsRow>
        <SettingTile
          title={tr('settings.media_autoload', 'Load media automatically')}
          after={<Switch variant="Primary" value={mediaAutoLoad} onChange={setMediaAutoLoad} />}
        />
      </SettingsRow>
      <SettingsRow>
        <SettingTile
          title={tr('settings.url_preview', 'Link previews')}
          after={<Switch variant="Primary" value={urlPreview} onChange={setUrlPreview} />}
        />
      </SettingsRow>
      <SettingsRow>
        <SettingTile
          title={tr('settings.enc_url_preview', 'Link previews in encrypted chats')}
          after={<Switch variant="Primary" value={encUrlPreview} onChange={setEncUrlPreview} />}
        />
      </SettingsRow>
    </SettingsSection>
  );
}

export function HiddenEventsSetting() {
  const [showHiddenEvents, setShowHiddenEvents] = useSetting(settingsAtom, 'showHiddenEvents');

  return (
    <SettingsRow>
      <SettingTile
        title={tr('settings.hidden_events', 'Show hidden events')}
        description={tr(
          'settings.hidden_events_description',
          'Show technical events in the timeline, like room changes the app normally hides.'
        )}
        after={<Switch variant="Primary" value={showHiddenEvents} onChange={setShowHiddenEvents} />}
      />
    </SettingsRow>
  );
}

type PageProps = {
  requestClose: () => void;
};

export function AppearanceSettings({ requestClose }: PageProps) {
  return (
    <SettingsPage title={tr('settings.tab.appearance', 'Appearance')} requestClose={requestClose}>
      <LanguageSetting />
      <DateAndTime />
      <Theme />
      <MessageLook />
    </SettingsPage>
  );
}

export function ChatSettings({ requestClose }: PageProps) {
  return (
    <SettingsPage title={tr('settings.tab.chats', 'Chats')} requestClose={requestClose}>
      <Editor />
      <Timeline />
      <SelfChatSetting />
    </SettingsPage>
  );
}

export function VoiceSettings({ requestClose }: PageProps) {
  return (
    <SettingsPage title={tr('settings.tab.voice', 'Voice & video')} requestClose={requestClose}>
      <Calls />
    </SettingsPage>
  );
}
