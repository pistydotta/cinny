import { ItemId, ITEMS, ItemRarity } from './engine/items';
import { tr } from '../../translation/tr';

// The Muambas' names and what each does, in the game's words.

export type ItemLabel = { icon: string; name: string; text: string; rarity: ItemRarity };

const words = (id: ItemId): { icon: string; name: string; text: string } => {
  switch (id) {
    case 'coffee':
      return {
        icon: '☕',
        name: tr('games.horde.item.coffee', 'Reheated Coffee'),
        text: tr('games.horde.item.coffee_text', '+8% attack speed.'),
      };
    case 'lunchbox':
      return {
        icon: '🍱',
        name: tr('games.horde.item.lunchbox', "Mom's Lunchbox"),
        text: tr('games.horde.item.lunchbox_text', '+25 max health.'),
      };
    case 'whey':
      return {
        icon: '🥤',
        name: tr('games.horde.item.whey', 'Unlabeled Whey'),
        text: tr('games.horde.item.whey_text', '+10% damage. Came from Paraguay, trust me.'),
      };
    case 'flipflops':
      return {
        icon: '🩴',
        name: tr('games.horde.item.flipflops', 'Flip-flops'),
        text: tr('games.horde.item.flipflops_text', '+15% movement speed.'),
      };
    case 'rue':
      return {
        icon: '🌿',
        name: tr('games.horde.item.rue', 'Rue Behind the Ear'),
        text: tr('games.horde.item.rue_text', '+8 luck.'),
      };
    case 'amulet':
      return {
        icon: '🧿',
        name: tr('games.horde.item.amulet', 'Lucky Charm'),
        text: tr('games.horde.item.amulet_text', '+15 evasion.'),
      };
    case 'cashback':
      return {
        icon: '💸',
        name: tr('games.horde.item.cashback', 'Pix Cashback'),
        text: tr('games.horde.item.cashback_text', '+15% gold.'),
      };
    case 'coach':
      return {
        icon: '🎓',
        name: tr('games.horde.item.coach', 'Coaching Course'),
        text: tr(
          'games.horde.item.coach_text',
          '+8% experience. Diploma not recognized by the Ministry.'
        ),
      };
    case 'hangover':
      return {
        icon: '💊',
        name: tr('games.horde.item.hangover', 'Hangover Pill'),
        text: tr('games.horde.item.hangover_text', '+35 health regen a minute.'),
      };
    case 'cachaca':
      return {
        icon: '🥃',
        name: tr('games.horde.item.cachaca', 'Still Cachaça'),
        text: tr('games.horde.item.cachaca_text', '+10% crit chance.'),
      };
    case 'shades':
      return {
        icon: '🕶️',
        name: tr('games.horde.item.shades', 'Street Vendor Shades'),
        text: tr('games.horde.item.shades_text', '+20% damage to enemies above 90% health.'),
      };
    case 'slipper':
      return {
        icon: '🥿',
        name: tr('games.horde.item.slipper', "Mom's Flying Slipper"),
        text: tr('games.horde.item.slipper_text', '+15% damage to elites and bosses.'),
      };
    case 'keycopy':
      return {
        icon: '🔑',
        name: tr('games.horde.item.keycopy', 'Copied Key'),
        text: tr('games.horde.item.keycopy_text', '10% chance that a map chest is free.'),
      };
    case 'pastel':
      return {
        icon: '🥟',
        name: tr('games.horde.item.pastel', 'Street Fair Pastel'),
        text: tr('games.horde.item.pastel_text', '2% chance of a heart from each kill.'),
      };
    case 'overdraft':
      return {
        icon: '📉',
        name: tr('games.horde.item.overdraft', 'Overdraft Interest'),
        text: tr(
          'games.horde.item.overdraft_text',
          '+7% difficulty: more enemies, more experience and gold.'
        ),
      };
    case 'backpack':
      return {
        icon: '🎒',
        name: tr('games.horde.item.backpack', 'Knockoff Backpack'),
        text: tr('games.horde.item.backpack_text', '+1 projectile for every weapon.'),
      };
    case 'beer':
      return {
        icon: '🍺',
        name: tr('games.horde.item.beer', 'Warm Tallboy'),
        text: tr('games.horde.item.beer_text', '+20% damage, -5% max health.'),
      };
    case 'creditcard':
      return {
        icon: '💳',
        name: tr('games.horde.item.creditcard', 'Maxed-out Credit Card'),
        text: tr(
          'games.horde.item.creditcard_text',
          '+2.5% damage for every chest bought. The bill comes later.'
        ),
      };
    case 'hammock':
      return {
        icon: '🏝️',
        name: tr('games.horde.item.hammock', 'Porch Hammock'),
        text: tr(
          'games.horde.item.hammock_text',
          'Standing still heals 3% of your health a second.'
        ),
      };
    case 'knife':
      return {
        icon: '🔪',
        name: tr('games.horde.item.knife', 'Peixeira'),
        text: tr('games.horde.item.knife_text', '+20% damage to enemies close by.'),
      };
    case 'tenure':
      return {
        icon: '🗂️',
        name: tr('games.horde.item.tenure', 'Job for Life'),
        text: tr('games.horde.item.tenure_text', 'Standing still builds up damage, up to +100%.'),
      };
    case 'deliverybag':
      return {
        icon: '🛵',
        name: tr('games.horde.item.deliverybag', 'Delivery Bag'),
        text: tr('games.horde.item.deliverybag_text', 'Gold for the ground you cover.'),
      };
    case 'feijoada':
      return {
        icon: '🍲',
        name: tr('games.horde.item.feijoada', 'Saturday Feijoada'),
        text: tr('games.horde.item.feijoada_text', '+0.5 max health for every kill, up to +100.'),
      };
    case 'pyramid':
      return {
        icon: '🔺',
        name: tr('games.horde.item.pyramid', 'Pyramid Scheme'),
        text: tr(
          'games.horde.item.pyramid_text',
          '12% chance of a second experience gem from each kill.'
        ),
      };
    case 'insurance':
      return {
        icon: '📱',
        name: tr('games.horde.item.insurance', 'Phone Insurance'),
        text: tr('games.horde.item.insurance_text', "Gold every time you're hurt."),
      };
    case 'healthplan':
      return {
        icon: '🏥',
        name: tr('games.horde.item.healthplan', 'Basic Health Plan'),
        text: tr('games.horde.item.healthplan_text', '+50 max health, half the health regen.'),
      };
    case 'brotherinlaw':
      return {
        icon: '🙄',
        name: tr('games.horde.item.brotherinlaw', 'Brother-in-law'),
        text: tr(
          'games.horde.item.brotherinlaw_text',
          "Now and then punches you when you hit someone. He can't kill you, but he wants to."
        ),
      };
    case 'belly':
      return {
        icon: '🍻',
        name: tr('games.horde.item.belly', 'Beer Belly'),
        text: tr('games.horde.item.belly_text', '+20% damage for every 100 max health.'),
      };
    case 'kite':
      return {
        icon: '🪁',
        name: tr('games.horde.item.kite', 'Kite with Cerol'),
        text: tr('games.horde.item.kite_text', '+50% damage in the air.'),
      };
    case 'monthend':
      return {
        icon: '🗓️',
        name: tr('games.horde.item.monthend', 'End of the Month'),
        text: tr(
          'games.horde.item.monthend_text',
          'More damage the less health you have, up to +60%.'
        ),
      };
    case 'miles':
      return {
        icon: '✈️',
        name: tr('games.horde.item.miles', 'Credit Card Miles'),
        text: tr('games.horde.item.miles_text', '+0.1% damage for every kill, up to +100%.'),
      };
    case 'fireworks':
      return {
        icon: '🎆',
        name: tr('games.horde.item.fireworks', 'São João Rocket'),
        text: tr(
          'games.horde.item.fireworks_text',
          '20% chance that a kill fires a rocket at the nearest enemy.'
        ),
      };
    case 'scooter':
      return {
        icon: '🛴',
        name: tr('games.horde.item.scooter', 'Rental Scooter'),
        text: tr(
          'games.horde.item.scooter_text',
          'The faster you go, the faster you attack, up to +40%.'
        ),
      };
    case 'syrup':
      return {
        icon: '🍯',
        name: tr('games.horde.item.syrup', "Grandma's Syrup"),
        text: tr(
          'games.horde.item.syrup_text',
          'Crits have a 50% chance to explode for half their damage.'
        ),
      };
    case 'jeitinho':
      return {
        icon: '🤝',
        name: tr('games.horde.item.jeitinho', 'Jeitinho Brasileiro'),
        text: tr(
          'games.horde.item.jeitinho_text',
          'A blow that would kill you freezes time and gets you back up. Used up after once.'
        ),
      };
    case 'gambiarra':
      return {
        icon: '🔧',
        name: tr('games.horde.item.gambiarra', 'Gambiarra'),
        text: tr(
          'games.horde.item.gambiarra_text',
          'Weapon levels roll three stats instead of two.'
        ),
      };
    case 'belt':
      return {
        icon: '🪢',
        name: tr('games.horde.item.belt', "Dad's Belt"),
        text: tr('games.horde.item.belt_text', '2% chance to hit for 20 times the damage.'),
      };
    case 'pepper':
      return {
        icon: '🌶️',
        name: tr('games.horde.item.pepper', 'Malagueta Pepper'),
        text: tr(
          'games.horde.item.pepper_text',
          'Hits have a 25% chance to explode for 65% of their damage around.'
        ),
      };
    case 'blackout':
      return {
        icon: '⚡',
        name: tr('games.horde.item.blackout', 'Blackout'),
        text: tr(
          'games.horde.item.blackout_text',
          'Hits have a 25% chance to call down lightning.'
        ),
      };
    case 'vacuum':
      return {
        icon: '🧹',
        name: tr('games.horde.item.vacuum', 'Infomercial Vacuum'),
        text: tr(
          'games.horde.item.vacuum_text',
          'Every 20 seconds pulls every experience gem on the map.'
        ),
      };
    case 'barbecue':
      return {
        icon: '🍖',
        name: tr('games.horde.item.barbecue', 'Sunday Barbecue'),
        text: tr('games.horde.item.barbecue_text', '+100 max health, +50 health regen a minute.'),
      };
    case 'friday':
      return {
        icon: '⏰',
        name: tr('games.horde.item.friday', 'Friday, 5:59 pm'),
        text: tr('games.horde.item.friday_text', 'Under half health, twice the damage.'),
      };
    default:
      return { icon: '❔', name: id, text: '' };
  }
};

export const itemLabel = (id: ItemId): ItemLabel => ({ ...words(id), rarity: ITEMS[id].rarity });

export const rarityName = (rarity: ItemRarity): string => {
  switch (rarity) {
    case 'uncommon':
      return tr('games.horde.rarity.uncommon', 'Uncommon');
    case 'rare':
      return tr('games.horde.rarity.rare', 'Rare');
    case 'legendary':
      return tr('games.horde.rarity.legendary', 'Legendary');
    default:
      return tr('games.horde.rarity.common', 'Common');
  }
};
