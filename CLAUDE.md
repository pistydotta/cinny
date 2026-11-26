# Blazeroom web (Cinny hard fork)

This directory is the client source in the private monorepo. Read the root
`CLAUDE.md` when working there. All agents must respect its no-merge, no-production
and no-secret-file rules. Work on a feature branch/PR in the monorepo, never on
the public mirror to ship changes. PRs run no checks.

The public source mirror contains only this tree and public history; deployment
publishes sanitized snapshots with immutable `web-<tree-sha>` tags before building.
Do not restore the old release/deploy-PR workflow or local git hooks. See
`SOURCE.md` and `UPSTREAM.md` for public build instructions and attribution.

## Our code

- Keep our features in their own folders so upstream merges stay easy:
  `src/app/features/friends`, `invites`, `room-invite`, `admin`, `settings/admin`, `word-swap`, `home-direct`,
  `encryption-setup`, `room-nav-reorder`, `invite-to-server`, `translation`, `whats-new`, `home-overview`, `feedback`, `push`, `desktop-download`, `android-app`, `app-prompt`, `tooltips`, `profile-description`, `call-indicator`, `coffee`, `about`, `self-chat`, `first-login`, `register-page`, `auth-card`, `app-background`, `forge-theme`, `settings-shell`, `app-update`, `pinned-chats`, `games`, `screen-share`
  (with `pages/client/games`),
  `space-autojoin`, `call-rejoin`, `call-switch`, `call-notify`, `call-member-card`, `call-audio-settings`, `clock-format`, `room-nav/CallMemberAvatars.tsx` and
  `room-nav/callMembers.ts`, `src/element-call`, `src/app/utils/blazeroomApi.ts`.
  Touch upstream files only to plug them in, with as few lines as you can.
- Poker rules live in the blazeroom API, which deals, bets and pays. The client in `games` computes
  none: it shows the view the API sends and posts the player's action. The credits wallet
  (`games/credits`) is the API's too, shared only between card games. The Games hub shows
  the card games, with the wallet, then every other game in one "Mais jogos" section, each tagged
  with its genre. Idle gold stays in the hero's save, with no credit
  transfers. `games/legacy` only cleans up the old Matrix-room tables and
  can go once people have opened the app.
- `games/idle` (Crônicas da Brasa) is the opposite: an idle RPG that runs in the browser. It saves in
  localStorage and on the API (`/api/idle/save`, `cloudSave.ts`): every write names the server revision
  it was based on, and a conflict means another device is playing, so this one pauses until "Jogar
  aqui". Without the API the game keeps working on localStorage alone. `engine/` is plain, deterministic TS (seeded rng in the save, time passed in), so a
  server can replay fights later for PvP; classes (6, each with 2 specs), talents, items, the forge,
  the rebirth altar and zones are data there. `runner.ts` keeps it playing on every screen once
  `GamesTab` sees a save, and hands each tick's events to `fx/` (a canvas particle engine) without
  going through React. Balance changes: play a few simulated hours with `advance` before shipping.
- `games/horde` (BrazilianBonk) is a 3D horde-survival roguelike that runs in the browser. `engine/` is
  plain, deterministic TS like the idle one: `step(run, input, dt)` at 60 ticks a second, with the
  seeded rng in the run, so a seed plus the inputs replays a run. `render/` draws it with three.js
  (monsters are boxes built in code, rendered at low resolution for the old-console look) and is the
  only part that imports it, loaded with `import()` when a run starts so three.js stays out of the main
  bundle. `runner.ts` owns the loop, keys and touch stick. Heroes are pixel art from PixelLab in
  `sprites/` (one row of eight 48px frames, south first, turning to south-east), drawn as a card facing
  the camera (`SpriteHero`). They are caricatures of politicians, and each one's starting weapon is a
  joke the owners picked (the names in `labels.ts`); other texts only say how each one plays.
  Icons are 16x16 pixel art written as letters in `icons/pixelArt.ts`
  (`PixelIcon`, emoji where there's no drawing); the sky and light follow the run's time
  (`render/sky.ts`). What waits for art, and the PixelLab prompts, is in
  `../docs/brazilianbonk-art.md`.
  Gold, upgrades and records are the API's (`/api/horde`, `profile.ts`, `useHordeProfile.ts`), with a
  copy in localStorage. Offline the game still plays: finished runs wait in localStorage and are sent
  when the server answers, and upgrades can't be bought until then. Upgrade costs are in
  `engine/data.ts` and in `api/src/horde.js`: change both. Balance changes: run the report
  (`HORDE_SIM=1 npx vitest run src/app/features/games/horde/engine/balance.report`, a few minutes;
  `engine/balance.ts`), which plays the fighter bot (`engine/fighter.ts`, keeps its weapons'
  range, dodges, picks sensible upgrades) per hero, a veteran account, weapons against training
  dummies and new-player campaigns, and checks the plan's goals. Paste before/after in the PR and
  keep `docs/brazilianbonk-balance.md` current. `engine/regression.test.ts` pins one known run:
  when a number change moves it, update it on purpose. The old runaway bot (`bot.ts`) is the
  floor to compare with.
  Movement is 3D in the engine: the hero has `y` and a velocity, the ground is `engine/terrain.ts`,
  Space jumps and Shift dodges. The map is a 400-unit square of land generated
  from the run's seed (`createMap`; `RunState.map` keeps only the numbers it is made from):
  layered noise pressed into four levels (hollow, plain, plateau, high plateau) with cliffs
  between them, spread into walkable slopes in places, and mountains past the edge. A layout
  that could trap the hero, or leaves too little within reach, is thrown away for another.
  `heightAt(map, x, z)` is the only height there is: it reads a 2-unit grid of heights, and the
  renderer draws that same grid, triangle for triangle (`render/terrainMesh.ts`), textured by
  slope and height with the PSX ground textures in `textures/`. Trees, boulders and logs
  (`obstaclesOf`, grown from the map's own numbers) are circles that push the hero out
  (`pushOut`); enemies and shots pass through them, and a jump clears a boulder. Ground steeper than
  `WALL_SLOPE` stops the hero (sliding along it) and an edge that steep drops it; enemies ignore
  cliffs and climb, as in Megabonk, but only bite at the hero's height, and one thrown into a cliff
  is hurt. Blessing totems sit on the highest tops, can be rare or epic (`blessingLevels`), and
  map chests open for run gold (`chestPrice`, dearer each time). `mapHud.ts` draws the minimap and
  the chests' prices; the camera pulls in front of cliffs. The bunny hop is Quake's
  air acceleration (strafe while turning gains speed, landing keeps it for a few ticks, a held key
  never jumps again); its numbers are `MOVE` in `engine/data.ts`, tested in `movement.test.ts`.
  The camera orbits the hero with pointer lock (Esc releases it, which is the pause); the
  Windows app has to allow `pointerLock` in `desktop/main.js`, or the game falls back to
  dragging. The engine never sees the camera: `runner.ts` turns keys plus camera angle into a
  world direction, rounded to 1024 directions in `controls.ts` so a replay sends the same
  commands. Keys are configurable
  (`controls.ts`, `ControlsPanel.tsx`), saved per browser by `KeyboardEvent.code`.
  Every hero number is a stat in `engine/stats.ts` (about 30, Megabonk's table without silver),
  added up one way: `(base + flat) * (1 + pct) * mult`, then a cap; armor, evasion and luck turn
  points into a share with diminishing returns. Sources: hero traits, permanent upgrades, the
  run's passives (called Boletos in the game, one per stat, four slots) and shrine blessings (a
  Boleto level with no slot). Weapons read `runStats`, never a number of their own. Bosses pierce
  part of armor and evasion so no build is immortal; `stats.test.ts` has a test per stat. When
  the rules change what a run can reach, bump `ENGINE_VERSION` (`engine/data.ts`): each run
  reports it and the API keeps it in `horde_runs.engine`.
  Sound is synthesized with the Web Audio API in `audio/` (no files), loaded with the scene and
  driven by the same `GameEvent`s. The AudioContext is made on the Start click (`unlockAudio`),
  since browsers only allow sound after a gesture. In a call (`callEmbedAtom`, read by
  `HordeGamePage`) it plays at a fifth of the volume. Freeze frames, shakes and flashes are
  drawing-only and off with "reduce motion" (defaults to `prefers-reduced-motion`).
  Weapon numbers live in `engine/weapons.ts` (`weaponSpec`, read by the engine and the Build
  screen) with the evolutions (`EVOLUTIONS`: `EVOLVE_LEVEL` 6 plus one Boleto). Weapons level to
  `WEAPON_MAX_LEVEL` 50: a weapon's own numbers grow only to level 6, and every level after the
  first rolls two different stats from that weapon's `WEAPON_ROLLS` (each weapon has its own
  values, tuned so no weapon runs away; check with the dummies before changing them) into
  `OwnedWeapon.bonus`, for that weapon only; crit rolls add to the hero's crit in `hurtEnemy`.
  The rolls are drawn with the offer, so the card shows them. A rare or epic weapon level has
  bigger rolls; a rare Boleto offer gives +2 levels, an epic one +3.
  Boletos level to `BOLETO_MAX_LEVEL` 99, or to where their stat reaches its cap (`levelsToCap`
  in `engine/stats.ts`, so a level that adds nothing is never offered): change a cap and the
  Boleto's max follows. The API's `checkBuild` takes levels up to 99 (`axe50`). Chests
  (`openChest`) apply 1, 3 or 5 upgrades at once and wait in the `chest` phase; banish and
  skip are counts bought like rerolls; each hero has an ability on Q (`fireAbility`,
  `ABILITY_COOLDOWN`). The names of evolutions and abilities are descriptive placeholders until
  the owners pick jokes for them.
  Enemies act in `enemyAct`/`bossAct` (`engine/run.ts`): every strong attack is first a
  `Hazard` on the ground (a filling circle, a lane, burning ground) that the renderer draws, and
  only then hurts. Horde set pieces run at `HORDE_EVENTS`; barrels and pots are enemies with
  `prop` (no kill, no xp, not aimed at). Shrines have kinds (blessing, curse, gold, heal,
  challenge, camelo, agiota, treta: optional difficulty, +15% each until the end of the run;
  27 shrines and 16 map chests), each with its own model (`render/shrines.ts`). Every material
  gets PS1 vertex snapping and 15-bit dithered color through `render/psx.ts`
  (`onBeforeCompile`, so lighting and fog stay three.js's own). Items are Muambas
  (`engine/items.ts`, `../docs/brazilianbonk-items.md`): the Camelô sells them, the Agiota lends them; stat items add
  to `runStats`, special ones act through `itemCount` where the engine does, so a run without
  items plays as before. Winning unlocks difficulty tiers; each run reports its `tier`
  (`horde_runs.tier`).
  Achievements (`engine/achievements.ts`) are read from totals the API keeps over a player's
  runs (`totalKills`, `heroes`, `bestTier` in the profile), so old runs count; unfinished ones
  lock some weapons and Boletos (`lockedContent`, `RunState.locked`). Mastery comes from kills
  per hero. The daily challenge (`engine/daily.ts`, and the same function in `api/src/horde.js`;
  `apiParity.test.ts` compares them and the upgrade prices) is one seed and hero per UTC day, no
  upgrades; the API counts only a player's first try (`horde_runs.daily`). Ranking tabs:
  `GET /api/horde/ranking?scope=all|week|daily&hero=&day=`, each row with its build.
  A run in play is kept in localStorage every 4 s and when the page hides (`engine/save.ts`,
  `savedRun.ts`; the rng is saved as its state), offered as "Continue run" and used to recover
  when the WebGL context is lost. Resumed runs report `resumed`: out of the daily challenge, and
  in the rankings only once their replay checks out.
  Replays (`../docs/brazilianbonk-replays.md`): `engine/replay.ts` records every command into
  `run.replay`, the report sends it, and the API replays it with the engine bundled into
  `api/src/hordeEngine.gen.js`. After any change in `engine/`, run
  `node scripts/build-horde-engine.mjs` and commit the bundle (`apiParity.test.ts` catches a stale
  one). The engine must give the same bits everywhere: use `engine/dmath.ts` instead of
  `Math.sin/cos/atan2/pow/exp/log`; `determinism.test.ts` pins a fingerprint of three scripted
  minutes. The ranking's ▶ plays a run's replay (watch mode: nothing saved or reported).
  The engine compacts its lists in place (`keep`) instead of `filter` each tick. Graphics quality
  is a control (auto steps down when frames run under 40 a second).
  Waiting on the owners (remind them when working on the game): the PixelLab "walk" animation of
  each hero in 8 directions (zips) for walking frames instead of the hop (plan item 3.3); a
  description of Go Next's wall run and speed gain before wall running (plan 1.5-1.6; the cliffs
  are there to run on now); Renan Santos's sprite zip and weapon; names for the evolutions and abilities;
  whether Lula and Bolsonaro need help against bosses (the abilities may already be enough);
  whether a room should hear about a new group record (plan 7.7) and what gold buys once
  everything is maxed (cosmetics, plan 7.5).
- `games/football` (FIFUMA, `../docs/football.md`): `engine/` is deterministic like horde's
  (`step(match, inputs)`, one input per person, at 60 ticks, rng in the state, `dmath` for trigonometry,
  inputs as whole numbers) and a `structuredClone` of a match must step on identically, since
  online play will roll back. `render/` is the only part importing three.js, loaded with
  `import()`. The mannequin is Quaternius' CC0 UAL2 cut down to a few clips (how, in the doc);
  `render/rig.ts` makes idle, run and kick from bone rotations in model axes, and
  `render/kit.ts` paints the kit from rest-pose height, so the model's positions must stay
  unquantized. The TV camera never turns: screen right is +x, up is -z. Teams in
  `engine/teams.ts` are names and colours only, never crests or real player names.
  Keys (`controls.ts`, three sets, by `KeyboardEvent.code`) and graphics (`options.ts`) are
  options per browser; the runner leaves keys typed into fields alone. The API runs online
  matches with the engine bundled into `api/src/football/engine.gen.js`: after any change in
  `engine/`, run `node scripts/build-football-engine.mjs` and commit it (`bundle.test.ts`).
  The runner steps a `MatchSource` (`source.ts`): local, online with rollback (`online/netplay.ts`)
  or watched (`online/spectate.ts`); `useMatchCanvas` mounts any of them and `MatchHud` draws the
  scoreboard for all. Online screens are `OnlineLobby` and `OnlineMatch`, at
  `/games/football/match/<id>/` (the link people share).
  People are slots (`setup.slots`, one input each, up to four a side online); each controls
  one player in `m.people`, the rest of the team is the CPU. Fouls, cards, offside and the
  officials' movement are `engine/referee.ts`, all in the match state. What bodies act out while
  the ball is dead (the fouled player down, the card, the walk to the tunnel, goal celebrations,
  substitutions with the fourth official's board, full time) is `engine/scenes.ts`, a `Scene` in
  the state whose `hold` keeps the restart waiting. Substitutes are `m.players` after the 22
  (`out: 'bench'`), so check `off` (not on the pitch) in any choice; `requestSub` is the entry
  point for anything that changes players. People choose their side's changes (`SubsDialog`,
  pause menu); the choice rides in `Input.sub` so it reaches every copy online on the same
  tick. The CPU coach only changes a side nobody plays. The poses are clips made in `render/rig.ts`.
- `games/table-games` renders server-authoritative Truco Paulista, elimination Fodinha and
  free chess. Keep the hand visible during prediction/raise/eleven-point decisions; the API
  alone hides opponents' cards and all hands at 11–11. Chess spectators may comment but
  cannot move. Poll snapshots use `revision`; actions use the separate gameplay `version`,
  so spectator comments don't invalidate moves. See `../docs/table-games.md` for rules.
  The Truco table's scene (the bar photo behind the table) is the owners' and stays as it is
  in any redesign; only the controls drawn over it (buttons, labels, seats) may change.
- Every card game draws its cards with `games/cards/GameCard`: a flat white face, a bold corner
  index and one big suit, sized by `--card-w`. Realistic decks (Paulista figures, a Spanish
  deck) were tried in Truco and dropped: at table sizes they were hard to read.
- Put logic you want to test in a plain `.ts` file next to the component and test it
  with vitest (`npx vitest run`). Vitest here doesn't import `.tsx` test targets well.
- Scoped lint/format/type checks live in `scripts/check.sh`; run `npm run check:blazeroom`.
  Run `npm run build` too. These checks run only on deployment, never PR events.

## Traps already hit

- The only look is Forge (`features/forge-theme`), in a light and a dark mode; the Cinny themes
  are gone. Theme ids stay `light-theme` and `dark-theme`, and the palette lives in `palette.ts`,
  where a test checks contrast. Cinny's shell is restyled from `shell.css.ts` instead of editing
  upstream style files. Roles folds has no slot for are in `forgeColor` (`forgeColor.css.ts`):
  `Ember` for focus rings, links, the selected row and switch/slider fills, and `Text.Secondary`/
  `Text.Faint` for dimmer text. Use them instead of a new hex or an opacity; filled buttons stay
  the wine `Primary`. Sizes, spacing, radii, z layers, motion and per-mode shadows are in
  `forge-theme/tokens.ts`. `literals.test.ts` caps the hand-written colours, font sizes, shadows
  and z-indexes left in `features/**/*.css.ts` (outside `games/` for now): a count may only go
  down, so lower its ceiling when you remove some, and reach for a token instead of adding one.
  `shell.css.ts` gives everything focusable an ember keyboard ring at zero specificity; a control
  that sets `outline: none` must draw its own visible focus instead.
  Filled buttons are the wine Primary, never green: the shell repaints folds' Success Button and
  IconButton as Primary through their class names (`foldsClasses.ts`, checked by a test against
  folds 2.7.2), so use `variant="Primary"` in new code and leave Success to badges and status.
  folds Input and TextArea in a neutral variant are one field (raised surface, hairline, ember
  ring); pick one of a few options with `forge-theme/Segmented`, and fill sliders with ember. The wallpaper shows only behind the logged-out pages.
  Games build on the kit in `games/ui`: `game` colour variables, set by `StageScope` where the
  game is played (always dark) or `LobbyScope` for lobbies, setup and dialogs (the app theme),
  plus `gameButton`, `GameTopBar`, `GameWallet` and `GameDialog`. Gold (`game.Money`) is for
  money only; a choice or a turn is ember (`game.Accent`), the main action wine. Poker is on the
  kit, and so are Truco, Fodinha and chess (Truco's scene photo and the plaques over it keep
  their warm tones); Crônicas and BrazilianBonk still carry their own styles.

- Idle RPG class/spec talents, weapon requirements, automatic sales and save adaptation
  are documented in `../docs/idle-rpg.md`. Keep eligibility in the engine as well as the UI.

- An unwatched screen share is a stand-in tile in Element Call's grid (a bundle patch), with
  Cinny's picture and Watch button drawn over it; the floating viewer reuses the same
  iframe. Placement must use viewport coordinates and inactive call rooms must not
  reposition it. Owner PC volume changes outgoing capture gain; viewer volume stays
  local. See `../docs/screen-sharing-ui.md` before changing these controls.

- `src/element-call/patchElementCall.js` holds minified text from the pinned Element Call, so
  upgrading that package fails the build until the replacements are redone. The patch filters
  Element Call's share list (`j` in the call view model) through `window.blazeroomShares`, which
  `blazeroom-screenshare.js` sets. Subscriptions decide what a client downloads (`setSubscribed`):
  `adaptiveStream` alone didn't stop the download, and LiveKit's `attach` skips a volume of 0.

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
- The music bot (`features/music-bot`) plays API-downloaded audio locally through one
  `MusicBotPlayer`. The sidebar card defaults to an authenticated private queue.
  Sharing explicitly selects the current call's room queue and copies the current
  private song; changing calls never carries sharing. Slash commands use that same
  destination; private requests never post chat notices. See `../docs/music.md`.
- Call mic/speaker choice (`features/call-audio-settings`) stays per browser, in Element Call's
  own `matrix-setting-audio-input`/`-output` keys, so every call starts with it. A bundle patch
  exposes those settings as `window.blazeroomDeviceSettings` to switch mid-call. Input volume is
  a gain step in `blazeroom-noise.js`, which now processes every mic stream; output volume
  multiplies the per-person volumes in `voiceVolume.js` (no boost above 100%).
- Compact voice controls use a pointer-transparent PopOut root and a clickable menu;
  a normal folds PopOut creates a full-screen layer that blocks background clicks.
  Per-person volume and mute reuse the saved `call-member-card/voices` preferences
  and pinned `voiceVolume.js` bridge. Keep its bundle guard when upgrading Element Call.
  Sidebar audio status uses actual LiveKit microphone state in that bridge and
  expiring, session-scoped Matrix to-device reports for mute/deafen status outside
  the active call. Reports never enter chat history; old clients cannot report
  whether their call audio is off. See `../docs/call-audio-status.md`.
- Home and Direct messages are one sidebar tab: the Direct tab is hidden, the Home page lists
  DMs (`features/home-direct`), and the `/direct` routes show the Home nav.
