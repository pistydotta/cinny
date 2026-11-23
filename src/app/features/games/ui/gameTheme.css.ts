import { assignVars, createThemeContract, globalStyle, style } from '@vanilla-extract/css';
import { color } from 'folds';
import { forgeColor } from '../../forge-theme/forgeColor.css';
import {
  forgeExtraDark,
  forgeMoneyDark,
  forgeMoneyLight,
  forgeStage,
} from '../../forge-theme/palette';

// The colours every game screen draws with. A screen picks where it sits: StageScope where the
// game is played (always dark), LobbyScope for lobbies, setup and dialogs (the app's theme).
// The kit's buttons, bars and dialogs read only these, so they fit either place.
export const game = createThemeContract({
  Bg: null,
  Raised: null,
  RaisedHover: null,
  Line: null,
  Ink: null,
  Muted: null,
  Accent: null,
  OnAccent: null,
  Critical: null,
  Money: null,
  MoneyContainer: null,
  OnMoney: null,
});

const money = (m: typeof forgeMoneyDark) => ({
  Money: m.Main,
  MoneyContainer: m.Container,
  OnMoney: m.OnMain,
});

const stage = {
  Bg: forgeStage.Base,
  Raised: forgeStage.Raised,
  RaisedHover: forgeStage.RaisedHover,
  Line: forgeStage.Line,
  Ink: forgeStage.Ink,
  Muted: forgeStage.Muted,
  // The light theme's ember is too dark for the stage; the stage keeps the dark one.
  Accent: forgeExtraDark.Ember.Main,
  OnAccent: forgeExtraDark.Ember.OnMain,
  Critical: forgeStage.Critical,
  ...money(forgeMoneyDark),
};

// The stage is also the default, so a shared game piece (an invite panel, a switch-table
// dialog) that some screen has not scoped yet keeps the dark look it always had.
globalStyle(':root', { vars: assignVars(game, stage) });

export const StageScope = style({ vars: assignVars(game, stage), color: game.Ink });

const lobby = (m: typeof forgeMoneyDark) => ({
  Bg: color.Surface.Container,
  Raised: color.SurfaceVariant.Container,
  RaisedHover: color.SurfaceVariant.ContainerHover,
  Line: color.SurfaceVariant.ContainerLine,
  Ink: color.Surface.OnContainer,
  Muted: forgeColor.Text.Secondary,
  Accent: forgeColor.Ember.Main,
  OnAccent: forgeColor.Ember.OnMain,
  Critical: color.Critical.Main,
  ...money(m),
});

export const LobbyScope = style({
  vars: assignVars(game, lobby(forgeMoneyLight)),
  color: game.Ink,
  selectors: { '.dark-theme &': { vars: assignVars(game, lobby(forgeMoneyDark)) } },
});
