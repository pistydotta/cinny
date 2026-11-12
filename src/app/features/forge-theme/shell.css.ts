import { assignVars, globalStyle, keyframes } from '@vanilla-extract/css';
import { color } from 'folds';
import * as navCss from '../../components/nav/styles.css';
import * as sidebarCss from '../../components/sidebar/Sidebar.css';
import * as pageCss from '../../components/page/style.css';
import { forgeDark } from './palette';

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
// A long streak that glides the length of the divider; it fades in and out at the ends so it never
// pokes past the thread, which lets us skip overflow clipping on the zero-width line.
const sparkGlide = keyframes({
  '0%': { transform: 'translateY(-340px)', opacity: 0 },
  '8%': { opacity: 1 },
  '92%': { opacity: 1 },
  '100%': { transform: 'translateY(100vh)', opacity: 0 },
});

type DividerColors = {
  thread: string;
  glow: string;
  spark: string;
  sparkWidth?: string;
  sparkHeight?: string;
  sparkBlur?: string;
};

const applyDivider = (themeClass: string, c: DividerColors) => {
  globalStyle(dividerSel(themeClass), {
    position: 'relative',
    borderColor: c.thread,
    pointerEvents: 'none',
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
  // The travelling streak, softened by a static blur so it reads as a flowing light.
  globalStyle(dividerSel(themeClass, '::after'), {
    content: '""',
    position: 'absolute',
    left: '-1px',
    top: 0,
    width: c.sparkWidth ?? '3px',
    height: c.sparkHeight ?? '340px',
    background: c.spark,
    filter: `blur(${c.sparkBlur ?? '0.7px'})`,
    willChange: 'transform, opacity',
    animation: `${sparkGlide} 3s linear infinite`,
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
});
// Light mode: red clashes on the near-white page, so the divider is neutral grey. The line itself
// stays light and thin; a darker, shorter grey streak travels over it, the reverse of dark mode.
applyDivider('.light-theme', {
  thread: 'color-mix(in srgb, #9BA1A9 50%, transparent)',
  glow: 'linear-gradient(to bottom, transparent, #C4C9CF 18%, #A6ACB4 50%, #C4C9CF 82%, transparent)',
  spark:
    'linear-gradient(to bottom, transparent, #AEB6C0 28%, #8A93A0 50%, #AEB6C0 72%, transparent)',
  sparkWidth: '2px',
  sparkHeight: '200px',
  sparkBlur: '0.4px',
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
