import { style } from '@vanilla-extract/css';

/*
 * The felt, seats, avatars and cards reuse the poker table's styles (`pokerTable.css`). These are
 * the parts only Fodinha has: a fan of face-down cards per seat, penalty pips, the trick in the
 * middle and the hand below the table.
 */

const GOLD = '#f5c84b';

// Fits the stage in the window height, as the poker screen does, without scrolling past it.
export const Wrap = style({
  width: 'min(100%, calc((100vh - 230px) * 1.6))',
  minWidth: 'min(100%, 320px)',
  margin: '0 auto',
  selectors: {
    '&[data-layout="portrait"]': { width: 'min(100%, calc((100vh - 230px) * 0.625))' },
  },
});

export const Fan = style({
  position: 'absolute',
  bottom: 'calc(100% - var(--avatar) * 0.3)',
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  zIndex: 0,
  vars: { '--card-w': '4.4cqmin', '--overlap': '-0.3' },
  selectors: {
    '[data-layout="portrait"] &': { vars: { '--card-w': '6.4cqmin' } },
    '&[data-many="true"]': { vars: { '--overlap': '-0.38' } },
  },
});

export const FanCard = style({
  margin: '0 calc(var(--card-w) * var(--overlap))',
});

export const Pips = style({
  display: 'flex',
  justifyContent: 'center',
  gap: '0.5cqmin',
  marginTop: '0.4cqmin',
});

export const Pip = style({
  width: '1.1cqmin',
  height: '1.1cqmin',
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.18)',
  selectors: {
    '&[data-on="true"]': { background: '#ff5d5d', boxShadow: '0 0 0.6cqmin rgba(255,93,93,0.7)' },
    '[data-layout="portrait"] &': { width: '1.6cqmin', height: '1.6cqmin' },
  },
});

export const PlateLine = style({
  fontSize: '1.5cqmin',
  color: 'rgba(255,255,255,0.7)',
  whiteSpace: 'nowrap',
  selectors: {
    '[data-layout="portrait"] &': { fontSize: '2.3cqmin' },
  },
});

export const TrickCard = style({
  position: 'absolute',
  transform: 'translate(-50%, -50%)',
  zIndex: 2,
  vars: { '--card-w': '7.2cqmin' },
  selectors: {
    '[data-layout="portrait"] &': { vars: { '--card-w': '11cqmin' } },
  },
});

export const Center = style({
  position: 'absolute',
  left: '50%',
  top: '47%',
  transform: 'translate(-50%, -50%)',
  zIndex: 5,
  display: 'flex',
  alignItems: 'center',
  gap: '1.4cqmin',
  maxWidth: '38cqw',
  padding: '0.8cqmin 2cqmin',
  borderRadius: '1.6cqmin',
  background: 'rgba(5,12,8,0.55)',
  textAlign: 'center',
  lineHeight: 1.3,
  pointerEvents: 'none',
  selectors: {
    '[data-layout="portrait"] &': {
      maxWidth: '38cqw',
      gap: '1cqmin',
      padding: '0.8cqmin 1.4cqmin',
    },
  },
});

export const Vira = style({
  flexShrink: 0,
  vars: { '--card-w': '5.4cqmin' },
  selectors: {
    '[data-layout="portrait"] &': { vars: { '--card-w': '6.5cqmin' } },
  },
});

export const CenterTitle = style({
  fontSize: '2.1cqmin',
  fontWeight: 800,
  color: GOLD,
  selectors: {
    '[data-layout="portrait"] &': { fontSize: '3.2cqmin' },
  },
});

export const CenterLine = style({
  fontSize: '1.6cqmin',
  color: 'rgba(255,255,255,0.85)',
  selectors: {
    '[data-layout="portrait"] &': { fontSize: '2.5cqmin' },
  },
});

export const Hand = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 12,
  padding: '14px 12px 18px',
  borderRadius: 16,
  border: '1px solid #ffffff1f',
  background: 'rgba(5,8,13,0.55)',
});

export const HandStatus = style({
  fontSize: 15,
  fontWeight: 600,
  textAlign: 'center',
  selectors: {
    '&[data-mine="true"]': { color: GOLD },
  },
});

export const HandCards = style({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: 8,
  vars: { '--card-w': 'clamp(54px, 9vw, 86px)' },
  selectors: {
    // Up to 19 cards with two players: smaller cards keep the hand to a few rows.
    '&[data-many="true"]': { gap: 6, vars: { '--card-w': 'clamp(44px, 6vw, 68px)' } },
  },
});

export const HandCard = style({
  padding: 0,
  border: 0,
  background: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  transition: 'transform 150ms',
  selectors: {
    '&:hover:not(:disabled)': { transform: 'translateY(-8px)' },
    '&:disabled': { cursor: 'default' },
    '&:focus-visible': { outline: `3px solid ${GOLD}`, outlineOffset: 4 },
  },
});

export const Predictions = style({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: 8,
});

export const PredictButton = style({
  minWidth: 48,
  minHeight: 48,
  borderRadius: 12,
  border: `1px solid ${GOLD}aa`,
  background: `${GOLD}1a`,
  color: GOLD,
  fontSize: 20,
  fontWeight: 800,
  cursor: 'pointer',
  selectors: {
    '&:hover:not(:disabled)': { background: `${GOLD}33` },
    '&:disabled': { opacity: 0.4, cursor: 'default' },
    '&:focus-visible': { outline: '3px solid #9bc6ff', outlineOffset: 3 },
  },
});

export const Hint = style({ fontSize: 13, color: '#bec9d8', textAlign: 'center' });
