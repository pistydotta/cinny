import { keyframes, style } from '@vanilla-extract/css';
import { toRem } from 'folds';
import { forgeInset, forgeRadius, forgeSpace, forgeType, forgeZ } from '../../forge-theme/tokens';
import { game } from '../ui/gameTheme.css';
import { tint } from '../ui/tint';

const PHONE = 'screen and (max-width: 720px)';

export const Page = style({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  background: game.Bg,
});

export const Menu = style({
  flexGrow: 1,
  overflowY: 'auto',
  padding: forgeSpace.S400,
  display: 'flex',
  flexDirection: 'column',
  gap: forgeSpace.S500,
  maxWidth: toRem(1100),
  width: '100%',
  margin: '0 auto',
});

export const Row = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: forgeSpace.S300,
});

export const Label = style({
  ...forgeType.overline,
  color: game.Muted,
  textTransform: 'uppercase',
});

export const Note = style({ ...forgeType.bodySm, color: game.Muted });

export const Pickers = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: forgeSpace.S400,
  '@media': { [PHONE]: { gridTemplateColumns: '1fr' } },
});

export const Picker = style({
  display: 'flex',
  flexDirection: 'column',
  gap: forgeSpace.S300,
  padding: forgeSpace.S400,
  borderRadius: forgeRadius.card,
  background: game.Raised,
  boxShadow: forgeInset(game.Line),
  minWidth: 0,
});

export const PickerHead = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: forgeSpace.S300,
  flexWrap: 'wrap',
});

export const Chosen = style({
  display: 'flex',
  alignItems: 'center',
  gap: forgeSpace.S300,
  ...forgeType.title,
});

export const TeamList = style({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fill, minmax(${toRem(150)}, 1fr))`,
  gap: forgeSpace.S200,
  maxHeight: toRem(300),
  overflowY: 'auto',
  paddingRight: forgeSpace.S100,
});

export const TeamButton = style({
  display: 'flex',
  alignItems: 'center',
  gap: forgeSpace.S200,
  padding: `${forgeSpace.S200} ${forgeSpace.S300}`,
  border: 0,
  borderRadius: forgeRadius.control,
  background: 'transparent',
  color: game.Ink,
  font: 'inherit',
  ...forgeType.bodySm,
  textAlign: 'left',
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: game.RaisedHover },
    '&[aria-pressed="true"]': {
      background: tint(game.Accent, 14),
      boxShadow: forgeInset(game.Accent),
    },
  },
});

export const TeamName = style({
  flexGrow: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const Rating = style({
  ...forgeType.caption,
  color: game.Muted,
  fontVariantNumeric: 'tabular-nums',
});

// A tiny shirt: the kit's colour with its pattern in the second colour.
export const Shirt = style({
  flexShrink: 0,
  width: toRem(18),
  height: toRem(20),
  borderRadius: `${toRem(4)} ${toRem(4)} ${toRem(2)} ${toRem(2)}`,
  boxShadow: forgeInset(tint(game.Ink, 25)),
});

export const ShirtBig = style({ width: toRem(30), height: toRem(34) });

export const Keys = style({
  display: 'grid',
  gridTemplateColumns: 'auto 1fr',
  gap: `${forgeSpace.S100} ${forgeSpace.S400}`,
  ...forgeType.bodySm,
});

export const Key = style({
  fontFamily: 'inherit',
  fontWeight: 700,
  color: game.Ink,
  whiteSpace: 'nowrap',
});

export const Stage = style({ position: 'relative', flexGrow: 1, minHeight: 0 });

export const Canvas = style({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  display: 'block',
});

export const Overlay = style({
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  color: game.Ink,
});

export const Scoreboard = style({
  position: 'absolute',
  top: forgeSpace.S300,
  left: forgeSpace.S300,
  display: 'flex',
  alignItems: 'stretch',
  borderRadius: forgeRadius.control,
  overflow: 'hidden',
  background: tint(game.Bg, 88),
  boxShadow: forgeInset(game.Line),
  ...forgeType.heading,
  fontVariantNumeric: 'tabular-nums',
});

export const ScoreTeam = style({
  display: 'flex',
  alignItems: 'center',
  gap: forgeSpace.S200,
  padding: `${forgeSpace.S100} ${forgeSpace.S300}`,
});

export const ScoreValue = style({
  display: 'flex',
  alignItems: 'center',
  padding: `0 ${forgeSpace.S300}`,
  background: tint(game.Ink, 10),
});

export const Clock = style({
  display: 'flex',
  alignItems: 'center',
  padding: `0 ${forgeSpace.S300}`,
  color: game.Accent,
});

export const KitBar = style({ width: toRem(4), alignSelf: 'stretch' });

export const PowerBar = style({
  position: 'absolute',
  bottom: forgeSpace.S700,
  left: '50%',
  transform: 'translateX(-50%)',
  width: toRem(220),
  height: toRem(10),
  borderRadius: forgeRadius.pill,
  background: tint(game.Bg, 80),
  boxShadow: forgeInset(game.Line),
  overflow: 'hidden',
});

export const PowerFill = style({
  height: '100%',
  background: `linear-gradient(90deg, ${game.Accent}, ${game.Critical})`,
});

export const Banner = style({
  ...forgeType.display,
  fontSize: toRem(56),
  lineHeight: 1,
  letterSpacing: '0.04em',
  textShadow: `0 ${toRem(3)} ${toRem(12)} ${tint(game.Bg, 90)}`,
});

export const BannerSub = style({
  ...forgeType.title,
  textShadow: `0 ${toRem(2)} ${toRem(8)} ${tint(game.Bg, 90)}`,
});

export const Hint = style({
  position: 'absolute',
  bottom: forgeSpace.S400,
  left: '50%',
  transform: 'translateX(-50%)',
  padding: `${forgeSpace.S100} ${forgeSpace.S300}`,
  borderRadius: forgeRadius.control,
  background: tint(game.Bg, 85),
  ...forgeType.bodySm,
  whiteSpace: 'nowrap',
});

export const Loading = style({ ...forgeType.heading, color: game.Muted });

export const Updated = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: forgeSpace.S300,
  pointerEvents: 'auto',
});

export const DialogBody = style({
  display: 'flex',
  flexDirection: 'column',
  gap: forgeSpace.S400,
  zIndex: forgeZ.overlay,
});

export const FinalScore = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: forgeSpace.S400,
  ...forgeType.display,
  fontVariantNumeric: 'tabular-nums',
});

export const Scorers = style({ ...forgeType.bodySm, color: game.Muted, textAlign: 'center' });

export const Bindings = style({
  display: 'grid',
  gridTemplateColumns: `1fr ${toRem(120)} ${toRem(120)}`,
  alignItems: 'center',
  gap: `${forgeSpace.S100} ${forgeSpace.S300}`,
  ...forgeType.bodySm,
});

// Who is watching, in the top right corner of the pitch.
export const Stands = style({
  position: 'absolute',
  top: forgeSpace.S300,
  right: forgeSpace.S300,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: forgeSpace.S100,
  padding: `${forgeSpace.S200} ${forgeSpace.S300}`,
  borderRadius: forgeRadius.control,
  background: tint(game.Bg, 80),
  ...forgeType.bodySm,
  maxWidth: toRem(200),
});

export const Cheers = style({
  position: 'absolute',
  right: forgeSpace.S400,
  bottom: toRem(64),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: forgeSpace.S100,
});

const rise = keyframes({
  '0%': { opacity: 0, transform: 'translateY(12px) scale(0.8)' },
  '15%': { opacity: 1, transform: 'translateY(0) scale(1.1)' },
  '80%': { opacity: 1, transform: 'translateY(-8px) scale(1)' },
  '100%': { opacity: 0, transform: 'translateY(-24px)' },
});

export const CheerPop = style({
  fontSize: toRem(30),
  lineHeight: 1,
  animation: `${rise} 2.6s ease-out forwards`,
  textShadow: `0 ${toRem(2)} ${toRem(6)} ${tint(game.Bg, 90)}`,
});

export const CheerName = style({ ...forgeType.caption, marginLeft: forgeSpace.S100 });

export const CheerBar = style({
  position: 'absolute',
  right: forgeSpace.S300,
  bottom: forgeSpace.S300,
  display: 'flex',
  gap: forgeSpace.S100,
  padding: forgeSpace.S100,
  borderRadius: forgeRadius.control,
  background: tint(game.Bg, 80),
});

export const MatchList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: forgeSpace.S200,
});

export const MatchRow = style({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: forgeSpace.S300,
  padding: `${forgeSpace.S200} ${forgeSpace.S300}`,
  borderRadius: forgeRadius.control,
  background: game.RaisedHover,
  ...forgeType.bodySm,
});

export const MatchRowText = style({ flexGrow: 1, minWidth: 0 });

export const RedCards = style({ display: 'inline-flex', gap: toRem(2), margin: `0 ${toRem(4)}` });

export const RedCard = style({
  display: 'inline-block',
  width: toRem(7),
  height: toRem(10),
  borderRadius: toRem(1),
  background: game.Critical,
});

export const CallBox = style({
  position: 'absolute',
  top: toRem(64),
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: forgeSpace.S100,
  padding: `${forgeSpace.S200} ${forgeSpace.S500}`,
  borderRadius: forgeRadius.card,
  background: tint(game.Bg, 85),
  boxShadow: forgeInset(game.Line),
});

export const CallTitle = style({
  ...forgeType.display,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
});

const card = {
  display: 'inline-block',
  width: toRem(14),
  height: toRem(19),
  marginRight: forgeSpace.S200,
  verticalAlign: 'middle',
  borderRadius: toRem(2),
} as const;

export const CardYellow = style({ ...card, background: game.Money });

export const CardRed = style({ ...card, background: game.Critical });

// A substitution: the number going off, the number coming on.
export const SubOut = style({ color: game.Critical, fontWeight: 700 });

export const SubIn = style({ color: game.Accent, fontWeight: 700 });

// The substitutions screen: who goes off on the left, who comes on on the right.
export const SubsGrid = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: forgeSpace.S400,
  maxHeight: '50vh',
  overflowY: 'auto',
});

export const SubsColumn = style({ display: 'flex', flexDirection: 'column', gap: forgeSpace.S100 });

export const SubsSides = style({ display: 'flex', gap: forgeSpace.S200, flexWrap: 'wrap' });

export const SubsRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: forgeSpace.S300,
});

export const SubPick = style({ justifyContent: 'flex-start' });

export const SubNum = style({ minWidth: toRem(32), textAlign: 'left' });

export const SeatName = style({ ...forgeType.body });

// Replays: cinema bars, a sweep across the screen as one starts, and the TV's replay tag.
const barIn = keyframes({
  from: { transform: 'scaleY(0)' },
  to: { transform: 'scaleY(1)' },
});

const bar = {
  position: 'absolute',
  left: 0,
  right: 0,
  height: '7%',
  background: tint(game.Bg, 92),
  animation: `${barIn} 0.3s ease-out`,
} as const;

export const ReplayBarTop = style({ ...bar, top: 0, transformOrigin: 'top' });

export const ReplayBarBottom = style({ ...bar, bottom: 0, transformOrigin: 'bottom' });

const sweep = keyframes({
  '0%': { transform: 'translateX(-120%) skewX(-18deg)', opacity: 1 },
  '60%': { opacity: 1 },
  '100%': { transform: 'translateX(120%) skewX(-18deg)', opacity: 0 },
});

export const ReplayWipe = style({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: `linear-gradient(90deg, transparent, ${tint(game.Accent, 85)} 30%, ${tint(
    game.Accent,
    85
  )} 70%, transparent)`,
  ...forgeType.display,
  fontSize: toRem(64),
  letterSpacing: '0.12em',
  color: game.OnAccent,
  textTransform: 'uppercase',
  animation: `${sweep} 0.7s ease-in-out forwards`,
  '@media': { '(prefers-reduced-motion: reduce)': { display: 'none' } },
});

export const ReplayTag = style({
  position: 'absolute',
  top: toRem(64),
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: forgeSpace.S100,
  minWidth: toRem(220),
  padding: `${forgeSpace.S200} ${forgeSpace.S400}`,
  borderRadius: forgeRadius.card,
  background: tint(game.Bg, 85),
  boxShadow: forgeInset(game.Line),
  '@media': { [PHONE]: { top: toRem(52) } },
});

export const ReplayTitle = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: forgeSpace.S200,
  ...forgeType.heading,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
});

const blink = keyframes({ '50%': { opacity: 0.25 } });

export const ReplayDot = style({
  width: toRem(10),
  height: toRem(10),
  borderRadius: forgeRadius.pill,
  background: game.Accent,
  animation: `${blink} 1.2s steps(1) infinite`,
});

export const ReplaySub = style({ ...forgeType.bodySm, color: game.Muted, textAlign: 'center' });

export const ReplayProgress = style({
  height: toRem(3),
  borderRadius: forgeRadius.pill,
  background: tint(game.Ink, 15),
  overflow: 'hidden',
});

export const ReplayFill = style({ height: '100%', background: game.Accent });

// The video referee: the options and their votes at the side of the pitch, and the button the
// people watching ask for a review with.
export const VarPanel = style({
  position: 'absolute',
  left: forgeSpace.S300,
  top: '50%',
  transform: 'translateY(-50%)',
  width: toRem(280),
  display: 'flex',
  flexDirection: 'column',
  gap: forgeSpace.S200,
  padding: forgeSpace.S300,
  borderRadius: forgeRadius.card,
  background: tint(game.Bg, 88),
  boxShadow: forgeInset(game.Line),
  pointerEvents: 'auto',
  '@media': {
    [PHONE]: {
      top: 'auto',
      bottom: toRem(56),
      transform: 'none',
      right: forgeSpace.S300,
      width: 'auto',
    },
  },
});

export const VarHead = style({ ...forgeType.bodySm, color: game.Muted });

export const VarOption = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: toRem(4),
  width: '100%',
  height: 'auto',
  padding: `${forgeSpace.S200} ${forgeSpace.S300}`,
  textAlign: 'left',
  selectors: { '&&': { alignItems: 'stretch', flexDirection: 'column' } },
});

export const VarRow = style({
  display: 'flex',
  width: '100%',
  justifyContent: 'space-between',
  gap: forgeSpace.S200,
  ...forgeType.bodySm,
});

export const VarCalled = style({
  ...forgeType.caption,
  color: game.Muted,
  marginLeft: forgeSpace.S100,
});

export const VarBar = style({
  display: 'block',
  width: '100%',
  height: toRem(4),
  borderRadius: forgeRadius.pill,
  background: tint(game.Ink, 12),
  overflow: 'hidden',
});

export const VarFill = style({ height: '100%', background: game.Accent, transition: 'width 0.2s' });

export const VarCall = style({
  position: 'absolute',
  left: forgeSpace.S300,
  bottom: forgeSpace.S300,
  pointerEvents: 'auto',
});
