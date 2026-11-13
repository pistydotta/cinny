import { keyframes, style } from '@vanilla-extract/css';

/*
 * The one playing card every card game draws (poker, Truco, Fodinha): a plain white face with
 * a bold index in the top corner and one big suit, readable at any size. Its size is
 * `--card-w`; everything inside scales with it.
 */

const GOLD = '#f5c84b';

const dealIn = keyframes({
  '0%': {
    opacity: 0,
    transform: 'translate(var(--from-x), var(--from-y)) rotate(-25deg) scale(0.55)',
  },
  '20%': { opacity: 1 },
  '100%': { opacity: 1, transform: 'translate(0, 0) rotate(var(--rot, 0deg)) scale(1)' },
});

const flipIn = keyframes({
  '0%': { transform: 'rotateY(180deg)' },
  '100%': { transform: 'rotateY(0deg)' },
});

export const Card = style({
  position: 'relative',
  width: 'var(--card-w, 46px)',
  aspectRatio: '5 / 7',
  // Rounded like its faces, so a shadow or overlay a game puts on the card follows the corners.
  borderRadius: 'calc(var(--card-w, 46px) * 0.1)',
  perspective: '800px',
  flexShrink: 0,
  transition: 'transform 300ms, filter 300ms',
  selectors: {
    '&[data-anim="deal"]': {
      animation: `${dealIn} 480ms cubic-bezier(.2,.8,.2,1) both`,
      animationDelay: 'var(--delay, 0ms)',
    },
    '&[data-highlight="true"]': { transform: 'translateY(-10%)' },
    '&[data-dim="true"]': { filter: 'brightness(0.5) saturate(0.6)' },
  },
});

export const CardInner = style({
  position: 'absolute',
  inset: 0,
  transformStyle: 'preserve-3d',
  transition: 'transform 600ms cubic-bezier(.2,.8,.2,1)',
  selectors: {
    '&[data-face="down"]': { transform: 'rotateY(180deg)' },
    '&[data-anim="flip"]': {
      animation: `${flipIn} 650ms cubic-bezier(.2,.8,.2,1) both`,
      animationDelay: 'var(--delay, 0ms)',
    },
  },
});

const cardFace = style({
  position: 'absolute',
  inset: 0,
  borderRadius: 'inherit',
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
  boxShadow: '0 calc(var(--card-w, 46px) * 0.05) calc(var(--card-w, 46px) * 0.12) rgba(0,0,0,0.45)',
});

export const CardFront = style([
  cardFace,
  {
    background: 'linear-gradient(160deg, #ffffff 0%, #f5f2ea 100%)',
    color: '#15171c',
    // The same letters in every game, whatever font the game's screen uses.
    fontFamily: 'InterVariable, Inter, sans-serif',
    overflow: 'hidden',
    selectors: {
      '&[data-red="true"]': { color: '#d42b2b' },
      [`${Card}[data-highlight="true"] &`]: {
        boxShadow: `0 0 0 calc(var(--card-w, 46px) * 0.045) ${GOLD}, 0 0 calc(var(--card-w, 46px) * 0.35) rgba(245,200,75,0.8)`,
      },
    },
  },
]);

export const CardRank = style({
  position: 'absolute',
  top: '5%',
  left: '9%',
  fontSize: 'calc(var(--card-w, 46px) * 0.4)',
  fontWeight: 800,
  lineHeight: 1,
  letterSpacing: 'calc(var(--card-w, 46px) * -0.03)',
});

export const CardCornerSuit = style({
  position: 'absolute',
  top: '38%',
  left: '10%',
  fontSize: 'calc(var(--card-w, 46px) * 0.24)',
  lineHeight: 1,
});

export const CardBigSuit = style({
  position: 'absolute',
  right: '7%',
  bottom: '3%',
  fontSize: 'calc(var(--card-w, 46px) * 0.62)',
  lineHeight: 1,
});

export const CardBack = style([
  cardFace,
  {
    transform: 'rotateY(180deg)',
    background:
      'repeating-linear-gradient(45deg, rgba(255,255,255,0.10) 0 calc(var(--card-w, 46px) * 0.035), transparent calc(var(--card-w, 46px) * 0.035) calc(var(--card-w, 46px) * 0.11)), repeating-linear-gradient(-45deg, rgba(255,255,255,0.10) 0 calc(var(--card-w, 46px) * 0.035), transparent calc(var(--card-w, 46px) * 0.035) calc(var(--card-w, 46px) * 0.11)), linear-gradient(160deg, #b3202f 0%, #7d1020 100%)',
    boxShadow:
      'inset 0 0 0 calc(var(--card-w, 46px) * 0.055) #f6f2e8, inset 0 0 0 calc(var(--card-w, 46px) * 0.075) #d9b65b, 0 calc(var(--card-w, 46px) * 0.05) calc(var(--card-w, 46px) * 0.12) rgba(0,0,0,0.45)',
  },
]);
