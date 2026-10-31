import { tr } from '../translation/tr';

export type WhatsNewItem = {
  title: string;
  body: string;
  // News about the Windows app means nothing to someone already using it.
  hideInDesktopApp?: boolean;
};

export type WhatsNewEntry = {
  // Saved as the newest entry someone has seen, so never change one once it shipped.
  id: string;
  items: () => WhatsNewItem[];
};

// Newest first. Add an entry when you ship something people should know about: it shows in
// the Novidades card on Visão geral, and Visão geral gets a dot in the Home nav until opened.
export const WHATS_NEW: WhatsNewEntry[] = [
  {
    id: '2026-11-always-joined-pins',
    items: () => [
      {
        title: tr('whats_new.always_joined_title', 'Public rooms are always there'),
        body: tr(
          'whats_new.always_joined_body',
          'Everyone in a server is in its public rooms, with nothing to join. Only private rooms can be left.'
        ),
      },
      {
        title: tr('whats_new.pinned_chats_title', 'Pin your chats'),
        body: tr(
          'whats_new.pinned_chats_body',
          "Open a chat's menu in Direct Messages and choose Pin to top to keep it first in the list."
        ),
      },
    ],
  },
  {
    id: '2026-11-self-chat-about',
    items: () => [
      {
        title: tr('whats_new.self_chat_title', 'Chat with yourself'),
        body: tr(
          'whats_new.self_chat_body',
          'Everyone now has a chat with themselves in Direct messages, with their own name and photo, that nobody else can read. And the new i icon in the sidebar says what blazeroom is.'
        ),
      },
    ],
  },
  {
    id: '2026-11-profile-call',
    items: () => [
      {
        title: tr('whats_new.profile_call_title', 'Profile description and visible calls'),
        body: tr(
          'whats_new.profile_call_body',
          'Write a description in Settings > Account: it shows on your profile card. And a sound icon on a server or on Home tells you when a call is going on.'
        ),
      },
    ],
  },
  {
    id: '2026-11-android',
    items: () => [
      {
        title: tr('whats_new.android_title', 'App for Android'),
        body: tr(
          'whats_new.android_body',
          'Blazeroom now has an Android app, with notifications, calls that ring on a locked phone and sharing from other apps. Download it in Available apps, on the phone.'
        ),
      },
    ],
  },
  {
    id: '2026-11-poker-server',
    items: () => [
      {
        title: tr('whats_new.poker_server_title', 'Poker: credits restarted, private tables'),
        body: tr(
          'whats_new.poker_server_body',
          'Everyone’s credits restarted at 5,000. Tables are now private: only the people you invite can join, by friend or by link. Create one in the Games tab.'
        ),
      },
    ],
  },
  {
    id: '2026-11-poker',
    items: () => [
      {
        title: tr('whats_new.poker_title', 'Games: poker with friends'),
        body: tr(
          'whats_new.poker_body',
          'There is a new Games tab in the sidebar. Everyone gets 5,000 coins to play Texas Hold’em with friends, or to practice against bots.'
        ),
      },
    ],
  },
  {
    id: '2026-10-push',
    items: () => [
      {
        title: tr('whats_new.push_title', 'Notifications with the app closed'),
        body: tr(
          'whats_new.push_body',
          'You can now get notified of messages even when blazeroom is closed. Each device turns it on by itself in Settings > Notifications.'
        ),
        hideInDesktopApp: true,
      },
    ],
  },
  {
    id: '2026-10-feedback',
    items: () => [
      {
        title: tr('whats_new.feedback_title', 'Help & feedback'),
        body: tr(
          'whats_new.feedback_body',
          'You can now send bug reports and ideas from the app, with a screenshot if you want. Find it in Settings > Help & feedback.'
        ),
      },
    ],
  },
  {
    id: '2026-10-windows-app',
    items: () => [
      {
        title: tr('whats_new.windows_title', 'blazeroom for Windows'),
        body: tr(
          'whats_new.windows_body',
          'blazeroom now has a Windows app, so you can use it without the browser. On a Windows computer, download it from this page.'
        ),
        hideInDesktopApp: true,
      },
    ],
  },
  {
    id: '2026-10-portuguese',
    items: () => [
      {
        title: tr('whats_new.portuguese_title', 'blazeroom in Portuguese'),
        body: tr(
          'whats_new.portuguese_body',
          'The app is now in Portuguese. To switch to English, open User Settings (your avatar, bottom left) > General > Language.'
        ),
      },
      {
        title: tr('whats_new.fixes_title', 'General fixes'),
        body: tr(
          'whats_new.fixes_body',
          'Bug fixes and small improvements, like the profile card no longer closing when you use the Invite to server menu.'
        ),
      },
    ],
  },
];

// The card shows this many entries, so it stays short.
export const MAX_SHOWN = 3;

// The id of the newest entry this browser has seen.
export const SEEN_KEY = 'blazeroom.whatsNewSeen';

const visible = (item: WhatsNewItem, inDesktopApp: boolean): boolean =>
  !(inDesktopApp && item.hideInDesktopApp);

// The items the Novidades card shows, from the newest MAX_SHOWN entries.
export const shownItems = (entries: WhatsNewEntry[], inDesktopApp: boolean): WhatsNewItem[] =>
  entries
    .slice(0, MAX_SHOWN)
    .flatMap((entry) => entry.items())
    .filter((item) => visible(item, inDesktopApp));

// Whether an entry newer than the last seen one has something to show here.
export const hasUnseen = (
  entries: WhatsNewEntry[],
  lastSeenId: string | null,
  inDesktopApp = false
): boolean => {
  const seenIndex = lastSeenId ? entries.findIndex((entry) => entry.id === lastSeenId) : -1;
  const newer = seenIndex === -1 ? entries : entries.slice(0, seenIndex);
  return newer.some((entry) => entry.items().some((item) => visible(item, inDesktopApp)));
};
