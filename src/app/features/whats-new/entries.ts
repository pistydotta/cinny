import { tr } from '../translation/tr';

export type WhatsNewItem = {
  title: string;
  body: string;
};

export type WhatsNewEntry = {
  // Saved as the newest entry someone has seen, so never change one once it shipped.
  id: string;
  items: () => WhatsNewItem[];
};

// Newest first. Add an entry when you ship something people should know about; everyone who
// hasn't seen it gets the dialog once on their next visit.
export const WHATS_NEW: WhatsNewEntry[] = [
  {
    id: '2026-10-windows-app',
    items: () => [
      {
        title: tr('whats_new.windows_title', 'blazeroom for Windows'),
        body: tr(
          'whats_new.windows_body',
          'blazeroom now has a Windows app, so you can use it without the browser. Download it from Home > Overview.'
        ),
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

// Entries show at most this many at once, so a long-gone visitor isn't buried.
export const MAX_SHOWN = 3;

export const SEEN_KEY = 'blazeroom.whatsNewSeen';

// The entries newer than the one last seen, newest first.
export const unseenEntries = (
  entries: WhatsNewEntry[],
  lastSeenId: string | null
): WhatsNewEntry[] => {
  const seenIndex = lastSeenId ? entries.findIndex((entry) => entry.id === lastSeenId) : -1;
  const unseen = seenIndex === -1 ? entries : entries.slice(0, seenIndex);
  return unseen.slice(0, MAX_SHOWN);
};
