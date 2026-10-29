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

- It needs the `BLAZEROOM_TOKEN` Actions secret on this fork: a fine-grained token with
  access to `pistydotta/blazeroom` only, with Contents and Pull requests set to read and
  write. Without it the tag is still made and the job warns; open the PR by hand.
- The fork's default branch is `dev` (from upstream), so new PRs may target the wrong
  base. Check it says `blazeroom`.

## Our code

- Keep our features in their own folders so upstream merges stay easy:
  `src/app/features/friends`, `invites`, `admin`, `settings/admin`, `word-swap`,
  `space-autojoin`, `call-rejoin`, `room-nav/CallMemberAvatars.tsx` and
  `room-nav/callMembers.ts`, `src/element-call`, `src/app/utils/blazeroomApi.ts`.
  Touch upstream files only to plug them in, with as few lines as you can.
- Put logic you want to test in a plain `.ts` file next to the component and test it
  with vitest (`npx vitest run`). Vitest here doesn't import `.tsx` test targets well.
- New files of ours go in [.github/workflows/blazeroom-ci.yml](.github/workflows/blazeroom-ci.yml):
  the eslint and prettier lists, and the tsc grep for files that don't import the SDK.

## Traps already hit

- `npx tsc --noEmit` prints many TS2614 errors from upstream (`matrix-js-sdk` imports).
  They're upstream noise; CI only fails on errors in our own SDK-free files. Check that
  your change adds no other errors.
- Windows file names ignore case: `CallRejoin.tsx` next to `callRejoin.ts` breaks imports
  there. Give the component and its helper file different names.
- Prettier rewrites line endings in upstream files on Windows. Don't commit files where
  only line endings changed.
- `WORD_SWAPS` word pairs are inside jokes about real people: never in code, tests or
  commits here (the repo is public). Use neutral examples like `hello=tchau`.
