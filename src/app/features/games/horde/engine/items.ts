import { Rng } from './rng';
import { Bonus, luckShare } from './stats';
import { RunState } from './types';

// Muambas: the run's items, bought from the Camelô shrine or lent by the Agiota. There is no
// limit to how many a run carries, and copies stack: each copy adds its effect again. Most only
// add to stats (`bonuses`, summed into `runStats`); the ones marked special are read by the
// engine where they act (on a hit, a kill, a hurt, standing still...), always through
// `itemCount`, so a run without them plays exactly as before.

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export const ITEM_IDS = [
  // Common
  'coffee',
  'lunchbox',
  'whey',
  'flipflops',
  'rue',
  'amulet',
  'cashback',
  'coach',
  'hangover',
  'cachaca',
  'shades',
  'slipper',
  'keycopy',
  'pastel',
  'overdraft',
  // Uncommon
  'backpack',
  'beer',
  'creditcard',
  'hammock',
  'knife',
  'tenure',
  'deliverybag',
  'feijoada',
  'pyramid',
  'insurance',
  'healthplan',
  'brotherinlaw',
  // Rare
  'belly',
  'kite',
  'monthend',
  'miles',
  'fireworks',
  'scooter',
  'syrup',
  // Legendary
  'jeitinho',
  'gambiarra',
  'belt',
  'pepper',
  'blackout',
  'vacuum',
  'barbecue',
  'friday',
] as const;

export type ItemId = typeof ITEM_IDS[number];

export type ItemDef = { rarity: ItemRarity; bonuses?: Bonus[] };

export const ITEMS: Record<ItemId, ItemDef> = {
  coffee: { rarity: 'common', bonuses: [{ stat: 'attackSpeed', flat: 0.08 }] },
  lunchbox: { rarity: 'common', bonuses: [{ stat: 'maxHp', flat: 25 }] },
  whey: { rarity: 'common', bonuses: [{ stat: 'damage', pct: 0.1 }] },
  flipflops: { rarity: 'common', bonuses: [{ stat: 'moveSpeed', pct: 0.15 }] },
  rue: { rarity: 'common', bonuses: [{ stat: 'luck', flat: 8 }] },
  amulet: { rarity: 'common', bonuses: [{ stat: 'evasion', flat: 15 }] },
  cashback: { rarity: 'common', bonuses: [{ stat: 'goldGain', pct: 0.15 }] },
  coach: { rarity: 'common', bonuses: [{ stat: 'xpGain', pct: 0.08 }] },
  hangover: { rarity: 'common', bonuses: [{ stat: 'regen', flat: 35 }] },
  cachaca: { rarity: 'common', bonuses: [{ stat: 'critChance', flat: 0.1 }] },
  // Special: more damage to enemies still above 90% health.
  shades: { rarity: 'common' },
  slipper: { rarity: 'common', bonuses: [{ stat: 'eliteDamage', pct: 0.15 }] },
  // Special: a chance that a map chest costs nothing.
  keycopy: { rarity: 'common' },
  // Special: a chance of a heart from each kill.
  pastel: { rarity: 'common' },
  overdraft: { rarity: 'common', bonuses: [{ stat: 'difficulty', flat: 0.07 }] },

  backpack: { rarity: 'uncommon', bonuses: [{ stat: 'projectiles', flat: 1 }] },
  beer: {
    rarity: 'uncommon',
    bonuses: [
      { stat: 'damage', pct: 0.2 },
      { stat: 'maxHp', mult: 0.95 },
    ],
  },
  // Special: damage for every chest opened in the run.
  creditcard: { rarity: 'uncommon' },
  // Special: standing still heals.
  hammock: { rarity: 'uncommon' },
  // Special: more damage to enemies close by.
  knife: { rarity: 'uncommon' },
  // Special: the longer the hero stands still, the more damage.
  tenure: { rarity: 'uncommon' },
  // Special: gold for the ground covered.
  deliverybag: { rarity: 'uncommon' },
  // Special: max health for every kill, up to a limit.
  feijoada: { rarity: 'uncommon' },
  // Special: a chance of a second experience gem from each kill.
  pyramid: { rarity: 'uncommon' },
  // Special: gold every time the hero is hurt.
  insurance: { rarity: 'uncommon' },
  healthplan: {
    rarity: 'uncommon',
    bonuses: [
      { stat: 'maxHp', flat: 50 },
      { stat: 'regen', mult: 0.5 },
    ],
  },
  // Special: hits now and then get the hero punched. He can't kill you, but he wants to.
  brotherinlaw: { rarity: 'uncommon' },

  // Special: damage for every 100 max health.
  belly: { rarity: 'rare' },
  // Special: more damage in the air.
  kite: { rarity: 'rare' },
  // Special: more damage the lower the hero's health.
  monthend: { rarity: 'rare' },
  // Special: damage for every kill, up to a limit.
  miles: { rarity: 'rare' },
  // Special: a chance that a kill fires a homing rocket.
  fireworks: { rarity: 'rare' },
  // Special: attack speed from moving fast.
  scooter: { rarity: 'rare' },
  // Special: crits may explode.
  syrup: { rarity: 'rare' },

  // Special: a hit that would kill freezes time and saves the hero once (the copy is used up).
  jeitinho: { rarity: 'legendary' },
  // Special: weapon levels roll three stats instead of two.
  gambiarra: { rarity: 'legendary' },
  // Special: a small chance of a hit for 20 times the damage.
  belt: { rarity: 'legendary' },
  // Special: hits may explode around the enemy.
  pepper: { rarity: 'legendary' },
  // Special: hits may call lightning.
  blackout: { rarity: 'legendary' },
  // Special: every so often pulls every gem on the map.
  vacuum: { rarity: 'legendary' },
  barbecue: {
    rarity: 'legendary',
    bonuses: [
      { stat: 'maxHp', flat: 100 },
      { stat: 'regen', flat: 50 },
    ],
  },
  // Special: under half health, twice the damage.
  friday: { rarity: 'legendary' },
};

// The numbers of the special items, per copy.
export const ITEM_NUMBERS = {
  shadesAbove: 0.9,
  shadesDamage: 0.2,
  keycopyChance: 0.1,
  pastelChance: 0.02,
  creditcardDamage: 0.025,
  hammockAfter: 1,
  // Share of max health healed a second, standing still.
  hammockHeal: 0.03,
  knifeReach: 4,
  knifeDamage: 0.2,
  // Damage per second standing still, up to the max.
  tenureRate: 0.2,
  tenureMax: 1,
  // Units walked for each gold.
  deliveryStep: 25,
  feijoadaHp: 0.5,
  feijoadaMax: 100,
  pyramidChance: 0.12,
  insuranceGold: 2,
  brotherChance: 0.25,
  brotherCooldown: 3,
  // Share of the hero's health a punch takes (never the last point).
  brotherPunch: 0.05,
  bellyDamage: 0.2,
  kiteDamage: 0.5,
  monthendMax: 0.6,
  milesDamage: 0.001,
  milesMax: 1,
  fireworksChance: 0.2,
  // Attack speed at the hero's top running speed.
  scooterMax: 0.4,
  syrupChance: 0.5,
  syrupDamage: 0.5,
  // Share of max health the hero keeps after the save, and seconds of the freeze.
  jeitinhoHp: 0.3,
  jeitinhoSeconds: 3,
  beltChance: 0.02,
  beltDamage: 20,
  pepperChance: 0.25,
  pepperDamage: 0.65,
  pepperRadius: 2.5,
  blackoutChance: 0.25,
  blackoutDamage: 1,
  blackoutRadius: 1.6,
  vacuumEvery: 20,
  fridayBelow: 0.5,
  fridayDamage: 1,
} as const;

// At most this many item blasts (pepper, syrup, blackout) go off a tick; the rest fizzle, so an
// aura hitting hundreds can't stall the game.
export const MAX_ITEM_BLASTS = 12;

export const itemCount = (state: RunState, id: ItemId): number => state.items?.[id] ?? 0;

// How likely each rarity is in an offer, before luck; luck makes the rarer ones likelier.
const RARITY_WEIGHTS: Record<ItemRarity, number> = {
  common: 55,
  uncommon: 30,
  rare: 12,
  legendary: 3,
};

export const rarityWeight = (rarity: ItemRarity, luck: number): number => {
  const tilt = 1 + 2 * luckShare(luck);
  if (rarity === 'rare') return RARITY_WEIGHTS.rare * tilt;
  if (rarity === 'legendary') return RARITY_WEIGHTS.legendary * tilt * tilt;
  return RARITY_WEIGHTS[rarity];
};

// One item drawn by rarity weight from those allowed.
export const drawItem = (
  rng: Rng,
  luck: number,
  allowed: (id: ItemId) => boolean = () => true
): ItemId | undefined => {
  const pool = ITEM_IDS.filter(allowed);
  const total = pool.reduce((sum, id) => sum + rarityWeight(ITEMS[id].rarity, luck), 0);
  let roll = rng.next() * total;
  for (let i = 0; i < pool.length; i += 1) {
    roll -= rarityWeight(ITEMS[pool[i]].rarity, luck);
    if (roll < 0) return pool[i];
  }
  return pool[pool.length - 1];
};

// The stat bonuses of the items the run carries, copies counted.
export const itemBonuses = (state: RunState): Bonus[] => {
  const out: Bonus[] = [];
  if (!state.items) return out;
  ITEM_IDS.forEach((id) => {
    const n = state.items?.[id] ?? 0;
    if (n <= 0) return;
    ITEMS[id].bonuses?.forEach((b) => {
      const scaled: Bonus = { stat: b.stat };
      if (b.flat) scaled.flat = b.flat * n;
      if (b.pct) scaled.pct = b.pct * n;
      if (b.mult) {
        let m = 1;
        for (let i = 0; i < n; i += 1) m *= b.mult;
        scaled.mult = m;
      }
      out.push(scaled);
    });
  });
  return out;
};

// Camelô: each purchase costs more than the last. A Camelô stays open after a sale.
export const CAMELO_PRICE = 30;
export const cameloPrice = (bought: number): number => {
  let price = CAMELO_PRICE;
  for (let i = 0; i < bought; i += 1) price *= 1.8;
  return Math.round(price);
};

// Agiota: what each loan costs until the end of the run.
export const AGIOTA_HP = 0.9;
export const AGIOTA_DIFFICULTY = 0.1;
// Chance that the Agiota's item is legendary instead of rare.
export const AGIOTA_LEGENDARY = 0.25;
