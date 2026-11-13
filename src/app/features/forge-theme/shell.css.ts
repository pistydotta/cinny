import { assignVars, globalStyle, keyframes } from '@vanilla-extract/css';
import { color } from 'folds';
import * as navCss from '../../components/nav/styles.css';
import * as sidebarCss from '../../components/sidebar/Sidebar.css';
import * as pageCss from '../../components/page/style.css';
import { forgeDark } from './palette';
import './switch.css';

// Forge restyles Cinny's shell from here, so the upstream style files stay untouched.
const mono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

// The open room or page: a raised row with an ember bar on its left edge.
globalStyle(`[aria-selected=true]:has(.${navCss.NavLink})`, {
  backgroundColor: color.Background.ContainerActive,
  boxShadow: `inset 2px 0 0 ${color.Primary.Main}`,
});

globalStyle(`.${navCss.NavCategoryHeader} p`, {
  fontFamily: mono,
  fontSize: '11px',
  letterSpacing: '0.08em',
  opacity: 0.6,
});

globalStyle('.light-theme time, .dark-theme time', {
  fontFamily: mono,
});

// Light mode paints the room list and the page in one tone; the icon rail alone is graphite. Its
// colour variables are re-pointed at the dark palette, one step up from black so the rail is not
// a hole beside the light page, and the buttons inside stay readable.
const rail = {
  ...forgeDark,
  Background: forgeDark.SurfaceVariant,
  SurfaceVariant: {
    Container: '#272B30',
    ContainerHover: '#31363C',
    ContainerActive: '#3B4047',
    ContainerLine: '#444A52',
    OnContainer: '#ECEEF0',
  },
};

globalStyle(`.light-theme .${sidebarCss.Sidebar}`, {
  vars: assignVars(color, rail),
});

// The room-list and room headers carried a bottom hairline that read as an extra horizontal rule
// across the top; drop it in both themes. The theme-class prefix wins over the recipe's own class.
const navHeaderClass = pageCss.PageNavHeader({ outlined: true }).split(' ').pop();
const pageHeaderClass = pageCss.PageHeader({ outlined: true }).split(' ').pop();
globalStyle(
  ['.dark-theme', '.light-theme']
    .flatMap((t) => [`${t} .${navHeaderClass}`, `${t} .${pageHeaderClass}`])
    .join(', '),
  { borderBottomWidth: 0 }
);

// The divider between the room list and the page is a wine thread that glows, with a bright spark
// gliding down it. The recipe returns "base variant"; the size-specific class is the one unique to
// the room list, and in Page.tsx the element right after it is the vertical divider (a folds
// <Line>). It must stay in flow: as an absolutely positioned flex item it would collapse to the
// top-left corner, so we only make it a positioning context for the two pseudo-elements. Both
// themes get the effect with their own palette; `.forge-static-divider` on <body> (a settings
// toggle) freezes it, same as prefers-reduced-motion.
const navClass = (size: '300' | '400') => pageCss.PageNav({ size }).split(' ').pop();
const dividerSel = (themeClass: string, suffix = '') =>
  (['400', '300'] as const)
    .map((size) => `${themeClass} .${navClass(size)} + *${suffix}`)
    .join(', ');
const staticSel = (themeClass: string, suffix: string) =>
  (['400', '300'] as const)
    .map((size) => `.forge-static-divider${themeClass} .${navClass(size)} + *${suffix}`)
    .join(', ');

// A full-height glow that breathes, so the thread reads even while the spark is elsewhere.
const emberPulse = keyframes({
  '0%, 100%': { opacity: 0.45 },
  '50%': { opacity: 0.85 },
});
// The streak glides down the divider until its tip meets the bottom edge (the call bar's top line,
// or the window's bottom), then is pressed into that line. The streak's box is the divider's full
// height, so translateY percentages are the divider's length and the timing holds at any height;
// the light itself is a --spark-h tall gradient at the top of that box.
const SPARK_CYCLE = '3.2s';
const sparkGlide = keyframes({
  '0%': { transform: 'translateY(calc(var(--spark-h) * -1))', opacity: 0 },
  '6%': { opacity: 1 },
  '60%': {
    transform: 'translateY(calc(100% - var(--spark-h))) scaleY(1)',
    animationTimingFunction: 'cubic-bezier(0.5, 0, 0.9, 0.5)',
  },
  '72%': { transform: 'translateY(calc(100% - var(--spark-h))) scaleY(0.02)', opacity: 1 },
  '74%, 100%': { transform: 'translateY(calc(100% - var(--spark-h))) scaleY(0)', opacity: 0 },
});

type DividerColors = {
  thread: string;
  glow: string;
  spark: string;
  halo: string;
  sparkHeight?: string;
};

const applyDivider = (themeClass: string, c: DividerColors) => {
  globalStyle(dividerSel(themeClass), {
    position: 'relative',
    borderColor: c.thread,
    pointerEvents: 'none',
    // Keep the streak and its blur inside the divider's own length, so nothing crosses the line
    // under it (the call bar's top border).
    clipPath: 'inset(0 -6px)',
  });
  // The thread's glow, a thin line riding the full height of the divider.
  globalStyle(dividerSel(themeClass, '::before'), {
    content: '""',
    position: 'absolute',
    left: '0',
    top: 0,
    bottom: 0,
    width: '1px',
    background: c.glow,
    willChange: 'opacity',
    animation: `${emberPulse} 3.4s ease-in-out infinite`,
    pointerEvents: 'none',
  });
  // The travelling streak: a crisp 1px core right on the thread, with a faint 3px halo painted as
  // a second layer (a blur filter smeared it). It scales toward the light's bottom edge, so the
  // squash at the end presses it into the line.
  globalStyle(dividerSel(themeClass, '::after'), {
    vars: { '--spark-h': c.sparkHeight ?? '340px' },
    content: '""',
    position: 'absolute',
    left: '-1px',
    top: 0,
    bottom: 0,
    width: '3px',
    background: [
      `${c.spark} center top / 1px var(--spark-h) no-repeat`,
      `linear-gradient(to bottom, transparent 20%, color-mix(in srgb, ${c.halo} 28%, transparent) 50%, transparent 80%) center top / 100% var(--spark-h) no-repeat`,
    ].join(', '),
    transformOrigin: '50% var(--spark-h)',
    willChange: 'transform, opacity',
    animation: `${sparkGlide} ${SPARK_CYCLE} linear infinite`,
    pointerEvents: 'none',
  });
  // Reduced motion or the static-divider setting: no animation, just the static wine thread.
  globalStyle(dividerSel(themeClass, '::before'), {
    '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none', opacity: 0.75 } },
  });
  globalStyle(dividerSel(themeClass, '::after'), {
    '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none', opacity: 0 } },
  });
  globalStyle(staticSel(themeClass, '::before'), { animation: 'none', opacity: 0.75 });
  globalStyle(staticSel(themeClass, '::after'), { animation: 'none', opacity: 0 });
};

// Dark mode: a bright ember over near black, in the wine accent.
applyDivider('.dark-theme', {
  thread: `color-mix(in srgb, ${color.Primary.Main} 55%, transparent)`,
  glow: `linear-gradient(to bottom, transparent, ${color.Primary.Main} 18%, ${color.Primary.MainActive} 50%, ${color.Primary.Main} 82%, transparent)`,
  spark: `linear-gradient(to bottom, transparent, ${color.Primary.MainActive} 26%, #E06A52 44%, #E6775D 50%, #E06A52 56%, ${color.Primary.MainActive} 74%, transparent)`,
  halo: '#E6775D',
});
// Light mode: red clashes on the near-white page, so the divider is neutral grey. The line itself
// stays light and thin; a darker, shorter grey streak travels over it, the reverse of dark mode.
applyDivider('.light-theme', {
  thread: 'color-mix(in srgb, #9BA1A9 50%, transparent)',
  glow: 'linear-gradient(to bottom, transparent, #C4C9CF 18%, #A6ACB4 50%, #C4C9CF 82%, transparent)',
  spark:
    'linear-gradient(to bottom, transparent, #AEB6C0 28%, #8A93A0 50%, #AEB6C0 72%, transparent)',
  halo: '#8A93A0',
  sparkHeight: '200px',
});

// Dark mode sets the icon rail apart by going one step below the frame, to near black.
globalStyle(`.dark-theme .${sidebarCss.Sidebar}`, {
  vars: assignVars(color, {
    ...forgeDark,
    Background: { ...forgeDark.Background, Container: '#050506', ContainerLine: '#050506' },
    SurfaceVariant: {
      Container: '#16181B',
      ContainerHover: '#202327',
      ContainerActive: '#2A2E33',
      ContainerLine: '#33383E',
      OnContainer: '#ECEEF0',
    },
  }),
});
