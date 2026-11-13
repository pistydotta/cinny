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
    id: '2026-11-call-audio-menu',
    items: () => [
      {
        title: tr('whats_new.call_audio_title', 'Microphone and sound, straight from the call'),
        body: tr(
          'whats_new.call_audio_body',
          'The little arrow beside the mic and headphone buttons picks your microphone and speaker and sets how loud you go out and how loud the call plays. Your choice stays on this device and every call starts with it. Everything is also in Settings > Voice & video.'
        ),
      },
    ],
  },
  {
    id: '2026-11-brazilianbonk-map',
    items: () => [
      {
        title: tr(
          'whats_new.horde_map_title',
          'BrazilianBonk: a new, bigger map with real terrain'
        ),
        body: tr(
          'whats_new.horde_map_body',
          'The map is three times bigger and changes every run: mesas with cliffs and ramps, ledges to jump onto, pillars and mountains all around. Blessing totems on the high tops can be rare or epic, chests around the map open for gold (each one dearer) and a minimap in the corner shows where everything is.'
        ),
      },
    ],
  },
  {
    id: '2026-11-brazilianbonk-art',
    items: () => [
      {
        title: tr(
          'whats_new.horde_art_title',
          'BrazilianBonk: pixel-art icons and a sky that falls into night'
        ),
        body: tr(
          'whats_new.horde_art_body',
          'Weapons, Boletos, abilities and upgrades have their own pixel-art icons. Each run starts at sunset and ends deep in the night, and the sky turns red while a boss is alive. The game also has its own cover in the Games tab.'
        ),
      },
    ],
  },
  {
    id: '2026-11-brazilianbonk-replays',
    items: () => [
      {
        title: tr('whats_new.horde_replays_title', 'BrazilianBonk: replays and a checked ranking'),
        body: tr(
          'whats_new.horde_replays_body',
          "Every run now records its commands, and the server plays it again to check the result: checked runs get a ✓ in the ranking, and the ▶ next to them lets you watch anyone's run. Picked-up runs also rank once their replay checks out. Gold earned per day now has a limit."
        ),
      },
    ],
  },
  {
    id: '2026-11-brazilianbonk-robust',
    items: () => [
      {
        title: tr('whats_new.horde_robust_title', 'BrazilianBonk: runs are no longer lost'),
        body: tr(
          'whats_new.horde_robust_body',
          'If the page reloads, you click a notification or the phone closes the app, the run is kept and you can continue it from the menu (picked-up runs pay gold as usual but stay out of the ranking). There is also a graphics quality option, automatic by default, vibration when hit on phones, and tips on your first run.'
        ),
      },
    ],
  },
  {
    id: '2026-11-brazilianbonk-return',
    items: () => [
      {
        title: tr(
          'whats_new.horde_return_title',
          'BrazilianBonk: achievements, daily challenge and mastery'
        ),
        body: tr(
          'whats_new.horde_return_body',
          "Achievements unlock new weapons and Boletos (your old runs already count). Every day there is a challenge with the same run for everyone and its own ranking. The ranking has tabs for the week, each hero and the day, with everyone's build. Each hero gains mastery as you kill with it, and the end screen shows records, how close you came and the next achievement. Enter plays again."
        ),
      },
    ],
  },
  {
    id: '2026-11-brazilianbonk-enemies',
    items: () => [
      {
        title: tr(
          'whats_new.horde_enemies_title',
          'BrazilianBonk: new enemies, real bosses and shrines'
        ),
        body: tr(
          'whats_new.horde_enemies_body',
          'New enemies: the charger (marks a line, then rushes), the walking bomb (warns with a circle and blows up), the shield soldier (only hurt from behind or by area damage), the summoner and swarms. Bosses have attacks marked on the ground and get furious at half health. Sieges, stampedes and rains of blasts come at set minutes, elites have twists, barrels blow up, pots hold gold and shrines can curse, pay gold, heal or challenge you. Winners can play harder tiers.'
        ),
      },
    ],
  },
  {
    id: '2026-11-brazilianbonk-builds',
    items: () => [
      {
        title: tr(
          'whats_new.horde_builds_title',
          'BrazilianBonk: evolutions, abilities and chests'
        ),
        body: tr(
          'whats_new.horde_builds_body',
          "Each hero has an ability on Q (or the new button on a phone). Maxed weapons evolve with their Boleto into a much stronger form. Offers can be rare or epic, chests open with a draw and give 1, 3 or 5 upgrades, and two new permanent upgrades let you banish or skip offers. The pause has a Build screen with every weapon's numbers."
        ),
      },
    ],
  },
  {
    id: '2026-11-brazilianbonk-balance',
    items: () => [
      {
        title: tr('whats_new.horde_balance_title', 'BrazilianBonk: weapons rebalanced'),
        body: tr(
          'whats_new.horde_balance_body',
          'After thousands of simulated runs: the Work Card and Lightning hit harder, Fascist Tears grow more per level, the Atomic Bomb and the Fire Trail start a little weaker, and the final boss is tougher.'
        ),
      },
    ],
  },
  {
    id: '2026-11-brazilianbonk-feel',
    items: () => [
      {
        title: tr('whats_new.horde_feel_title', 'BrazilianBonk: sound and impact'),
        body: tr(
          'whats_new.horde_feel_body',
          'The game has sound now: hits, explosions, lightning, gems that climb in pitch when you grab many in a row, the boss arriving and victory. If you are in a call it plays quietly. Enemies are flung away when they die, the bomb leaves a little mushroom cloud, the boss arrives with a warning and, when it dies, pulls every gem on the map. Volume, mute and "reduce motion" are in Controls.'
        ),
      },
    ],
  },
  {
    id: '2026-11-brazilianbonk-stats',
    items: () => [
      {
        title: tr('whats_new.horde_stats_title', 'BrazilianBonk: stats, Boletos and powerups'),
        body: tr(
          'whats_new.horde_stats_body',
          'Heroes now have 30 stats (armor, evasion, shield, crit, luck, difficulty and more), shown in the new Stats screen. Passives became Boletos, one for each stat, still four per run. Shrines give blessings that take no slot, rare offers give two levels, enemies drop powerups (bomb, rage, freeze, star, gold rain) and there are five new permanent upgrades. Your gold and upgrades are all still there.'
        ),
      },
    ],
  },
  {
    id: '2026-11-truco-table-refresh',
    items: () => [
      {
        title: tr('whats_new.truco_refresh_title', 'A new look for the Truco table'),
        body: tr(
          'whats_new.truco_refresh_body',
          'See whose turn it is and which card won each trick right at the table. Choose a Paulista or Spanish deck, and see your partner’s suggestion when the other team calls Truco.'
        ),
      },
    ],
  },
  {
    id: '2026-11-brazilianbonk-movement',
    items: () => [
      {
        title: tr(
          'whats_new.horde_movement_title',
          'BrazilianBonk: jump, free camera and controls'
        ),
        body: tr(
          'whats_new.horde_movement_body',
          "The hero now jumps with Space (over low enemies and their shots) and dodges with Shift. The camera turns with the mouse, and well-timed jumps while strafing and turning build speed. Every key can be changed in Controls. Enéas's weapon is now the Atomic Bomb."
        ),
      },
    ],
  },
  {
    id: '2026-11-brazilianbonk',
    items: () => [
      {
        title: tr('whats_new.horde_title', 'New game: BrazilianBonk'),
        body: tr(
          'whats_new.horde_body',
          'A 3D roguelike in the Games tab: pick Enéas, Lula, Janja or Bolsonaro, survive 10 minutes of horde with weapons that attack by themselves, build your combo on every level and spend the gold on permanent upgrades. Your progress is kept on your account and there is a ranking. It plays with a keyboard and on a phone.'
        ),
      },
    ],
  },
  {
    id: '2026-11-forge-theme',
    items: () => [
      {
        title: tr('whats_new.forge_title', 'New look: Forge'),
        body: tr(
          'whats_new.forge_body',
          'Blazeroom has a new graphite and wine-red look, in light and dark modes. Pick one in Settings > General > Theme. The wallpaper now shows only on the sign-in screen.'
        ),
      },
    ],
  },
  {
    id: '2026-11-truco-time-top-up',
    items: () => [
      {
        title: tr('whats_new.truco_time_title', 'More time in Truco'),
        body: tr(
          'whats_new.truco_time_body',
          'Each Truco turn now lasts 45 seconds. Ran out of coins? Get more coins is now in the Truco and Fodinha lobby too.'
        ),
      },
    ],
  },
  {
    id: '2026-11-truco-bar',
    items: () => [
      {
        title: tr('whats_new.truco_bar_title', 'Truco at the bar'),
        body: tr(
          'whats_new.truco_bar_body',
          'Truco is now played at a bar table: everyone sits on a red plastic chair, the cards land on the table and the vira lies on the deck beside them.'
        ),
      },
    ],
  },
  {
    id: '2026-11-live-buttons',
    items: () => [
      {
        title: tr('whats_new.live_buttons_title', 'Live controls on the edge'),
        body: tr(
          'whats_new.live_buttons_body',
          'The controls of a live you watch are now loose buttons on its right edge: the X to stop watching in the top corner and the sound at the bottom. The eye button fades them until you point at them.'
        ),
      },
    ],
  },
  {
    id: '2026-11-call-stage',
    items: () => [
      {
        title: tr('whats_new.call_stage_title', 'Bigger lives, easier controls'),
        body: tr(
          'whats_new.call_stage_body',
          'A live you watch now fills the call. Its volume and stop button sit on the live itself, and Hide people gives it the whole room without fullscreen. Who is talking gets a green ring in the channel list, and the faces moved next to the room in the call bar.'
        ),
      },
    ],
  },
  {
    id: '2026-11-floating-room-card',
    items: () => [
      {
        title: tr('screen_share.room_card_news_title', 'A clearer call card'),
        body: tr(
          'screen_share.room_card_news_body',
          "Outside the call's room, the floating card shows the room, who is in it (ringed green while they talk) and a Go button. Minimize it and a green dot pulses on the room's speaker next to the call buttons: click there to bring the card back, or the room's name to go there; its waves move when someone talks."
        ),
      },
    ],
  },
  {
    id: '2026-11-truco-rounds',
    items: () => [
      {
        title: tr('whats_new.table_rounds_title', 'Faster Truco and tidier tables'),
        body: tr(
          'whats_new.table_rounds_body',
          'Truco turns now last 15 seconds, and when time runs out the game plays for you instead of forfeiting the match. A finished trick stays on the table for a moment with who took it, and the hand’s three tricks show in the middle. When a game ends, Play again opens the same table with the same people invited. The list shows only open tables, games your friends are in and your own recent games.'
        ),
      },
    ],
  },
  {
    id: '2026-11-room-codes',
    items: () => [
      {
        title: tr('whats_new.room_codes_title', 'Invite codes and finding anyone'),
        body: tr(
          'whats_new.room_codes_body',
          'The invite dialog for rooms and spaces was redesigned and now finds anyone on blazeroom by name, not only friends. You can also make a link or a four-digit code: whoever has it joins through "Join with code" on Home.'
        ),
      },
    ],
  },
  {
    id: '2026-11-fodinha-oval-table',
    items: () => [
      {
        title: tr('whats_new.fodinha_oval_title', 'Fodinha back on the oval table'),
        body: tr(
          'whats_new.fodinha_oval_body',
          'Fodinha is played on the oval table again, like poker, with the bets and penalties on each seat. Bots and invitations stay: invite from the table or fill the empty seats with bots.'
        ),
      },
    ],
  },
  {
    id: '2026-11-truco-fodinha-bots',
    items: () => [
      {
        title: tr('whats_new.table_bots_title', 'Truco and Fodinha with bots'),
        body: tr(
          'whats_new.table_bots_body',
          'The Truco and Fodinha tables were redrawn: the screen is only the table, with the vira in the middle, each card in front of whoever played it and the score kept with tally sticks. Invite friends from the table or fill the empty seats with bots.'
        ),
      },
    ],
  },
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
    id: '2026-11-live-watch-toolbar',
    items: () => [
      {
        title: tr('screen_share.controls_news_title', 'Live controls together'),
        body: tr(
          'screen_share.controls_news_body',
          'Live volume and the red stop-watching icon now sit in the call toolbar. Available streams have a cleaner card and watch button.'
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
