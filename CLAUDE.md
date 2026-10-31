# Cinny, blazeroom fork

This is the `blazeroom` branch of `github.com/pistydotta/cinny`: the web app of blazeroom,
a private Discord-style chat. The server, the API, the deploy and the team rules live in
`github.com/pistydotta/blazeroom`; read its `CLAUDE.md` first. In short: two owners work
through their own Claude sessions, work goes through a branch and a PR to `blazeroom`, and
a person merges.

## Shipping a change

The site builds Cinny from a tag, not from the branch. After a PR is merged into
`blazeroom`, the `release` job in [blazeroom-ci.yml](.github/workflows/blazeroom-ci.yml)
tags it `blazeroom-vN` (the next number) and opens the PR in blazeroom that bumps
`#blazeroom-vN` in `docker-compose.yml`, closing older deploy PRs still open. Merging that
PR deploys. A merge that only touches `.github/` or `*.md` makes no version.

- The checks (`test`, `build`, `typecheck`) run on PRs only, in parallel; the merge runs
  only `release`. A branch rule on `blazeroom` requires those three checks to pass before
  merging, so a red PR can't ship. Don't push straight to `blazeroom`: nothing would check it.

- It needs the `BLAZEROOM_TOKEN` Actions secret on this fork: a fine-grained token with
  access to `pistydotta/blazeroom` only, with Contents and Pull requests set to read and
  write. Without it the tag is still made and the job warns; open the PR by hand.
- The fork's default branch is `blazeroom`. `dev` is upstream's branch, kept untouched as
  a reference; don't open PRs to it.

## Our code

- Keep our features in their own folders so upstream merges stay easy:
  `src/app/features/friends`, `invites`, `admin`, `settings/admin`, `word-swap`, `home-direct`,
  `encryption-setup`, `room-nav-reorder`, `invite-to-server`, `translation`, `whats-new`, `home-overview`, `feedback`, `push`, `desktop-download`, `android-app`, `app-prompt`, `tooltips`, `profile-description`, `call-indicator`, `coffee`, `about`, `self-chat`, `first-login`, `register-page`, `games`, `pinned-chats`
  (with `pages/client/games`),
  `space-autojoin`, `call-rejoin`, `call-switch`, `call-notify`, `room-nav/CallMemberAvatars.tsx` and
  `room-nav/callMembers.ts`, `src/element-call`, `src/app/utils/blazeroomApi.ts`.
  Touch upstream files only to plug them in, with as few lines as you can.
- Poker rules live in the blazeroom API, which deals, bets and pays. The client in `games` computes
  none: it shows the view the API sends and posts the player's action. The credits wallet
  (`games/credits`) is the API's too. `games/legacy` only cleans up the old Matrix-room tables and
  can go once people have opened the app.
- Put logic you want to test in a plain `.ts` file next to the component and test it
  with vitest (`npx vitest run`). Vitest here doesn't import `.tsx` test targets well.
- New files of ours go in [.github/workflows/blazeroom-ci.yml](.github/workflows/blazeroom-ci.yml):
  the eslint and prettier lists, and the tsc grep for files that don't import the SDK.

## Traps already hit

- `npx tsc --noEmit` prints many TS2614 errors from upstream (`matrix-js-sdk` imports).
  They're upstream noise; CI only fails on errors in our own SDK-free files. Check that
  your change adds no other errors.
- Authenticated media (avatars, chat images, feedback screenshots) needs the service worker. It
  doesn't register under `npx vite` here or anywhere in the desktop app's browser pane, so those
  images show broken in local tests. Fetch the URL with the token to check it instead.
- Windows file names ignore case: `CallRejoin.tsx` next to `callRejoin.ts` breaks imports
  there. Give the component and its helper file different names.
- Prettier rewrites line endings in upstream files on Windows. Don't commit files where
  only line endings changed.
- `WORD_SWAPS` word pairs are inside jokes about real people: never in code, tests or
  commits here (the repo is public). Use neutral examples like `hello=tchau`.
- The app is in Portuguese unless someone picks English in Settings > General (saved per
  browser, `features/translation/language.ts`, read once in `src/app/i18n.ts`). Text you add
  goes through `tr('key', 'English text')` from `features/translation/tr.ts`, with the Portuguese in
  `features/translation/pt.json`. Upstream screens are only partly translated: the sidebar,
  room view, timeline lines and profile card. The rest of upstream is still English.
- When you ship something people should notice, add an entry at the top of `WHATS_NEW` in
  `features/whats-new/entries.ts` (a new `id`, never reuse or change an old one). It shows in
  the Novidades card on Visão geral, and the Visão geral nav item gets a dot until it's seen.
- Nothing opens by itself when someone logs in. Visão geral (`features/home-overview`) greets
  them with what's left to set up (recovery key, Windows app, language); the encryption
  banner stays at the top until the key is done. Keep new onboarding there, not in a dialog.
  The one exception the owners asked for is `features/app-prompt`: a small card, not a dialog,
  offering the app to people in a browser on Android or Windows. It shows at most once a week and
  three times per user and browser, and never again after a download.
- A new account (`features/first-login`) is marked in the browser when registration succeeds, so old
  accounts never count as new. For its first 24 hours the top encryption banner stays hidden, with the
  recovery key still on Visão geral, and one card invites it to the community. That card is the other
  exception to nothing opening by itself, and the app card waits for it.
- A space's public rooms work like Discord channels: `space-autojoin` joins everyone to them, and
  `isAlwaysJoinedRoom` hides Leave, so only private rooms can be left. It runs from `SpaceProvider`,
  not the sidebar, because a phone opening a room's link has no sidebar.
- `features/pinned-chats` keeps pinned chats on top of the Direct Messages list
  (`br.com.blazeroom.pinned_chats` in account data).
- Everyone has a chat with themselves, created on load by `SelfChatKeeper` (`features/self-chat`). It's
  a DM listed under your own user in `m.direct`: `getDMRoomFor` with your own ID answers with any DM
  you're in, so use `findSelfChat`. The client's `m.direct` can be stale from the last visit, so check
  the server before creating or writing it, or two devices make two rooms and DMs get lost. It can't be
  left in this app, only hidden (`br.com.blazeroom.self_chat` in account data), and Settings > Account
  brings it back.
- Icon buttons with no text use `TipIconButton` (`features/tooltips`), so they say what they do on
  hover. Obvious close and back buttons in settings dialogs are left as they are.
- The profile description is a custom field on the Matrix profile (`features/profile-description`).
  Read it with `getExtendedProfile`: the SDK's `getExtendedProfileProperty` answers from a cache.
- A MatrixRTC session's `memberships` starts empty and fills in a moment later, with only the
  session's own `MembershipsChanged` to say so: after a reload the manager's `SessionStarted` doesn't
  fire. Use `useCallMembers`, or `roomsInCallAtom` for all rooms.
- Home and Direct messages are one sidebar tab: the Direct tab is hidden, the Home page lists
  DMs (`features/home-direct`), and the `/direct` routes show the Home nav.
