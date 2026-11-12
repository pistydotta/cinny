import { globalStyle, keyframes, style } from '@vanilla-extract/css';

/*
 * "Tentos": Truco and Fodinha drawn from above on graphite, with thin rings instead of felt.
 * Same palette as the poker bar: neutral outlined controls, one sober gold for the main
 * action, the turn and what just happened.
 */
const GOLD = '#d8b872';
const TURN_GREEN = '#a7e593';
const GOLD_TEXT = '#1a150b';
const INK = '#ebe8e1';
const MUTED = '#8f8d87';
const LINE = '#2e3037';
const SURFACE = '#141518';
const RAISED = '#1b1c20';
const CARD = '#f5f1e8';
const RED = '#a3352b';
const SERIF = "'Fraunces', 'Iowan Old Style', 'Palatino Linotype', Georgia, serif";

export const Screen = style({
  position: 'relative',
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  background: SURFACE,
  color: INK,
  fontSize: 13,
});

export const Stage = style({ position: 'relative', flex: 1, minHeight: 320 });
/* The seats and the cards; on a phone it starts below the corners so the tentos stay clear. */
export const Felt = style({
  position: 'absolute',
  inset: 0,
  selectors: { '&[data-layout="portrait"]': { top: 92 } },
});

export const Rings = style({
  position: 'absolute',
  left: '50%',
  top: '47%',
  width: 'min(62vh, 70%)',
  aspectRatio: '1',
  transform: 'translate(-50%, -50%)',
  borderRadius: '50%',
  border: `1px solid ${LINE}`,
  pointerEvents: 'none',
  '::after': {
    content: '""',
    position: 'absolute',
    inset: '18%',
    borderRadius: '50%',
    border: `1px dashed ${LINE}`,
  },
});

export const Corner = style({
  position: 'absolute',
  top: 14,
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  zIndex: 3,
  selectors: {
    '&[data-side="left"]': { left: 14 },
    '&[data-side="right"]': { right: 14 },
  },
});
export const TableName = style({ color: MUTED, fontSize: 12, marginTop: 6, maxWidth: 180 });

export const TrucoTableName = style({
  position: 'absolute',
  top: 23,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 3,
  maxWidth: 'min(280px, calc(100% - 310px))',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: 12,
  color: '#f3e4ca',
  textShadow: '0 1px 3px #100a07, 0 0 8px #100a07',
  '@media': { '(max-width: 470px)': { top: 55, maxWidth: 'calc(100% - 28px)' } },
});
export const TrucoScoreboard = style({
  position: 'absolute',
  top: 57,
  left: 14,
  zIndex: 3,
  display: 'grid',
  justifyItems: 'start',
  gap: 6,
  '@media': { '(max-width: 470px)': { top: 76 } },
});

export const TrucoOverlays = style({
  display: 'contents',
  selectors: {
    '&[data-responding="true"]': {
      position: 'absolute',
      top: 52,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 4,
      display: 'grid',
      justifyItems: 'center',
      gap: 6,
      width: 'min(392px, calc(100% - 24px))',
      pointerEvents: 'none',
    },
  },
  '@media': {
    '(max-width: 780px)': { selectors: { '&[data-responding="true"]': { top: 158 } } },
    '(max-width: 620px)': { selectors: { '&[data-responding="true"]': { top: 288 } } },
    '(max-width: 470px)': { selectors: { '&[data-responding="true"]': { top: 307 } } },
  },
});

const trucoCallImpact = keyframes({
  '0%, 30%, 100%': { boxShadow: '0 4px 16px #18090380' },
  '46%': { boxShadow: '0 4px 16px #18090380, 0 0 0 2px #edbc735e' },
});
export const TrucoCall = style({
  width: '100%',
  boxSizing: 'border-box',
  display: 'grid',
  gap: 8,
  padding: '10px 12px',
  background: '#23160ff7',
  color: '#fff1d8',
  border: '1px solid #896642',
  borderRadius: 10,
  boxShadow: '0 4px 16px #18090380',
  pointerEvents: 'auto',
  '@media': {
    '(prefers-reduced-motion: no-preference)': { animation: `${trucoCallImpact} 450ms` },
  },
});
export const TrucoCallHeader = style({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 8,
  overflowWrap: 'anywhere',
});
export const TrucoCallDetail = style({ display: 'block', color: '#e5c9a6', fontSize: 12 });
export const TrucoCallClock = style({
  padding: '2px 7px',
  borderRadius: 5,
  background: GOLD,
  color: GOLD_TEXT,
  fontWeight: 650,
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
});
export const TrucoCallTimer = style({
  height: 4,
  borderRadius: 999,
  overflow: 'hidden',
  background: '#ffffff23',
  color: GOLD,
  selectors: { '&[data-urgent="true"]': { color: '#ff906d' } },
});
globalStyle(`${TrucoCallTimer} > div`, {
  height: '100%',
  borderRadius: 'inherit',
  background: 'currentColor',
  transformOrigin: 'left center',
  transition: 'transform 250ms linear',
  '@media': { '(prefers-reduced-motion: reduce)': { transition: 'none' } },
});
export const TrucoCallActions = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 5,
});
export const TrucoCallOption = style({
  flex: '1 1 0',
  minWidth: 0,
  minHeight: 44,
  display: 'grid',
  placeContent: 'center',
  gap: 3,
  padding: '6px 4px',
  borderRadius: 9,
  border: '1px solid #8b6b51',
  background: '#342319',
  color: '#fff1d8',
  font: 'inherit',
  cursor: 'pointer',
  selectors: {
    '&:hover:not(:disabled)': { borderColor: GOLD },
    '&:focus-visible': { outline: `2px solid ${GOLD}`, outlineOffset: 2 },
    '&:disabled': { opacity: 0.6, cursor: 'default' },
    '&[aria-pressed="true"], &[data-confirm]': {
      background: GOLD,
      borderColor: GOLD,
      color: GOLD_TEXT,
      fontWeight: 650,
    },
    '&[data-confirm]': { flexBasis: '100%' },
    '&[data-partner-vote="true"]': {
      background: '#28382a',
      borderColor: '#b9d99e',
      color: '#f2f7e9',
      boxShadow: 'inset 0 0 0 1px #b9d99e',
    },
  },
});
export const TrucoCallOptionLabel = style({ lineHeight: 1.15, fontWeight: 650 });
export const TrucoPartnerMark = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifySelf: 'center',
  gap: 4,
  padding: '2px 5px 2px 2px',
  borderRadius: 999,
  color: '#ecf8da',
  background: '#486047',
  fontSize: 10,
  lineHeight: 1.1,
});
export const TrucoPartnerAvatar = style({
  width: 16,
  height: 16,
  flexShrink: 0,
  display: 'grid',
  placeItems: 'center',
  overflow: 'hidden',
  borderRadius: '50%',
  background: '#def0c9',
  color: '#203122',
  fontSize: 8,
  fontWeight: 700,
});
globalStyle(`${TrucoPartnerAvatar} > img`, { width: '100%', height: '100%', objectFit: 'cover' });
export const TrucoCallHint = style({ flexBasis: '100%', color: '#e5c9a6', fontSize: 11 });
export const TrucoPlayStatus = style({
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
});
export const TrucoPlayActions = style({
  position: 'absolute',
  left: 'calc(50% + var(--hand-card-w) * 1.65 + 12px)',
  bottom: 14,
  zIndex: 2,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 6,
  '@media': {
    '(max-width: 580px)': { left: 'auto', right: 10, bottom: 106, alignItems: 'flex-end' },
  },
});
export const TrucoAsk = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 9,
  minHeight: 44,
  padding: '4px 15px 4px 12px',
  borderRadius: 999,
  border: '1px solid #dbb989',
  background: 'linear-gradient(165deg, #492923, #2b1916)',
  boxShadow: '0 3px 9px #180b08a0',
  color: '#fff0d7',
  font: 'inherit',
  fontWeight: 650,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  selectors: {
    '&:hover:enabled': { background: '#60372a', borderColor: '#ffe3ac' },
    '&:active:enabled': { transform: 'translateY(1px)' },
    '&:focus-visible': { outline: '2px solid #ffe3ac', outlineOffset: 3 },
    '&:disabled': { opacity: 0.6, cursor: 'default' },
  },
});
export const RaiseCards = style({
  position: 'relative',
  display: 'inline-grid',
  placeItems: 'center',
  width: 25,
  height: 26,
  flexShrink: 0,
  '::before': {
    content: '""',
    position: 'absolute',
    width: 14,
    height: 19,
    left: 2,
    top: 3,
    borderRadius: 3,
    border: '1px solid #edcda0',
    background: 'repeating-linear-gradient(45deg, #642d2b 0 2px, #85413a 2px 3px)',
    transform: 'rotate(-17deg)',
  },
});
globalStyle(`${RaiseCards} > span`, {
  zIndex: 0,
  display: 'grid',
  placeItems: 'center',
  width: 16,
  height: 21,
  marginLeft: 7,
  borderRadius: 3,
  background: '#faedcc',
  color: '#39261a',
  fontFamily: SERIF,
  fontSize: 9,
  transform: 'rotate(13deg)',
  boxShadow: '0 1px 3px #1a0e09aa',
});

export const Pill = style({
  height: 34,
  padding: '0 14px',
  borderRadius: 999,
  border: `1px solid #4b4b52`,
  background: RAISED,
  color: INK,
  font: 'inherit',
  fontSize: 13,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  selectors: {
    '&:hover:not(:disabled)': { borderColor: '#6a6a72' },
    '&:disabled': { opacity: 0.4, cursor: 'default' },
    '&:focus-visible': { outline: `2px solid ${GOLD}`, outlineOffset: 2 },
    '&[data-primary="true"]': {
      background: GOLD,
      borderColor: GOLD,
      color: GOLD_TEXT,
      fontWeight: 600,
    },
    '&[aria-pressed="true"]': { borderColor: GOLD, color: GOLD },
  },
});

export const TrucoBack = style([
  Pill,
  {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    paddingInline: 11,
    background: '#20160feb',
    borderColor: '#916d4b',
    color: '#fff1db',
    selectors: { '&:hover:enabled': { background: '#38251a', borderColor: GOLD } },
  },
]);

/* Score plaque: Nós / Eles with gold numbers and truco riscos, like a bar chalkboard. */
export const Score = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 7,
  padding: '9px 13px',
  borderRadius: 12,
  background: '#17100aee',
  border: '1px solid #7c5c30',
  boxShadow: '0 5px 16px #0008',
});
export const ScoreRow = style({
  display: 'grid',
  gridTemplateColumns: '40px 22px 1fr',
  alignItems: 'center',
  columnGap: 11,
  minHeight: 24,
});
export const ScoreTeam = style({ fontFamily: SERIF, fontSize: 15, color: '#e8dcc4' });
export const ScoreNum = style({
  fontFamily: SERIF,
  fontSize: 23,
  fontWeight: 600,
  lineHeight: 1,
  textAlign: 'center',
  color: '#c9b48e',
  selectors: { '&[data-ours="true"]': { color: GOLD } },
});
export const Riscos = style({
  display: 'inline-flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 8,
  maxWidth: 110,
  minHeight: 18,
});
export const HandTricks = style({
  boxSizing: 'border-box',
  width: 142,
  maxWidth: 'calc(100vw - 28px)',
  padding: '6px 7px',
  border: '1px solid #7c5c30',
  borderRadius: 7,
  background: '#1a120ded',
  color: '#fff0d7',
});
export const HandTricksHeading = style({
  display: 'block',
  marginBottom: 3,
  color: '#dcc398',
  fontSize: 11,
  fontWeight: 650,
});
export const HandTricksList = style({
  display: 'grid',
  rowGap: 3,
  margin: 0,
  padding: 0,
  listStyle: 'none',
  fontSize: 12,
  lineHeight: '16px',
  vars: { '--card-w': '32px' },
});
globalStyle(`${HandTricksList} > li`, {
  display: 'grid',
  gridTemplateColumns: '17px minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: 3,
});
globalStyle(`${HandTricksList} > li > :first-child`, { color: '#d6b983' });
globalStyle(`${HandTricksList} > li[data-mark="open"]`, { color: '#d4bfaa' });
export const HandTricksName = style({
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});
export const RiscoGroup = style({
  position: 'relative',
  display: 'inline-flex',
  gap: 3,
  padding: '0 2px',
});
export const Risco = style({
  width: 2.5,
  height: 18,
  borderRadius: 1,
  background: '#b7ad99',
  transform: 'rotate(-16deg)',
});
globalStyle(`${RiscoGroup}[data-ours="true"] ${Risco}`, { background: GOLD });
globalStyle(`${RiscoGroup}[data-five="true"]::after`, {
  content: '""',
  position: 'absolute',
  left: -2,
  right: -2,
  top: '46%',
  height: 2.5,
  borderRadius: 1,
  background: '#b7ad99',
  transform: 'rotate(-28deg)',
});
globalStyle(`${RiscoGroup}[data-five="true"][data-ours="true"]::after`, { background: GOLD });

export const Center = style({
  position: 'absolute',
  left: '50%',
  top: '47%',
  transform: 'translate(-50%, -50%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  textAlign: 'center',
  zIndex: 1,
  maxWidth: 220,
});
export const CenterTitle = style({ fontFamily: SERIF, fontSize: 15, color: GOLD });
export const CenterLine = style({ color: MUTED, fontSize: 12 });
export const MatchResult = style({
  position: 'absolute',
  left: '50%',
  top: '47%',
  transform: 'translate(-50%, -50%)',
  zIndex: 2,
  boxSizing: 'border-box',
  width: 'min(256px, calc(100% - 24px))',
  padding: '11px 12px',
  border: '1px solid #a88656',
  borderRadius: 9,
  background: 'linear-gradient(150deg, #39241b, #21140f)',
  boxShadow: '0 5px 16px #160b08b3',
  color: '#fff1db',
});
export const MatchResultHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 8,
  fontSize: 15,
  lineHeight: 1.25,
});
export const MatchResultScore = style({
  flexShrink: 0,
  borderRadius: 4,
  padding: '2px 5px',
  background: '#503727',
  color: '#ffe1a7',
  fontSize: 13,
  fontVariantNumeric: 'tabular-nums',
});
export const MatchResultPlayers = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '5px 10px',
  margin: '8px 0 0',
  padding: '7px 0 0',
  borderTop: '1px solid #d3af754d',
  listStyle: 'none',
  fontSize: 12,
});
export const MatchResultPlayer = style({
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  minWidth: 0,
  overflowWrap: 'anywhere',
});
export const MatchResultAvatar = style({
  width: 21,
  height: 21,
  flexShrink: 0,
  display: 'grid',
  placeItems: 'center',
  boxSizing: 'border-box',
  border: '1px solid #a88656',
  borderRadius: '50%',
  overflow: 'hidden',
  background: '#563c2b',
  color: '#fff1db',
  fontSize: 9,
  fontWeight: 650,
});
export const MatchResultActions = style({
  display: 'flex',
  justifyContent: 'center',
  marginTop: 9,
});
export const TrucoHandResult = style({
  position: 'absolute',
  top: 'max(146px, 34%)',
  left: '50%',
  transform: 'translate(-50%, -100%)',
  zIndex: 3,
  display: 'grid',
  justifyItems: 'center',
  gap: 8,
  width: 'max-content',
  maxWidth: 'calc(100% - 24px)',
  textAlign: 'center',
});
export const TrucoHandOutcome = style({
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  padding: '6px 10px',
  border: '1px solid #a88656',
  borderRadius: 8,
  background: '#291a12f5',
  color: '#fff1db',
  fontSize: 13,
});
export const TrucoNextHand = style({ display: 'flex', justifyContent: 'center' });
export const TrucoCenterStatus = style({ color: '#e9d7bf', fontSize: 12 });
export const TrucoCenterActions = style({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: 6,
  marginTop: 5,
});
export const Callout = style({
  marginTop: 4,
  padding: '4px 12px',
  borderRadius: 999,
  border: `1px solid ${GOLD}`,
  color: GOLD,
  fontFamily: SERIF,
  fontSize: 14,
  selectors: { '&[data-quiet="true"]': { borderColor: LINE, color: INK, fontSize: 13 } },
});
// Truco's three tricks: gold for us, a muted red for them, outlined while still open.
export const Marks = style({ display: 'flex', gap: 6, marginTop: 2 });
export const Mark = style({
  minWidth: 26,
  padding: '1px 6px',
  borderRadius: 999,
  border: `1px solid ${LINE}`,
  color: MUTED,
  fontSize: 11,
  selectors: {
    '&[data-mark="us"]': { background: GOLD, borderColor: GOLD, color: GOLD_TEXT },
    '&[data-mark="them"]': { background: '#6b3a35', borderColor: '#6b3a35', color: INK },
    '&[data-mark="tie"]': { borderColor: MUTED, color: INK },
  },
});

export const Card = style({
  position: 'relative',
  width: 'var(--card-w, 46px)',
  height: 'calc(var(--card-w, 46px) * 1.4)',
  borderRadius: 6,
  background: CARD,
  color: '#1b1b1d',
  fontFamily: SERIF,
  boxSizing: 'border-box',
  padding: '4px 5px',
  lineHeight: 1,
  fontSize: 'calc(var(--card-w, 46px) * 0.34)',
  flexShrink: 0,
  transition: 'transform 120ms ease, opacity 120ms ease',
  selectors: {
    '&[data-red="true"]': { color: RED },
    '&[data-back="true"]': {
      background: '#24252a',
      border: `1px solid #6d5c36`,
      backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 5px, #2c2d33 5px 6px)',
    },
    '&[data-deck]': {
      background: 'white center / 100% 100% no-repeat',
      border: 0,
      borderRadius: '6% / 4.3%',
      boxShadow: '0 2px 4px #0006',
    },
    '&[data-deck="spanish"]': {
      height: 'calc(var(--card-w, 46px) * 319 / 208)',
      backgroundImage: 'var(--truco-art)',
      backgroundSize: '1200% 500%',
      borderRadius: '7% / 4.5%',
    },
    // Age the stark vector deck toward the warm ivory of the reference: a sepia wash and a
    // faint inner frame, so the white reads as cream and the inks warm up.
    '&[data-deck="paulista"]': {
      filter: 'sepia(0.3) saturate(0.84) brightness(1.02)',
      boxShadow: '0 2px 5px #0007, inset 0 0 0 1.5px #3a280c1f',
    },
    '&[data-win="true"]': { outline: `2px solid ${GOLD}`, outlineOffset: 2 },
    '&[data-dim="true"]': { opacity: 0.6 },
  },
});
export const CardSuit = style({ display: 'block', fontSize: '0.8em', marginTop: 2 });
globalStyle(`${HandTricksList} ${Card}[data-deck="paulista"]`, { filter: 'none' });

const trucoCardStrike = keyframes({
  '0%': {
    opacity: 0,
    transform: 'translate(var(--strike-x), -30px) rotate(var(--strike-angle)) scale(1.1)',
    boxShadow: '0 16px 18px #17090366',
  },
  '14%': { opacity: 1 },
  '43%': {
    opacity: 1,
    transform: 'translate(var(--strike-x), 2px) rotate(var(--strike-angle)) scaleY(0.9)',
    boxShadow: '0 2px 4px #170903cc',
  },
  '59%, 79%': {
    opacity: 1,
    transform: 'translateX(var(--strike-x)) rotate(var(--strike-angle)) scaleY(0.94)',
    boxShadow: '0 3px 5px #170903bb',
  },
  '100%': {
    opacity: 0,
    transform: 'translateX(var(--strike-x)) rotate(var(--strike-angle)) scaleY(0.94)',
    boxShadow: '0 3px 5px #17090300',
  },
});
export const TrucoStrike = style({
  position: 'absolute',
  left: '50%',
  top: '64%',
  zIndex: 3,
  display: 'grid',
  transform: 'translate(-50%, -50%)',
  pointerEvents: 'none',
  vars: { '--card-w': 'clamp(35px, 7vw, 54px)' },
  '@media': { '(prefers-reduced-motion: reduce)': { display: 'none' } },
});
globalStyle(`${TrucoStrike} > ${Card}`, {
  gridArea: '1 / 1',
  vars: { '--strike-x': '-15px', '--strike-angle': '-13deg' },
  animation: `${trucoCardStrike} 420ms ease-out both`,
});
globalStyle(`${TrucoStrike} > ${Card}:last-child`, {
  vars: { '--strike-x': '12px', '--strike-angle': '10deg' },
  animationDelay: '30ms',
});
export const CardBig = style({
  position: 'absolute',
  right: '12%',
  bottom: '8%',
  fontSize: '1.35em',
});

export const TrickResults = style({
  position: 'absolute',
  top: 52,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 3,
  display: 'grid',
  gap: 6,
  width: 'min(300px, calc(100% - 24px))',
  pointerEvents: 'none',
  selectors: {
    [`${TrucoOverlays}[data-responding="true"] &`]: {
      position: 'static',
      transform: 'none',
    },
  },
  '@media': { '(max-width: 620px)': { top: 322 }, '(max-width: 470px)': { top: 341 } },
});

export const TrickNotice = style({
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  padding: '6px 10px',
  vars: { '--card-w': '25px' },
  background: '#1a100bf2',
  color: INK,
  border: '1px solid #896642',
  borderRadius: 9,
  boxShadow: '0 4px 12px #0005',
  fontSize: 12,
  overflowWrap: 'anywhere',
});
export const TrickNoticeTitle = style({ color: GOLD, fontSize: 11, fontWeight: 650 });
export const TrickNoticeDetail = style({ color: '#d8c8b5', fontSize: 11 });

export const Placed = style({
  position: 'absolute',
  transform: 'translate(-50%, -50%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  zIndex: 2,
  animationName: keyframes({
    from: { opacity: 0, transform: 'translate(-50%, -40%) scale(0.92)' },
    to: { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
  }),
  animationDuration: '180ms',
  animationTimingFunction: 'ease-out',
});
export const PlacedName = style({
  maxWidth: 90,
  padding: '1px 7px',
  borderRadius: 999,
  background: RAISED,
  border: `1px solid ${LINE}`,
  color: INK,
  fontSize: 11,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  selectors: {
    '&[data-latest="true"]': { borderColor: GOLD },
    '&[data-win="true"]': { background: GOLD, borderColor: GOLD, color: GOLD_TEXT },
  },
});

export const Seat = style({
  position: 'absolute',
  transform: 'translate(-50%, -50%)',
  width: 120,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 3,
  textAlign: 'center',
  zIndex: 2,
  selectors: { '&[data-out="true"]': { opacity: 0.4 } },
});
export const Avatar = style({
  position: 'relative',
  width: 42,
  height: 42,
  borderRadius: '50%',
  background: '#2a2b30',
  border: `1.5px solid #3c3d43`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#cfc8b8',
  fontSize: 13,
  selectors: {
    '&[data-turn="true"]': { borderColor: GOLD },
    '&[data-empty="true"]': {
      borderStyle: 'dashed',
      borderColor: '#55555c',
      background: 'transparent',
    },
  },
});
export const AvatarImage = style({
  width: '100%',
  height: '100%',
  borderRadius: '50%',
  objectFit: 'cover',
});
const countdown = keyframes({
  from: { strokeDashoffset: 0 },
  to: { strokeDashoffset: 'var(--ring-length)' },
});
export const Ring = style({
  position: 'absolute',
  inset: -5,
  width: 52,
  height: 52,
  transform: 'rotate(-90deg)',
  pointerEvents: 'none',
});
export const RingFill = style({
  fill: 'none',
  stroke: GOLD,
  strokeWidth: 3,
  strokeLinecap: 'round',
  strokeDasharray: 'var(--ring-length)',
  animationName: countdown,
  animationTimingFunction: 'linear',
  animationFillMode: 'both',
});
export const SeatName = style({
  maxWidth: 120,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});
export const SeatSub = style({
  color: MUTED,
  fontSize: 11,
  selectors: { '&[data-tone="gold"]': { color: GOLD } },
});
export const Lives = style({ display: 'flex', gap: 3 });
export const Life = style({
  width: 3,
  height: 12,
  borderRadius: 1,
  background: GOLD,
  selectors: { '&[data-lost="true"]': { background: '#3a3b41' } },
});
export const SeatCards = style({ display: 'flex', gap: 2, vars: { '--card-w': '24px' } });
export const Count = style({ color: MUTED, fontSize: 11, alignSelf: 'center', marginLeft: 3 });
/* Truco: one dot per card an opponent still holds, by their name. */
export const Pips = style({ display: 'flex', gap: 5, marginTop: 1 });
export const Pip = style({
  width: 7,
  height: 7,
  borderRadius: '50%',
  boxSizing: 'border-box',
  background: '#2c2d33',
  border: '1px solid #45474e',
  selectors: {
    '&[data-on="true"]': {
      background: '#56c46a',
      borderColor: '#56c46a',
      boxShadow: '0 0 4px #56c46a99',
    },
  },
});

export const Bar = style({
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  padding: '12px 18px 16px',
  borderTop: `1px solid ${LINE}`,
  background: '#0f1013',
  '@media': { 'screen and (max-width: 640px)': { padding: '10px 12px 12px' } },
});
export const Status = style({
  color: MUTED,
  minHeight: 18,
  selectors: { '&[data-mine="true"]': { color: GOLD } },
});
export const BarRow = style({
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
});
export const Hand = style({
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  vars: { '--card-w': '58px' },
  selectors: {
    '&[data-many="true"]': { gap: 4, vars: { '--card-w': '44px' } },
    '&[data-fanned="true"]': {
      position: 'absolute',
      zIndex: 2,
      bottom: 12,
      left: '50%',
      transform: 'translateX(-50%)',
      alignItems: 'flex-end',
      flexWrap: 'nowrap',
      gap: 0,
      vars: { '--card-w': 'var(--hand-card-w, 52px)' },
    },
  },
});
export const HandButton = style({
  padding: 0,
  border: 'none',
  background: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  transition: 'transform 120ms ease',
  selectors: {
    '&:hover:not(:disabled)': { transform: 'translateY(-6px)' },
    '&:disabled': { cursor: 'default' },
    '&:focus-visible': { outline: `2px solid ${GOLD}`, outlineOffset: 3 },
  },
});
export const Actions = style({ display: 'flex', gap: 8, flexWrap: 'wrap', marginLeft: 'auto' });

const FAN = `${Hand}[data-fanned="true"]`;
const turnFanLift = keyframes({
  '0%, 100%': { translate: '0 0' },
  '42%': { translate: '0 -8px' },
});
globalStyle(`${FAN}[data-play-turn="true"]`, {
  '@media': {
    '(prefers-reduced-motion: no-preference)': { animation: `${turnFanLift} 540ms ease-out` },
  },
});
globalStyle(`${FAN} > ${HandButton}`, {
  position: 'relative',
  transformOrigin: 'center bottom',
  transform: 'translateY(var(--hand-drop)) rotate(var(--hand-angle))',
  boxShadow: '0 4px 12px #0009',
  '@media': { '(prefers-reduced-motion: reduce)': { transition: 'none' } },
});
globalStyle(`${FAN} > ${HandButton} + ${HandButton}`, { marginInlineStart: -8 });
globalStyle(`${FAN} > ${HandButton}:hover:not(:disabled), ${FAN} > ${HandButton}:focus-visible`, {
  zIndex: 1,
  transform: 'translateY(-12px) rotate(var(--hand-angle))',
});

/* The sheet over the table: seats, bots and invitations. */
export const Scrim = style({
  position: 'absolute',
  inset: 0,
  zIndex: 10,
  background: '#0b0c0ecc',
  display: 'flex',
  justifyContent: 'flex-end',
});
export const Sheet = style({
  width: 'min(360px, 100%)',
  height: '100%',
  boxSizing: 'border-box',
  overflowY: 'auto',
  padding: 18,
  background: RAISED,
  borderLeft: `1px solid ${LINE}`,
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
});
export const SheetHead = style({ display: 'flex', alignItems: 'flex-start', gap: 8 });
export const SheetTitle = style({ fontFamily: SERIF, fontSize: 19, margin: 0, fontWeight: 500 });
export const SectionLabel = style({ color: MUTED, fontSize: 12, margin: '4px 0 0' });
export const SeatRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  minHeight: 38,
  padding: '4px 8px',
  borderRadius: 8,
  selectors: { '&[data-empty="true"]': { border: `1px dashed #3d3e45` } },
});
export const SmallAvatar = style([Avatar, { width: 28, height: 28, fontSize: 11 }]);
export const Grow = style({ flex: 1, minWidth: 0 });
export const Muted = style({ color: MUTED, fontSize: 12, lineHeight: 1.5 });
export const ErrorText = style({ color: '#e7a69c', fontSize: 12 });

/* Lobby. */
export const Lobby = style({
  width: '100%',
  height: '100%',
  overflowY: 'auto',
  background: SURFACE,
  color: INK,
});
export const LobbyInner = style({
  maxWidth: 760,
  margin: '0 auto',
  padding: '24px 16px 48px',
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
});
export const LobbyHead = style({ display: 'flex', alignItems: 'center', gap: 12 });
export const LobbyTitle = style({ fontFamily: SERIF, fontSize: 26, fontWeight: 500, margin: 0 });
export const List = style({
  display: 'flex',
  flexDirection: 'column',
  border: `1px solid ${LINE}`,
  borderRadius: 12,
  overflow: 'hidden',
});
export const ListRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 14px',
  background: 'none',
  border: 'none',
  borderTop: `1px solid ${LINE}`,
  color: INK,
  font: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
  selectors: {
    '&:first-child': { borderTop: 'none' },
    '&:hover': { background: RAISED },
    '&:focus-visible': { outline: `2px solid ${GOLD}`, outlineOffset: -2 },
  },
});
export const Tag = style({
  padding: '2px 8px',
  borderRadius: 999,
  border: `1px solid ${GOLD}`,
  color: GOLD,
  fontSize: 11,
});
export const Form = style({ display: 'flex', flexDirection: 'column', gap: 12 });
export const Field = style({ display: 'flex', flexDirection: 'column', gap: 6, color: MUTED });
export const Input = style({
  height: 38,
  padding: '0 12px',
  borderRadius: 8,
  border: `1px solid #3d3e45`,
  background: SURFACE,
  color: INK,
  font: 'inherit',
  selectors: { '&:focus-visible': { outline: `2px solid ${GOLD}`, outlineOffset: 1 } },
});
export const Choices = style({ display: 'flex', gap: 6, flexWrap: 'wrap' });

globalStyle(`${Sheet} details summary`, { cursor: 'pointer', color: MUTED });

/*
 * Truco at the bar: the photo fills the stage, the players sit on its chairs and the cards
 * lie on the plastic table.
 */
const SCENE = `${Felt}[data-scene="true"]`;
const SHADE = '#120a06d9';
export const Scene = style({
  position: 'absolute',
  maxWidth: 'none',
  pointerEvents: 'none',
  userSelect: 'none',
});
export const SceneVira = style({
  position: 'absolute',
  zIndex: 2,
  transform: 'translate(-50%, -50%)',
});
export const ViraStack = style({
  display: 'grid',
  paddingTop: 'var(--vira-extension)',
  transform: 'rotate(90deg)',
});
export const PlayedIndex = style({
  marginLeft: 6,
  fontSize: 16,
});
globalStyle(`${PlacedName}[data-card-index="true"]`, { maxWidth: 'none', lineHeight: '20px' });
export const ViraFace = style({
  gridArea: '1 / 1',
  transform: 'translate(0, calc(-1 * var(--vira-extension))) rotate(-14deg)',
});
globalStyle(`${ViraFace} > ${Card}`, {
  boxShadow: 'inset 0 0 0 1px #a5714880, 2px 1px 1px #35130973, 4px 2px 5px #2b0d0766',
});
globalStyle(`${ViraFace} > ${Card}::after`, {
  content: '""',
  position: 'absolute',
  inset: 0,
  borderRadius: 'inherit',
  background:
    'linear-gradient(135deg, #fff2cb38, transparent 45%, #a2642424), repeating-linear-gradient(25deg, #9161300d 0 1px, transparent 1px 3px)',
  mixBlendMode: 'multiply',
  pointerEvents: 'none',
});
export const ViraDeck = style({
  gridArea: '1 / 1',
  display: 'grid',
});
globalStyle(`${ViraDeck} > ${Card}`, {
  gridArea: '1 / 1',
  boxShadow: '0 1px 0 1px #e0c6a3, 2px 2px 3px #2b0d07a6',
});
globalStyle(`${ViraDeck} > ${Card}:first-child`, {
  transform: 'translate(2px, 3px)',
  boxShadow: '1px 0 0 #9f7654, 3px 1px 0 #d5b894, 6px 2px 5px #2b0d0799',
});
globalStyle(`${ViraDeck} > ${Card}[data-deck="paulista"]:last-child::after`, {
  content: '""',
  position: 'absolute',
  inset: 2,
  border: '3px solid #f2ddba',
  borderRadius: 4,
  boxShadow: 'inset 0 0 0 1px #d1a66f, inset 0 0 0 3px #1e3438',
  background:
    'repeating-linear-gradient(45deg, #e9b87538 0 1px, transparent 1px 6px), repeating-linear-gradient(-45deg, #e9b87538 0 1px, transparent 1px 6px), radial-gradient(ellipse at center, #34585a, #16272c 75%)',
});
globalStyle(`${ViraDeck} > ${Card}[data-deck="paulista"]:last-child::before`, {
  content: '"♦"',
  position: 'absolute',
  zIndex: 1,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  display: 'grid',
  placeItems: 'center',
  width: '43%',
  aspectRatio: '1',
  border: '1px solid #dbb982',
  borderRadius: '50%',
  background: '#20373c',
  boxShadow: '0 0 0 2px #20373c, inset 0 0 0 2px #20373c, inset 0 0 0 3px #b58c5a',
  color: '#f1cc93',
  fontSize: 'calc(var(--card-w) * 0.23)',
});
globalStyle(SCENE, { top: 0, overflow: 'hidden' });
globalStyle(`${Stage}:has(${SCENE})`, { background: '#2b170b' });
globalStyle(`${Screen}:has(${SCENE}) ${Bar}`, {
  background: 'linear-gradient(#1a0e07, #0f0805)',
  borderTopColor: '#5a2a14',
});
export const CardOnTable = style({
  position: 'relative',
  width: 'var(--card-w)',
  // Reserve the projected height so the label stays at the card's bottom edge.
  height: 'calc(var(--card-w) * 1.05)',
});
globalStyle(`${CardOnTable} > ${Card}`, {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%) perspective(480px) rotateX(49deg) rotateZ(var(--tilt, 0deg))',
  boxShadow: '0 1px 1px 1px #2b0d07a8, 0 2px 3px #220b08b3',
});
globalStyle(`${CardOnTable} > ${Card}::after`, {
  content: '""',
  position: 'absolute',
  inset: 0,
  borderRadius: 'inherit',
  background: 'linear-gradient(150deg, #ffbf5910, #9c3d1b20)',
  mixBlendMode: 'multiply',
  pointerEvents: 'none',
});
globalStyle(`${SCENE} ${Placed}`, { gap: 2 });
globalStyle(`${SCENE} ${PlacedName}:not([data-win="true"])`, {
  background: '#2c140ce8',
  borderColor: 'transparent',
});
globalStyle(`${SCENE} ${PlacedName}[data-latest="true"]:not([data-win="true"])`, {
  borderColor: '#947247',
});
globalStyle(`${SCENE} ${Center}`, {
  padding: '10px 14px',
  borderRadius: 14,
  background: '#0b0d14b3',
  backdropFilter: 'blur(3px)',
  zIndex: 1,
});
globalStyle(`${SCENE} ${Avatar}`, {
  width: 54,
  height: 54,
  borderWidth: 3,
  borderColor: GOLD,
  background: 'radial-gradient(circle at 50% 32%, #34352f, #191a17)',
  fontFamily: SERIF,
  fontSize: 17,
  fontWeight: 600,
  color: '#ecd9ac',
  boxShadow: '0 6px 15px #000c, inset 0 0 0 1px #00000055',
});
globalStyle(`${SCENE} ${Avatar}[data-timed="true"]`, { borderColor: 'transparent' });
globalStyle(`${SCENE} ${Avatar}[data-play-turn="true"][data-timed="false"]`, {
  borderColor: TURN_GREEN,
});
const turnRingPulse = keyframes({
  '0%, 100%': { filter: 'drop-shadow(0 0 2px #98eb7c66)' },
  '45%': { filter: 'drop-shadow(0 0 7px #98eb7ce6)' },
});
globalStyle(`${Avatar}[data-play-turn="true"] ${Ring}`, {
  filter: 'drop-shadow(0 0 2px #98eb7c66)',
  '@media': {
    '(prefers-reduced-motion: no-preference)': { animation: `${turnRingPulse} 720ms ease-out` },
  },
});
globalStyle(`${Avatar}[data-play-turn="true"] ${RingFill}`, { stroke: TURN_GREEN });
globalStyle(`${SCENE} ${Ring}`, {
  inset: '50% auto auto 50%',
  width: 60,
  height: 60,
  transform: 'translate(-50%, -50%) rotate(-90deg)',
});
globalStyle(`${SCENE} ${SeatName}, ${SCENE} ${SeatSub}`, {
  padding: '1px 9px',
  borderRadius: 999,
  background: SHADE,
});
globalStyle(`${SCENE} ${SeatName}`, {
  fontFamily: SERIF,
  fontSize: 14,
  color: '#f0e6d2',
  border: '1px solid #00000066',
});
globalStyle(`${SCENE} ${Pips}`, { padding: '3px 7px', borderRadius: 999, background: SHADE });
globalStyle(`${Stage}:has(${SCENE}) ${Corner}[data-side="right"] > ${Pill}`, {
  background: SHADE,
});
