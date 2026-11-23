// Class names folds 2.7.2 gives its recipes. folds exports the components but not the recipes,
// so these are read off its prebuilt bundle; foldsClasses.test.ts fails if a folds upgrade
// renames them.
export const foldsClasses = {
  Button: { base: 'epr39zd', Success: 'epr39zj', None: 'epr39zo' },
  IconButton: { base: 'brs7ce5', Success: 'brs7cef', None: 'brs7cej' },
  Input: {
    base: '_1rrvnjm8',
    Background: '_1rrvnjm9',
    Surface: '_1rrvnjma',
    SurfaceVariant: '_1rrvnjmb',
    Secondary: '_1rrvnjmd',
  },
  Chip: {
    base: '_1bv8u1w6',
    Background: '_1bv8u1w7',
    Surface: '_1bv8u1w8',
    SurfaceVariant: '_1bv8u1w9',
    Primary: '_1bv8u1wa',
    Secondary: '_1bv8u1wb',
  },
  Modal: { base: '_1fc5sz51' },
  Dialog: { base: '_5z5e2h1' },
  TextArea: {
    base: 'ay20pp9',
    Background: 'ay20ppa',
    Surface: 'ay20ppb',
    SurfaceVariant: 'ay20ppc',
    Secondary: 'ay20ppe',
  },
};
