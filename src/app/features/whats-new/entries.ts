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
    id: '2026-11-poker-invites',
    items: () => [
      {
        title: tr('whats_new.poker_invites_title', 'Better poker invites'),
        body: tr(
          'whats_new.poker_invites_body',
          'When inviting to a table you can search by name, select everyone at once or just who is in your call, and see who is already at the table or invited. The owner can make the table public, so anyone can join from the lobby, and let members invite anyone on the server.'
        ),
      },
    ],
  },
  {
    id: '2026-11-fodinha-table',
    items: () => [
      {
        title: tr('whats_new.fodinha_table_title', 'Fodinha has a real table'),
        body: tr(
          'whats_new.fodinha_table_body',
          'Fodinha now plays on an oval table like poker, with new rules: the Truco deck with vira and manilha, suits breaking ties, the one-card round on your forehead, and rounds that go up to the most cards possible and back down. Running out of time now plays for you instead of knocking you out.'
        ),
      },
    ],
  },
  {
    id: '2026-11-floating-call-drag',
    items: () => [
      {
        title: tr('whats_new.floating_call_title', 'Move the call window'),
        body: tr(
          'whats_new.floating_call_body',
          'The small call window that shows up outside the call can now be dragged by its top bar to anywhere on the screen, and it stays there. Double-click the bar to put it back in the corner, or close it with the X.'
        ),
      },
    ],
  },
  {
    id: '2026-11-voice-audio-status',
    items: () => [
      {
        title: tr('call_status.news_title', 'Call status at a glance'),
        body: tr(
          'call_status.news_body',
          'Muted microphones and call audio off now show beside voice-room members. Click someone for cleaner controls and a compact volume slider.'
        ),
      },
    ],
  },
  {
    id: '2026-11-owner-room-controls',
    items: () => [
      {
        title: tr('room_delete.news_title', 'Server room controls'),
        body: tr(
          'room_delete.news_body',
          'Server owners can delete rooms for everyone with confirmation. When creating a room, turn encryption off if you need webhooks.'
        ),
      },
    ],
  },
  {
    id: '2026-11-superadmin-webhooks',
    items: () => [
      {
        title: tr('webhooks.news_title', 'Incoming webhooks'),
        body: tr(
          'webhooks.news_body',
          'Superadmins can create webhook URLs in Admin to send text and links from external tools into a server chat.'
        ),
      },
    ],
  },
  {
    id: '2026-11-private-music-dock',
    items: () => [
      {
        title: tr('music_bot.scope_news_title', 'Music in your corner'),
        body: tr(
          'music_bot.scope_news_body',
          'The player is at the bottom of the sidebar. Listen privately or share with your current call. Joining or switching rooms never shares your music automatically.'
        ),
      },
    ],
  },
  {
    id: '2026-11-call-member-card',
    items: () => [
      {
        title: tr('call_member.news_title', 'Volume per person in calls'),
        body: tr(
          'call_member.news_body',
          'Click someone under a voice room to mute them or change their volume just for you, or open their profile.'
        ),
      },
    ],
  },
  {
    id: '2026-11-screen-share-watch',
    items: () => [
      {
        title: tr('screen_share.watch_news_title', 'Screen sharing stays with you'),
        body: tr(
          'screen_share.watch_news_body',
          'Screen-share cards sit beside the participants. A floating viewer follows you while browsing and can be hidden to the bottom bar. Sharers can adjust outgoing PC audio, and the sidebar expands to participant names and audio controls.'
        ),
      },
    ],
  },
  {
    id: '2026-11-truco-fodinha-chess',
    items: () => [
      {
        title: tr('table_games.news_title', 'Truco, Fodinha and chess'),
        body: tr(
          'table_games.news_body',
          'Create Truco and elimination Fodinha tables with a fixed stake from your card-game wallet. Chess has its own free section, with live tables you can watch and comment on.'
        ),
      },
    ],
  },
  {
    id: '2026-11-music-chat',
    items: () => [
      {
        title: tr('music_bot.news_title', 'Music from chat'),
        body: tr(
          'music_bot.news_body',
          'Request music with /play or the controls in the call’s chat. See the queue, pause, skip and adjust your volume. Download failures and blocked audio now show an explanation.'
        ),
      },
    ],
  },
  {
    id: '2026-11-card-game-credits',
    items: () => [
      {
        title: tr('game_categories_news.title', 'Card games and idle RPG, separated'),
        body: tr(
          'game_categories_news.body',
          'The Games tab now separates card games from the idle RPG, with direct access to each game. Credits are shared only between card games; Ember Chronicles keeps its own gold.'
        ),
      },
    ],
  },
  {
    id: '2026-11-poker-controls',
    items: () => [
      {
        title: tr('poker_controls.news.title', 'Poker, easier to follow'),
        body: tr(
          'poker_controls.news.body',
          'Optional poker sounds and volume, queued actions and fold now, betting in chips or BB, and a visual guide to your best five cards and poker hand rankings.'
        ),
      },
    ],
  },
  {
    id: '2026-11-idle-rework',
    items: () => [
      {
        title: tr('whats_new.idle_rework_title', 'Ember Chronicles, rebuilt'),
        body: tr(
          'whats_new.idle_rework_body',
          'Six classes with two specializations each, a talent tree, a forge up to +12, rebirth with an altar of eternal bonuses, a big backpack with categories and comparisons, and new battle effects. Heroes from the first test start over.'
        ),
      },
    ],
  },
  {
    id: '2026-11-screen-share',
    items: () => [
      {
        title: tr('whats_new.screen_share_title', 'Screen share improvements'),
        body: tr(
          'whats_new.screen_share_body',
          "Now a share only opens for whoever clicks Watch, with its own volume, and whoever shares can see they're live and turn off the PC sound."
        ),
      },
    ],
  },
  {
    id: '2026-11-idle-rpg',
    items: () => [
      {
        title: tr('whats_new.idle_title', 'New game: Ember Chronicles'),
        body: tr(
          'whats_new.idle_body',
          'An idle RPG in the Games tab. Pick one of 10 classes, collect gear, arrange your backpack and climb stages, even with the app on another screen. There is an arena for duels too.'
        ),
      },
    ],
  },
  {
    id: '2026-11-music-bot',
    items: () => [
      {
        title: tr('whats_new.music_bot_title', 'A music bot in calls'),
        body: tr(
          'whats_new.music_bot_body',
          "In a call, paste a YouTube, Spotify, SoundCloud or other link (or just the song's name) in the bot's bar, or type /play in the room's chat. Everyone in the call listens together, each at their own volume."
        ),
      },
    ],
  },
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

// The card shows this many items, so it stays short.
export const MAX_SHOWN = 5;

// The id of the newest entry this browser has seen.
export const SEEN_KEY = 'blazeroom.whatsNewSeen';

const visible = (item: WhatsNewItem, inDesktopApp: boolean): boolean =>
  !(inDesktopApp && item.hideInDesktopApp);

// The newest MAX_SHOWN items the Novidades card shows, leaving out the ones hidden here.
export const shownItems = (entries: WhatsNewEntry[], inDesktopApp: boolean): WhatsNewItem[] =>
  entries
    .flatMap((entry) => entry.items())
    .filter((item) => visible(item, inDesktopApp))
    .slice(0, MAX_SHOWN);

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
