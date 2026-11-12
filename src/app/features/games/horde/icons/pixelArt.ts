// The game's icons, as 16x16 pixel art written out by hand: one letter per pixel, colors from
// PALETTE, '.' for empty. The dark outline is added around every shape (`withOutline`), so the
// drawings only hold the fill. Items without a drawing keep their emoji.

export const SIZE = 16;

export const PALETTE: Record<string, string> = {
  k: '#1c1220',
  w: '#ffffff',
  l: '#c8c8d4',
  s: '#8a8a9a',
  S: '#4a4a5a',
  r: '#e83b3b',
  R: '#8f1f2a',
  m: '#ff7eb6',
  o: '#ff9a2e',
  y: '#ffe14d',
  Y: '#d9a21b',
  g: '#5bd25b',
  G: '#237a3a',
  b: '#3d8bff',
  B: '#1f3f99',
  c: '#7fe8ff',
  p: '#a35bff',
  P: '#5a2a99',
  n: '#a0612f',
  N: '#5c3418',
  f: '#e8d3a6',
  t: '#b89a6a',
};

type Grid = string[];

const EMPTY = '.'.repeat(SIZE);

// Rows given from the top, the rest left empty.
const grid = (...rows: string[]): Grid => [
  ...rows,
  ...Array.from({ length: SIZE - rows.length }, () => EMPTY),
];

const recolor = (art: Grid, map: Record<string, string>): Grid =>
  art.map((row) => row.replace(/./g, (ch) => map[ch] ?? ch));

// Draws `top` over `art` at (x, y), leaving `art` where `top` is empty.
const overlay = (art: Grid, top: string[], x: number, y: number): Grid =>
  art.map((row, r) => {
    const line = top[r - y];
    if (!line) return row;
    return row.replace(/./g, (ch, c) => {
      const t = line[c - x];
      return t && t !== '.' ? t : ch;
    });
  });

// Every empty pixel next to a filled one (sideways or up/down) becomes the outline color.
export const withOutline = (art: Grid, outline = 'k'): Grid =>
  art.map((row, r) =>
    row.replace(/./g, (ch, c) => {
      if (ch !== '.') return ch;
      const near = [art[r - 1]?.[c], art[r + 1]?.[c], row[c - 1], row[c + 1]];
      return near.some((n) => n && n !== '.' && n !== outline) ? outline : ch;
    })
  );

const HEART = grid(
  EMPTY,
  EMPTY,
  '...rrr....rrr...',
  '..rrwrr..rrrrr..',
  '.rrwrrrrrrrrrrr.',
  '.rrrrrrrrrrrrrr.',
  '.rrrrrrrrrrrrrR.',
  '.rrrrrrrrrrrrRR.',
  '..rrrrrrrrrrRR..',
  '...rrrrrrrrRR...',
  '....rrrrrrRR....',
  '.....rrrrRR.....',
  '......rrRR......',
  '.......RR.......'
);

const PLUS = ['.w.', 'www', '.w.'];

const DROP = grid(
  EMPTY,
  '.......c........',
  '.......cc.......',
  '......cbbb......',
  '......cbbb......',
  '.....cbbbbb.....',
  '.....cbbbbb.....',
  '....cbbbbbbb....',
  '....cwbbbbbbB...',
  '...cwwbbbbbbB...',
  '...cwbbbbbbbB...',
  '...cbbbbbbbbB...',
  '....bbbbbbbBB...',
  '.....bbbbbBB....',
  '......BBBBB.....'
);

const SKULL = [
  '.....wwwwww.....',
  '....wwwwwwww....',
  '...wwwwwwwwww...',
  '...wwwwwwwwww...',
  '...wSSwwwwSSw...',
  '...wSSwwwwSSw...',
  '...wwwwSSwwww...',
  '....wwwwwwww....',
  '.....wSwSwS.....',
  '.....wwwwww.....',
];

const SHOE = grid(
  EMPTY,
  EMPTY,
  EMPTY,
  EMPTY,
  '...bbbbb........',
  '...bwbwbb.......',
  '.l.bbbbbbbb.....',
  '...bbbbbbbbbbb..',
  'l..bbbbbbbbbbbb.',
  '...wwwwwwwwwwww.',
  '....SSSSSSSSSSS.'
);

const STAR = [
  '.......y.......',
  '......yyy......',
  '......yyy......',
  '.yyyyyyyyyyyyy.',
  '..yyyyyyyyyyy..',
  '...yyyyyyyyy...',
  '....yyyyyyy....',
  '...yyyyyyyyy...',
  '...yyyy.yyyy...',
  '..yyy.....yyy..',
  '..y.........y..',
];

const MINI_STAR = ['.y.', 'yyy', '.y.'];

export const ART: Record<string, Grid> = {
  'weapon:missile': grid(
    EMPTY,
    '.....s....s.....',
    '.....ss..ss.....',
    '......ssss......',
    '.....SSSSSS.....',
    '....SlSSSSSS....',
    '....yyyyyyyy....',
    '....SlSSSSSS....',
    '....SlSSSSSS....',
    '....SlSSSSSS....',
    '.....lSSSSS.....',
    '.....SSSSSS.....',
    '......SSSS......',
    '.......SS.......'
  ),
  'weapon:card': grid(
    EMPTY,
    EMPTY,
    '...BBBBBBBBBB...',
    '...BbbbbbbbbB...',
    '...BbbbYYbbbB...',
    '...BbbYyyYbbB...',
    '...BbbYyyYbbB...',
    '...BbbbYYbbbB...',
    '...BbbbbbbbbB...',
    '...BbwwwwwwbB...',
    '...BbbbbbbbbB...',
    '...BbwwwwwwbB...',
    '...BbbbbbbbbB...',
    '...BBBBBBBBBB...'
  ),
  'weapon:aura': DROP,
  'weapon:urns': grid(
    EMPTY,
    EMPTY,
    '..ffffffffffff..',
    '..fccccccfffft..',
    '..fccccccfSSft..',
    '..fccccccfSSft..',
    '..fccccccfSSft..',
    '..ffffffffSSft..',
    '..ffffffffffft..',
    '..fSSfSSfSSfft..',
    '..ffffffffffft..',
    '..fSSfSSfSSfft..',
    '..ffffffffffft..',
    '..fSSfggfSSfft..',
    '..tttttttttttt..'
  ),
  'weapon:nova': grid(
    EMPTY,
    '.....oooooo.....',
    '...oo......oo...',
    '..o..........o..',
    '..o...yyyy...o..',
    '.o...y....y...o.',
    '.o..y..rr..y..o.',
    '.o..y.rrrr.y..o.',
    '.o..y.rrrr.y..o.',
    '.o..y..rr..y..o.',
    '.o...y....y...o.',
    '..o...yyyy...o..',
    '..o..........o..',
    '...oo......oo...',
    '.....oooooo.....'
  ),
  'weapon:bolt': grid(
    EMPTY,
    '.......yyyyy....',
    '......yyyyY.....',
    '......yyyY......',
    '.....yyyY.......',
    '.....yyY........',
    '....yyyyyyyy....',
    '....yyyyyyY.....',
    '.......yyyY.....',
    '......yyyY......',
    '......yyY.......',
    '.....yyY........',
    '.....yY.........',
    '....yY..........',
    '....Y...........'
  ),
  'weapon:axe': grid(
    EMPTY,
    '.....sss.NN.....',
    '....slllsnN.....',
    '...sllllsnN.....',
    '..wlllllsnN.....',
    '..wlllllsnN.....',
    '..wlllllsnN.....',
    '...sllllsnN.....',
    '....slllsnN.....',
    '.....sss.nN.....',
    '.........nN.....',
    '.........nN.....',
    '.........nN.....',
    '.........nN.....',
    '.........NN.....'
  ),
  'weapon:trail': grid(
    EMPTY,
    '.......r........',
    '......rr........',
    '......rro.......',
    '.....rroo...r...',
    '.....roooo..rr..',
    '..r..rooyo.roo..',
    '..rr.rooyoorooo.',
    '..rrrrooyyoooor.',
    '.rroooyyyyyoorr.',
    '.rooyyyyyyyyoor.',
    '.rooyywwwwyyyor.',
    '.rroyywwwwyyorr.',
    '..rrooyyyyoorr..',
    '...RRRRRRRRRR...'
  ),

  'stat:maxHp': HEART,
  'stat:regen': overlay(recolor(HEART, { r: 'm', R: 'r' }), PLUS, 6, 5),
  'stat:overheal': overlay(recolor(HEART, { r: 'y', R: 'Y' }), PLUS, 6, 5),
  'stat:shield': grid(
    EMPTY,
    '..bbbbbbbbbbbb..',
    '..bcbbbbbbbbbB..',
    '..bcbbbyybbbbB..',
    '..bcbbbyybbbbB..',
    '..bcbyyyyyybbB..',
    '..bcbyyyyyybbB..',
    '..bcbbbyybbbbB..',
    '...bcbbyybbbB...',
    '...bcbbyybbbB...',
    '....bcbbbbbB....',
    '.....bbbbbB.....',
    '......bbbB......',
    '.......bB.......'
  ),
  'stat:armor': grid(
    EMPTY,
    EMPTY,
    '...GGG....GGG...',
    '..GgggG..GgggG..',
    '..GggggGGggggG..',
    '..GggggGGggggG..',
    '..GggggGGggggG..',
    '..GYYYYGGYYYYG..',
    '..GggggGGggggG..',
    '..GgGGgGGgGGgG..',
    '..GgGGgGGgGGgG..',
    '..GggggGGggggG..',
    '..GGGGGGGGGGGG..'
  ),
  'stat:evasion': grid(
    EMPTY,
    EMPTY,
    EMPTY,
    '.........cccc...',
    '..ccccccc....c..',
    '.........ccc....',
    EMPTY,
    '.wwwwwwwwwww....',
    EMPTY,
    '...cccccccc.....',
    '...........cc...',
    '....ccccc...c...',
    '..........cc....'
  ),
  'stat:lifesteal': recolor(DROP, { c: 'm', b: 'r', B: 'R' }),
  'stat:thorns': grid(
    EMPTY,
    '.......gg.......',
    '......gggg......',
    '......gGgg......',
    '..gg..gGgg......',
    '..gg..gGgg..gg..',
    '..gg..gGgg..gg..',
    '..gggggGgg..gg..',
    '...ggggGgggggg..',
    '......gGgggg....',
    '......gGgg......',
    '......gGgg......',
    '......gGgg......',
    '....nnnnnnnn....',
    '.....NnnnnN.....'
  ),
  'stat:damage': grid(
    EMPTY,
    '............ll..',
    '...........lwl..',
    '..........lwl...',
    '.........lwl....',
    '........lwl.....',
    '.......lwl......',
    '......lwl.......',
    '..Y..lwl........',
    '...YlwlY........',
    '....YYY.........',
    '...nnYY.........',
    '..nn..Y.........',
    '.nn.............'
  ),
  'stat:critChance': grid(
    EMPTY,
    '.....rrrrrr.....',
    '...rrwwwwwwrr...',
    '..rwwrrrrrrwwr..',
    '..rwrrwwwwrrwr..',
    '.rwrrwwwwwwrrwr.',
    '.rwrwwrrrrwwrwr.',
    '.rwrwwryyrwwrwr.',
    '.rwrwwryyrwwrwr.',
    '.rwrwwrrrrwwrwr.',
    '.rwrrwwwwwwrrwr.',
    '..rwrrwwwwrrwr..',
    '..rwwrrrrrrwwr..',
    '...rrwwwwwwrr...',
    '.....rrrrrr.....'
  ),
  'stat:critDamage': grid(
    EMPTY,
    '.......o........',
    '..o....oo...o...',
    '...o..oyyo.oo...',
    '...ooooyyooo....',
    '....oyyyyyyo....',
    '.ooooyywwyyoooo.',
    '..ooyywwwwyyoo..',
    '...ooyywwyyoo...',
    '....oyyyyyyo....',
    '...ooooyyoooo...',
    '...o..oyyo..o...',
    '..o....oo....o..',
    '.......o........'
  ),
  'stat:attackSpeed': grid(
    EMPTY,
    '......SSSS......',
    '.......SS.......',
    '.....SSSSSS.....',
    '...SSwwwwwwSS...',
    '..SwwwwSwwwwwS..',
    '..SwwwwSwwwwwS..',
    '.SwwwwwSwwwwwwS.',
    '.SwwwwwSSSSwwwS.',
    '.SwwwwwwwwwwwwS.',
    '.SwwwwwwwwwwwwS.',
    '..SwwwwwwwwwwS..',
    '..SwwwwwwwwwwS..',
    '...SSwwwwwwSS...',
    '.....SSSSSS.....'
  ),
  'stat:projectiles': grid(
    EMPTY,
    EMPTY,
    EMPTY,
    '..oo.....yyyy...',
    '...oo...yyyyyY..',
    '..oo.....yyyY...',
    EMPTY,
    '..oo.....yyyy...',
    '...oo...yyyyyY..',
    '..oo.....yyyY...',
    EMPTY,
    '..oo.....yyyy...',
    '...oo...yyyyyY..',
    '..oo.....yyyY...'
  ),
  'stat:ricochet': grid(
    EMPTY,
    EMPTY,
    '..c.........yy..',
    '..cc.......yyyy.',
    '...c.......yyyy.',
    '...cc.......yy..',
    '....c......c....',
    '....cc....cc....',
    '.....c....c.....',
    '.....cc..cc.....',
    '......c..c......',
    '......cccc......',
    '.......cc.......',
    '.SSSSSSSSSSSSSS.'
  ),
  'stat:size': grid(
    EMPTY,
    '.yyyy......yyyy.',
    '.yyy........yyy.',
    '.yyy........yyy.',
    '.y..y......y..y.',
    '.....y....y.....',
    '......oooo......',
    '......oooo......',
    '......oooo......',
    '......oooo......',
    '.....y....y.....',
    '.y..y......y..y.',
    '.yyy........yyy.',
    '.yyy........yyy.',
    '.yyyy......yyyy.'
  ),
  'stat:projectileSpeed': grid(
    EMPTY,
    EMPTY,
    EMPTY,
    EMPTY,
    '.........yy.....',
    '.........yyy....',
    '.ll..yyyyyyyy...',
    '...llyyyyyyyyy..',
    '.ll..yyyyyyyY...',
    '.........yyY....',
    '.........yY.....'
  ),
  'stat:duration': grid(
    EMPTY,
    '...nnnnnnnnnn...',
    '....wwwwwwww....',
    '....wyyyyyyw....',
    '.....wyyyyw.....',
    '......wyyw......',
    '.......yy.......',
    '.......yy.......',
    '......wwww......',
    '.....wwyyww.....',
    '....wwyyyyww....',
    '....wyyyyyyw....',
    '....wwwwwwww....',
    '...nnnnnnnnnn...'
  ),
  'stat:eliteDamage': overlay(
    grid(EMPTY, '...y..y..y..y...', '...yyyyyyyyyy...', '...YYYYYYYYYY...'),
    SKULL,
    0,
    4
  ),
  'stat:knockback': grid(
    EMPTY,
    EMPTY,
    EMPTY,
    '.....rrrrrr.....',
    '....rrwrrrrr....',
    '...rrwrrrrrrr...',
    '.l.rrrrrrrrrr...',
    '...rrrrrrrrrR...',
    'll.RrrrrrrrrR...',
    '....RrrrrrrR....',
    '.....wwwwww.....',
    '.....wwwwww.....',
    '.....RRRRRR.....'
  ),
  'stat:moveSpeed': SHOE,
  'stat:extraJumps': grid(
    EMPTY,
    EMPTY,
    '.......gg.......',
    '......gggg......',
    '.....gg..gg.....',
    '....gg....gg....',
    '...gg......gg...',
    EMPTY,
    '.......gg.......',
    '......gggg......',
    '.....gg..gg.....',
    '....gg....gg....',
    '...gg......gg...'
  ),
  'stat:jumpHeight': grid(
    EMPTY,
    EMPTY,
    '...yyyyyyyyyy...',
    EMPTY,
    '....llllllll....',
    EMPTY,
    '....llllllll....',
    EMPTY,
    '....llllllll....',
    EMPTY,
    '....llllllll....',
    EMPTY,
    '...SSSSSSSSSS...'
  ),
  'stat:luck': grid(
    EMPTY,
    EMPTY,
    '...ggg....ggg...',
    '..ggggg..ggggg..',
    '..gggGG..GGggg..',
    '...ggGGGGGGgg...',
    '...ggGGGGGGgg...',
    '..gggGG..GGggg..',
    '..ggggg..ggggg..',
    '...ggg....ggg...',
    '.......G........',
    '........G.......',
    '.........G......'
  ),
  'stat:difficulty': grid(EMPTY, EMPTY, EMPTY, ...SKULL),
  'stat:pickupRange': grid(
    EMPTY,
    EMPTY,
    '..llll....llll..',
    '..llll....llll..',
    '..rrrr....rrrr..',
    '..rrrr....rrrr..',
    '..rrrr....rrrr..',
    '..rrrrr..rrrrr..',
    '...rrrrrrrrrr...',
    '....rrrrrrrr....',
    '......rrrr......'
  ),
  'stat:xpGain': grid(
    EMPTY,
    EMPTY,
    '......cccc......',
    '.....cwbbbB.....',
    '....cwbbbbbB....',
    '...cbbbbbbbbB...',
    '..cbbbbbbbbbbB..',
    '...BbbbbbbbbB...',
    '....BbbbbbbB....',
    '.....BbbbbB.....',
    '......BbbB......',
    '.......BB.......'
  ),
  'stat:goldGain': grid(
    EMPTY,
    EMPTY,
    '.....yyyyyy.....',
    '....yywwyyyy....',
    '....YyyyyyyY....',
    '.....YYYYYY.....',
    '....yyyyyyyy....',
    '....YYYYYYYY....',
    '....yyyyyyyy....',
    '....YYYYYYYY....',
    '....yyyyyyyy....',
    '....YYYYYYYY....',
    '.....YYYYYY.....'
  ),
  'stat:eliteRate': overlay(grid(), recolor(STAR, { y: 'r' }), 0, 3),
  'stat:powerupPower': grid(
    EMPTY,
    EMPTY,
    EMPTY,
    EMPTY,
    '..SSSSSSSSSSS...',
    '..SgggggggllS...',
    '..SgggggggllSS..',
    '..SgggggggllSS..',
    '..SgggggggllS...',
    '..SSSSSSSSSSS...'
  ),
  'stat:powerupChance': grid(
    EMPTY,
    EMPTY,
    '.....rr..rr.....',
    '....r..rr..r....',
    '.....rrrrrr.....',
    '..pppppyyppppp..',
    '..pppppyyppppp..',
    '..yyyyyyyyyyyy..',
    '...ppppyypppp...',
    '...ppppyypppp...',
    '...ppppyypppp...',
    '...ppppyypppp...',
    '...PPPPyyPPPP...'
  ),

  'ability:eneas': grid(
    EMPTY,
    '..s.s.....s.s...',
    '...S.......S....',
    '..SSS.....SSS...',
    '..SSS.....SSS...',
    '..yyy.....yyy...',
    '..SSS.....SSS...',
    '...S.......S....',
    EMPTY,
    EMPTY,
    EMPTY,
    '...o..oyyo..o...',
    '..oooyyyyyyooo..',
    '.ooyyywwwwyyyoo.',
    '.RRRRRRRRRRRRRR.'
  ),
  'ability:lula': grid(
    EMPTY,
    '.bbb........bbb.',
    '.bwb........bwb.',
    '.bbb........bbb.',
    EMPTY,
    EMPTY,
    '......bbbb......',
    '......bYYb......',
    '......bYYb......',
    '......bbbb......',
    EMPTY,
    EMPTY,
    '.bbb........bbb.',
    '.bwb........bwb.',
    '.bbb........bbb.'
  ),
  'ability:janja': overlay(
    overlay(grid(), ['.mm.mm.', 'mmmmmmm', 'mwmmmmm', '.mmmmm.', '..mmm..', '...m...'], 1, 2),
    ['.rr.rr.', 'rrrrrrr', 'rwrrrrr', '.rrrrr.', '..rrr..', '...r...'],
    8,
    8
  ),
  'ability:bolsonaro': recolor(SHOE, { b: 'g', w: 'y', l: 'y' }),

  'upgrade:reroll': grid(
    EMPTY,
    EMPTY,
    '..wwwwwwwwwwww..',
    '..wSSwwwwwwSSw..',
    '..wSSwwwwwwSSw..',
    '..wwwwwwwwwwww..',
    '..wwwwwSSwwwww..',
    '..wwwwwSSwwwww..',
    '..wwwwwwwwwwww..',
    '..wSSwwwwwwSSw..',
    '..wSSwwwwwwSSw..',
    '..wwwwwwwwwwww..',
    '..llllllllllll..'
  ),
  'upgrade:banish': grid(
    EMPTY,
    '.....rrrrrr.....',
    '...rrrrrrrrrr...',
    '..rrr......rrr..',
    '..rrrr......rr..',
    '.rr.rrr......rr.',
    '.rr..rrr.....rr.',
    '.rr...rrr....rr.',
    '.rr....rrr...rr.',
    '.rr.....rrr..rr.',
    '.rr......rrr.rr.',
    '..rr......rrrr..',
    '..rrr......rrr..',
    '...rrrrrrrrrr...',
    '.....rrrrrr.....'
  ),
  'upgrade:skip': grid(
    EMPTY,
    EMPTY,
    EMPTY,
    '..b.....b....b..',
    '..bb....bb...b..',
    '..bbb...bbb..b..',
    '..bbbb..bbbb.b..',
    '..bbbbb.bbbbbb..',
    '..bbbb..bbbb.b..',
    '..bbb...bbb..b..',
    '..bb....bb...b..',
    '..b.....b....b..'
  ),
};

// An evolved weapon: its drawing with a gold outline and a star.
const evolved = (art: Grid): Grid => withOutline(overlay(art, MINI_STAR, 12, 0), 'Y');

// The finished pixels of an icon, outline included, or undefined when it has no drawing.
export const iconPixels = (id: string): Grid | undefined => {
  if (id.startsWith('evolved:')) {
    const base = ART[`weapon:${id.slice(8)}`];
    return base && evolved(base);
  }
  const art = ART[id];
  return art && withOutline(art);
};
