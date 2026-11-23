// Forge: graphite surfaces with a dark wine-red accent. Plain data, so palette.test.ts can check
// contrast without loading vanilla-extract; colors.css.ts turns these into theme classes.

export const forgeDark = {
  Background: {
    Container: '#0C0D0F',
    ContainerHover: '#15171A',
    ContainerActive: '#1E2125',
    ContainerLine: '#262A2F',
    OnContainer: '#ECEEF0',
  },

  Surface: {
    Container: '#141619',
    ContainerHover: '#1D2024',
    ContainerActive: '#272B30',
    ContainerLine: '#2C3136',
    OnContainer: '#ECEEF0',
  },

  SurfaceVariant: {
    Container: '#1D2024',
    ContainerHover: '#272B30',
    ContainerActive: '#31363C',
    ContainerLine: '#383E44',
    OnContainer: '#ECEEF0',
  },

  // A step lighter than light mode's wine: #66241E sat at 1.6:1 on the dark panel, so a
  // selected or filled control barely showed.
  Primary: {
    Main: '#8E3326',
    MainHover: '#9A3A2C',
    MainActive: '#A6412F',
    MainLine: '#7A2B23',
    OnMain: '#FFFFFF',
    Container: '#2B1A1A',
    ContainerHover: '#341F1E',
    ContainerActive: '#3D2421',
    ContainerLine: '#472A26',
    OnContainer: '#EBCBC5',
  },

  Secondary: {
    Main: '#ECEEF0',
    MainHover: '#D9DCDF',
    MainActive: '#CBCFD3',
    MainLine: '#BDC2C7',
    OnMain: '#0C0D0F',
    Container: '#2A2E33',
    ContainerHover: '#33383E',
    ContainerActive: '#3C4248',
    ContainerLine: '#464C53',
    OnContainer: '#ECEEF0',
  },

  Success: {
    Main: '#3FB37F',
    MainHover: '#38A473',
    MainActive: '#329868',
    MainLine: '#2C8B5E',
    OnMain: '#04150D',
    Container: '#12382A',
    ContainerHover: '#164332',
    ContainerActive: '#1A4E3A',
    ContainerLine: '#1E5942',
    OnContainer: '#C9F0DD',
  },

  Warning: {
    Main: '#D9A441',
    MainHover: '#CB9838',
    MainActive: '#BE8D31',
    MainLine: '#B0822B',
    OnMain: '#1A1202',
    Container: '#3D2E0E',
    ContainerHover: '#483612',
    ContainerActive: '#533F16',
    ContainerLine: '#5E471A',
    OnContainer: '#F5E3BC',
  },

  Critical: {
    Main: '#E5534B',
    MainHover: '#D94A42',
    MainActive: '#CC423B',
    MainLine: '#BF3B34',
    OnMain: '#1A0504',
    Container: '#4A1A17',
    ContainerHover: '#561F1B',
    ContainerActive: '#622420',
    ContainerLine: '#6E2924',
    OnContainer: '#F8D3D0',
  },

  Other: {
    FocusRing: '#E06A52',
    Shadow: 'rgba(0, 0, 0, 0.6)',
    Overlay: 'rgba(0, 0, 0, 0.7)',
  },
};

export const forgeLight: typeof forgeDark = {
  Background: {
    Container: '#F7F8F9',
    ContainerHover: '#ECEEF0',
    ContainerActive: '#E1E4E7',
    ContainerLine: '#D5D8DC',
    OnContainer: '#15171A',
  },

  Surface: {
    Container: '#F7F8F9',
    ContainerHover: '#ECEEF0',
    ContainerActive: '#E1E4E7',
    ContainerLine: '#D5D8DC',
    OnContainer: '#15171A',
  },

  SurfaceVariant: {
    Container: '#FFFFFF',
    ContainerHover: '#F1F2F4',
    ContainerActive: '#E4E6E9',
    ContainerLine: '#D5D8DC',
    OnContainer: '#15171A',
  },

  Primary: {
    Main: '#66241E',
    MainHover: '#742C25',
    MainActive: '#82342C',
    MainLine: '#541D18',
    OnMain: '#FFFFFF',
    Container: '#EFDAD7',
    ContainerHover: '#E9CEC9',
    ContainerActive: '#E3C2BC',
    ContainerLine: '#DDB6AF',
    OnContainer: '#54170F',
  },

  Secondary: {
    Main: '#15171A',
    MainHover: '#24272B',
    MainActive: '#2F3338',
    MainLine: '#3A3F45',
    OnMain: '#F1F2F3',
    Container: '#D3D6DA',
    ContainerHover: '#C7CBD0',
    ContainerActive: '#BCC0C6',
    ContainerLine: '#B0B5BC',
    OnContainer: '#15171A',
  },

  Success: {
    Main: '#1F7A4D',
    MainHover: '#1B6E45',
    MainActive: '#18643E',
    MainLine: '#155A38',
    OnMain: '#FFFFFF',
    Container: '#CDE8DA',
    ContainerHover: '#C0E1D0',
    ContainerActive: '#B3DAC6',
    ContainerLine: '#A6D3BC',
    OnContainer: '#0F4A2D',
  },

  Warning: {
    Main: '#8A5A00',
    MainHover: '#7D5200',
    MainActive: '#714A00',
    MainLine: '#664300',
    OnMain: '#FFFFFF',
    Container: '#F0E0BD',
    ContainerHover: '#EBD7AC',
    ContainerActive: '#E6CE9B',
    ContainerLine: '#E0C58A',
    OnContainer: '#553700',
  },

  Critical: {
    Main: '#B3261E',
    MainHover: '#A3221B',
    MainActive: '#961F18',
    MainLine: '#891C16',
    OnMain: '#FFFFFF',
    Container: '#F5CFCC',
    ContainerHover: '#F1C2BE',
    ContainerActive: '#EDB5B0',
    ContainerLine: '#E9A8A2',
    OnContainer: '#7A1610',
  },

  Other: {
    FocusRing: '#B84A30',
    Shadow: 'rgba(0, 0, 0, 0.2)',
    Overlay: 'rgba(0, 0, 0, 0.5)',
  },
};

// Roles folds has no slot for. Ember is the bright accent for things that are not filled
// buttons: links, focus rings, the selected-row bar, switch and slider fills. It replaces the
// one-off embers features had picked to get the wine to show on dark. Text.Secondary and
// Text.Faint are the dimmer inks, so features stop fading text with opacity.
export const forgeExtraDark = {
  Ember: { Main: '#E06A52', OnMain: '#0C0D0F' },
  Text: { Secondary: '#A3A9B0', Faint: '#8A9099' },
};

export const forgeExtraLight: typeof forgeExtraDark = {
  Ember: { Main: '#B84A30', OnMain: '#FFFFFF' },
  Text: { Secondary: '#5C636B', Faint: '#6B7178' },
};

// Where a game is played (the felt, the table, the bars around it): always dark, in both modes,
// so cards and chips read the same for everyone. Lobbies and setup screens follow the theme
// instead (games/ui/gameTheme.css.ts).
export const forgeStage = {
  Base: '#0B0D10',
  Raised: '#171A1F',
  RaisedHover: '#20242A',
  Line: '#2A2E35',
  Ink: '#ECEEF0',
  Muted: '#9AA0A8',
  Critical: '#E5534B',
  // Poker's felt, where a lobby shows it.
  Felt: '#14532D',
};

// Gold means money and nothing else: balances, chips, pots and prizes.
export const forgeMoneyDark = { Main: '#E2B85A', Container: '#1A1508', OnMain: '#1A1508' };
export const forgeMoneyLight: typeof forgeMoneyDark = {
  Main: '#8A6410',
  Container: '#FBF3DF',
  OnMain: '#FFFFFF',
};
