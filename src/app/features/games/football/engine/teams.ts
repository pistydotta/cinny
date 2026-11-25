// The teams: the 2026 Brasileirão Série A and national sides. Only a name, kit colours and a
// strength: no crests or badges, and the players are shirt numbers, not real people.
//
// A kit's shirt has a pattern: `stripes` are vertical, `hoops` horizontal, `band` a stripe
// across the chest, `sash` a diagonal and `checks` a chequerboard; `trim` is the second colour.

export type Pattern = 'solid' | 'stripes' | 'hoops' | 'band' | 'sash' | 'checks';

export type Kit = {
  shirt: string;
  trim: string;
  pattern: Pattern;
  shorts: string;
  socks: string;
};

export type League = 'br' | 'nation';

export type Team = {
  id: string;
  name: string;
  // Three letters for the scoreboard.
  short: string;
  league: League;
  // 60 to 90: pace, skill and how well the CPU plays it.
  rating: number;
  home: Kit;
  away: Kit;
};

const kit = (
  shirt: string,
  shorts: string,
  socks: string,
  pattern: Pattern = 'solid',
  trim = shirt
): Kit => ({ shirt, trim, pattern, shorts, socks });

const WHITE = '#f4f4f0';
const BLACK = '#17171a';

export const TEAMS: Team[] = [
  // Brasileirão Série A 2026
  {
    id: 'flamengo',
    name: 'Flamengo',
    short: 'FLA',
    league: 'br',
    rating: 85,
    home: kit('#c8102e', WHITE, BLACK, 'hoops', BLACK),
    away: kit(WHITE, WHITE, WHITE, 'band', '#c8102e'),
  },
  {
    id: 'palmeiras',
    name: 'Palmeiras',
    short: 'PAL',
    league: 'br',
    rating: 85,
    home: kit('#006437', WHITE, '#006437'),
    away: kit(WHITE, '#006437', WHITE),
  },
  {
    id: 'cruzeiro',
    name: 'Cruzeiro',
    short: 'CRU',
    league: 'br',
    rating: 81,
    home: kit('#0033a0', WHITE, WHITE),
    away: kit(WHITE, '#0033a0', '#0033a0'),
  },
  {
    id: 'mirassol',
    name: 'Mirassol',
    short: 'MIR',
    league: 'br',
    rating: 75,
    home: kit('#ffd100', '#0b7a3b', '#ffd100'),
    away: kit('#0b7a3b', '#0b7a3b', '#0b7a3b'),
  },
  {
    id: 'fluminense',
    name: 'Fluminense',
    short: 'FLU',
    league: 'br',
    rating: 79,
    home: kit('#7a0026', WHITE, WHITE, 'stripes', '#00613e'),
    away: kit(WHITE, WHITE, WHITE, 'band', '#7a0026'),
  },
  {
    id: 'botafogo',
    name: 'Botafogo',
    short: 'BOT',
    league: 'br',
    rating: 80,
    home: kit(BLACK, BLACK, '#8c8c8c', 'stripes', WHITE),
    away: kit(WHITE, WHITE, WHITE),
  },
  {
    id: 'bahia',
    name: 'Bahia',
    short: 'BAH',
    league: 'br',
    rating: 78,
    home: kit(WHITE, '#0055a4', WHITE),
    away: kit('#0055a4', '#0055a4', '#0055a4', 'band', '#d0021b'),
  },
  {
    id: 'saopaulo',
    name: 'São Paulo',
    short: 'SAO',
    league: 'br',
    rating: 79,
    home: kit(WHITE, WHITE, WHITE, 'band', '#d0021b'),
    away: kit('#d0021b', BLACK, BLACK, 'stripes', BLACK),
  },
  {
    id: 'gremio',
    name: 'Grêmio',
    short: 'GRE',
    league: 'br',
    rating: 78,
    home: kit('#0d80bf', BLACK, WHITE, 'stripes', BLACK),
    away: kit(WHITE, WHITE, WHITE),
  },
  {
    id: 'bragantino',
    name: 'Bragantino',
    short: 'BRA',
    league: 'br',
    rating: 77,
    home: kit(WHITE, '#d0021b', WHITE),
    away: kit('#d0021b', '#d0021b', '#d0021b'),
  },
  {
    id: 'atleticomg',
    name: 'Atlético Mineiro',
    short: 'CAM',
    league: 'br',
    rating: 80,
    home: kit(WHITE, BLACK, WHITE, 'stripes', BLACK),
    away: kit(BLACK, BLACK, BLACK),
  },
  {
    id: 'santos',
    name: 'Santos',
    short: 'SAN',
    league: 'br',
    rating: 77,
    home: kit(WHITE, WHITE, WHITE),
    away: kit(BLACK, BLACK, BLACK, 'stripes', WHITE),
  },
  {
    id: 'corinthians',
    name: 'Corinthians',
    short: 'COR',
    league: 'br',
    rating: 79,
    home: kit(WHITE, BLACK, WHITE),
    away: kit(BLACK, BLACK, BLACK),
  },
  {
    id: 'vasco',
    name: 'Vasco',
    short: 'VAS',
    league: 'br',
    rating: 77,
    home: kit(WHITE, WHITE, WHITE, 'sash', BLACK),
    away: kit(BLACK, BLACK, BLACK, 'sash', WHITE),
  },
  {
    id: 'vitoria',
    name: 'Vitória',
    short: 'VIT',
    league: 'br',
    rating: 74,
    home: kit('#d0021b', BLACK, '#d0021b', 'hoops', BLACK),
    away: kit(WHITE, WHITE, WHITE),
  },
  {
    id: 'internacional',
    name: 'Internacional',
    short: 'INT',
    league: 'br',
    rating: 79,
    home: kit('#e2001a', WHITE, '#e2001a'),
    away: kit(WHITE, '#e2001a', WHITE),
  },
  {
    id: 'coritiba',
    name: 'Coritiba',
    short: 'CFC',
    league: 'br',
    rating: 73,
    home: kit(WHITE, BLACK, WHITE, 'band', '#00703c'),
    away: kit('#00703c', '#00703c', '#00703c'),
  },
  {
    id: 'athletico',
    name: 'Athletico Paranaense',
    short: 'CAP',
    league: 'br',
    rating: 75,
    home: kit('#d0021b', BLACK, BLACK, 'stripes', BLACK),
    away: kit(WHITE, WHITE, WHITE),
  },
  {
    id: 'chapecoense',
    name: 'Chapecoense',
    short: 'CHA',
    league: 'br',
    rating: 71,
    home: kit('#00843d', WHITE, WHITE),
    away: kit(WHITE, '#00843d', '#00843d'),
  },
  {
    id: 'remo',
    name: 'Remo',
    short: 'REM',
    league: 'br',
    rating: 71,
    home: kit('#13235b', WHITE, '#13235b'),
    away: kit(WHITE, '#13235b', WHITE),
  },

  // National teams
  {
    id: 'brasil',
    name: 'Brasil',
    short: 'BRA',
    league: 'nation',
    rating: 87,
    home: kit('#ffdf00', '#0047ab', WHITE),
    away: kit('#0047ab', WHITE, '#0047ab'),
  },
  {
    id: 'argentina',
    name: 'Argentina',
    short: 'ARG',
    league: 'nation',
    rating: 88,
    home: kit('#75aadb', BLACK, WHITE, 'stripes', WHITE),
    away: kit('#1c2c5b', '#1c2c5b', '#1c2c5b'),
  },
  {
    id: 'franca',
    name: 'França',
    short: 'FRA',
    league: 'nation',
    rating: 88,
    home: kit('#1d2b5b', WHITE, '#d0021b'),
    away: kit(WHITE, '#1d2b5b', WHITE),
  },
  {
    id: 'espanha',
    name: 'Espanha',
    short: 'ESP',
    league: 'nation',
    rating: 88,
    home: kit('#c60b1e', '#1d2b5b', '#c60b1e'),
    away: kit(WHITE, WHITE, WHITE),
  },
  {
    id: 'inglaterra',
    name: 'Inglaterra',
    short: 'ING',
    league: 'nation',
    rating: 87,
    home: kit(WHITE, '#1d2b5b', WHITE),
    away: kit('#c60b1e', '#c60b1e', '#c60b1e'),
  },
  {
    id: 'alemanha',
    name: 'Alemanha',
    short: 'ALE',
    league: 'nation',
    rating: 86,
    home: kit(WHITE, BLACK, WHITE),
    away: kit(BLACK, BLACK, BLACK, 'band', '#c60b1e'),
  },
  {
    id: 'portugal',
    name: 'Portugal',
    short: 'POR',
    league: 'nation',
    rating: 86,
    home: kit('#a50f2d', '#a50f2d', '#a50f2d', 'band', '#046a38'),
    away: kit(WHITE, WHITE, WHITE),
  },
  {
    id: 'holanda',
    name: 'Holanda',
    short: 'HOL',
    league: 'nation',
    rating: 84,
    home: kit('#f36c21', '#f36c21', '#f36c21'),
    away: kit('#1d2b5b', '#1d2b5b', '#1d2b5b'),
  },
  {
    id: 'italia',
    name: 'Itália',
    short: 'ITA',
    league: 'nation',
    rating: 83,
    home: kit('#1f5fbf', WHITE, '#1f5fbf'),
    away: kit(WHITE, '#1f5fbf', WHITE),
  },
  {
    id: 'belgica',
    name: 'Bélgica',
    short: 'BEL',
    league: 'nation',
    rating: 83,
    home: kit('#c60b1e', '#c60b1e', '#c60b1e'),
    away: kit(WHITE, WHITE, WHITE),
  },
  {
    id: 'croacia',
    name: 'Croácia',
    short: 'CRO',
    league: 'nation',
    rating: 82,
    home: kit(WHITE, WHITE, WHITE, 'checks', '#d0021b'),
    away: kit('#1d2b5b', '#1d2b5b', '#1d2b5b'),
  },
  {
    id: 'uruguai',
    name: 'Uruguai',
    short: 'URU',
    league: 'nation',
    rating: 82,
    home: kit('#5cbfeb', BLACK, BLACK),
    away: kit(WHITE, WHITE, WHITE),
  },
  {
    id: 'colombia',
    name: 'Colômbia',
    short: 'COL',
    league: 'nation',
    rating: 81,
    home: kit('#fcd116', '#003893', WHITE),
    away: kit('#003893', '#003893', '#003893'),
  },
  {
    id: 'marrocos',
    name: 'Marrocos',
    short: 'MAR',
    league: 'nation',
    rating: 81,
    home: kit('#c1272d', '#006233', '#c1272d'),
    away: kit(WHITE, WHITE, WHITE),
  },
  {
    id: 'japao',
    name: 'Japão',
    short: 'JAP',
    league: 'nation',
    rating: 80,
    home: kit('#1d2f6f', WHITE, '#1d2f6f'),
    away: kit(WHITE, '#1d2f6f', WHITE),
  },
  {
    id: 'mexico',
    name: 'México',
    short: 'MEX',
    league: 'nation',
    rating: 79,
    home: kit('#006847', WHITE, '#ce1126'),
    away: kit(WHITE, WHITE, WHITE),
  },
  {
    id: 'eua',
    name: 'Estados Unidos',
    short: 'EUA',
    league: 'nation',
    rating: 79,
    home: kit(WHITE, '#1d2b5b', WHITE),
    away: kit('#1d2b5b', '#1d2b5b', '#1d2b5b'),
  },
];

export const teamById = (id: string): Team => TEAMS.find((t) => t.id === id) ?? TEAMS[0];

const rgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  // eslint-disable-next-line no-bitwise
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// How far apart two colours look, roughly (0 to about 765).
export const colorDistance = (a: string, b: string): number => {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  const r = (r1 + r2) / 2;
  return Math.sqrt(
    (2 + r / 256) * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + (2 + (255 - r) / 256) * (b1 - b2) ** 2
  );
};

// The kits the two teams wear: the visitors change when the shirts would look alike.
export const matchKits = (home: Team, away: Team): [Kit, Kit] => {
  const clash = (a: Kit, b: Kit) => colorDistance(a.shirt, b.shirt) < 160;
  if (!clash(home.home, away.home)) return [home.home, away.home];
  if (!clash(home.home, away.away)) return [home.home, away.away];
  return [home.home, kit('#ffd23f', BLACK, '#ffd23f')];
};

// Goalkeepers wear a colour far from both kits.
const KEEPER_COLORS = ['#2fbf5b', '#ff8c1a', '#9b59ff', '#20c3c3', '#ff4fa3', '#222831'];

export const keeperKit = (kits: [Kit, Kit], side: 0 | 1): Kit => {
  const others = [kits[0].shirt, kits[1].shirt, kits[0].trim, kits[1].trim];
  const sorted = [...KEEPER_COLORS].sort(
    (a, b) =>
      Math.min(...others.map((o) => colorDistance(b, o))) -
      Math.min(...others.map((o) => colorDistance(a, o)))
  );
  const color = sorted[side];
  return kit(color, color, color);
};
