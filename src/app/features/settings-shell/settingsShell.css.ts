import { createVar, globalStyle, style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';
import { PageContent, PageContentCenter, PageHeader } from '../../components/page/style.css';
import { SequenceCard } from '../../components/sequence-card/style.css';

const line = (strength: number) =>
  `color-mix(in srgb, ${color.Surface.OnContainer} ${strength}%, transparent)`;

export const Shell = style({
  display: 'flex',
  flexDirection: 'column',
  flexGrow: 1,
  minHeight: 0,
  backgroundColor: color.Surface.Container,
  color: color.Surface.OnContainer,
});

export const Bar = style({
  flexShrink: 0,
  borderBottom: `1px solid ${line(12)}`,
  padding: `0 ${config.space.S500}`,
});

export const BarTop = style({
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S300,
  paddingTop: config.space.S400,
  paddingBottom: config.space.S200,
});

export const Search = style({
  display: 'flex',
  alignItems: 'center',
  gap: toRem(6),
  marginLeft: 'auto',
  width: toRem(220),
  maxWidth: '45%',
  height: toRem(30),
  padding: `0 ${toRem(12)}`,
  borderRadius: toRem(15),
  border: `1px solid ${line(18)}`,
  color: line(60),
  selectors: {
    '&:focus-within': { borderColor: color.Primary.Main, color: color.Surface.OnContainer },
  },
  '@media': {
    '(max-width: 760px)': { width: 'auto', maxWidth: 'none', flex: '1 1 0', minWidth: 0 },
  },
});

export const Title = style({ flexShrink: 0 });

export const SearchInput = style({
  flexGrow: 1,
  minWidth: 0,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: color.Surface.OnContainer,
  font: 'inherit',
  fontSize: toRem(13),
  selectors: {
    '&::placeholder': { color: line(50) },
  },
});

export const Tabs = style({
  display: 'flex',
  gap: config.space.S500,
  overflowX: 'auto',
  scrollbarWidth: 'none',
});

export const Tab = style({
  flexShrink: 0,
  padding: `${config.space.S200} 0 ${toRem(10)}`,
  border: 'none',
  borderBottom: '2px solid transparent',
  background: 'transparent',
  color: line(60),
  font: 'inherit',
  fontSize: toRem(13),
  cursor: 'pointer',
  transition: 'padding 120ms ease, color 120ms ease',
  selectors: {
    '&:hover': { color: color.Surface.OnContainer },
    // The open tab sits a little higher than the rest, on a thicker underline.
    '&[aria-selected=true]': {
      paddingTop: `calc(${config.space.S200} - ${toRem(4)})`,
      paddingBottom: toRem(13),
      color: color.Surface.OnContainer,
      fontWeight: config.fontWeight.W600,
      borderBottom: `3px solid ${color.Primary.Main}`,
    },
    '&:focus-visible': { outline: `2px solid ${color.Primary.Main}`, outlineOffset: 2 },
  },
});

export const Body = style({
  display: 'flex',
  flexGrow: 1,
  minHeight: 0,
});

export const Empty = style({
  padding: config.space.S700,
  textAlign: 'center',
  color: line(55),
});

// The pages bring their own header (title and close), which the bar above already shows. An
// image pack opened from Emojis keeps its header, since its back button lives there; it is the
// only one with the `balance` variant.
const balanced = PageHeader({ balance: true, outlined: false })
  .split(' ')
  .filter((name) => !PageHeader({ outlined: false }).split(' ').includes(name))
  .map((name) => `.${name}`)
  .join('');
globalStyle(`${Body} > div > header:not(${balanced})`, { display: 'none' });

globalStyle(`${Body} .${PageContent}`, {
  padding: `${config.space.S600} ${config.space.S700}`,
});
// Pages centre their content in a 964px column; the modal is the column here, so fill it.
globalStyle(`${Body} .${PageContentCenter}`, { maxWidth: 'none' });

// Rows: no gray boxes, a hairline between neighbours.
// The recipe's first class is its base, shared by every row whatever its variants.
export const rowSelector = `.${SequenceCard().split(' ')[0]}`;
const seq = rowSelector;
globalStyle(`${Body} ${seq}`, {
  backgroundColor: 'transparent',
  borderRadius: 0,
  paddingLeft: 0,
  paddingRight: 0,
});
globalStyle(`${Body} ${seq}:has(+ ${seq})`, {
  borderBottom: `1px solid ${line(10)}`,
});

// A section (its title, then its rows) puts the title on the left and the rows on the right.
// PageContent is a composed class ("own reset"); the stylesheet resolves that, the DOM query
// in the shell needs the page's own class alone.
export const sectionSelector = `.${PageContent.split(' ')[0]} > div > div:has(> ${seq})`;
const section = `${Body} ${sectionSelector}`;
globalStyle(section, {
  display: 'grid',
  gridTemplateColumns: `${toRem(180)} minmax(0, 1fr)`,
  columnGap: config.space.S700,
  rowGap: 0,
  alignItems: 'start',
});
globalStyle(`${section} > :first-child:not(${seq})`, {
  gridColumn: 1,
  gridRow: '1 / span 40',
  paddingTop: config.space.S300,
  fontSize: toRem(14),
  fontWeight: config.fontWeight.W500,
  color: color.Surface.OnContainer,
});
globalStyle(`${section} > *:not(:first-child)`, { gridColumn: 2 });
// Some titles come in a box with a note or a badge beside them; stack those under the title.
globalStyle(`${section} > div:first-child:not(${seq})`, {
  flexDirection: 'column',
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
  gap: toRem(4),
});
globalStyle(`${section} > div:first-child:not(${seq}) > p:first-child`, {
  fontSize: toRem(14),
  fontWeight: config.fontWeight.W500,
});

// Each section's title column carries its number and, for the section in view (marked by the
// shell as you scroll), an ember thread down its length; the others step back a little.
const mono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const ember = createVar();
globalStyle('body', { vars: { [ember]: color.Primary.Main } });
globalStyle('body.dark-theme', { vars: { [ember]: '#D8613F' } });

globalStyle(`${Body} .${PageContent} > div`, { counterReset: 'settings-section' });
globalStyle(section, { counterIncrement: 'settings-section' });
const titleColumn = `${section} > :first-child:not(${seq})`;
globalStyle(titleColumn, {
  alignSelf: 'stretch',
  paddingLeft: config.space.S300,
  borderLeft: `2px solid ${line(8)}`,
  opacity: 0.72,
  transition: 'opacity 200ms ease, border-color 200ms ease',
});
globalStyle(`${titleColumn}::before`, {
  content: 'counter(settings-section, decimal-leading-zero)',
  display: 'block',
  marginBottom: toRem(2),
  fontFamily: mono,
  fontSize: toRem(11),
  fontWeight: config.fontWeight.W400,
  letterSpacing: '0.08em',
  color: line(55),
  transition: 'color 200ms ease',
});
globalStyle(`${section}[data-active] > :first-child:not(${seq})`, {
  opacity: 1,
  borderLeftColor: ember,
});
globalStyle(`${section}[data-active] > :first-child:not(${seq})::before`, { color: ember });
globalStyle(titleColumn, {
  '@media': { '(prefers-reduced-motion: reduce)': { transition: 'none' } },
});

// Divider between sections.
globalStyle(`${section} + ${section}`, {
  borderTop: `1px solid ${line(10)}`,
  paddingTop: config.space.S500,
});

globalStyle(`${Body} [data-search-hidden]`, { display: 'none !important' });

export const narrow = '(max-width: 760px)';
globalStyle(section, {
  '@media': {
    [narrow]: { gridTemplateColumns: 'minmax(0, 1fr)' },
  },
});
globalStyle(`${section} > *`, {
  '@media': {
    [narrow]: { gridColumn: '1 !important', gridRow: 'auto !important' },
  },
});
globalStyle(`${Body} .${PageContent}`, {
  '@media': {
    [narrow]: { padding: config.space.S400 },
  },
});

// Settings opens in the shared 500 modal; give it more room so the two columns breathe.
globalStyle(`*:has(> ${Shell})`, {
  width: `min(${toRem(1080)}, 94vw)`,
  maxWidth: 'none',
  height: `min(${toRem(820)}, 90vh)`,
  maxHeight: 'none',
});
