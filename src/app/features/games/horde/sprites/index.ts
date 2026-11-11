import { CharacterId } from '../engine/types';
import eneas from './eneas.png';

// Heroes drawn from pixel art instead of boxes. Each sheet is one row of eight frames, the hero
// seen from eight sides, in this order: facing the camera (south), then turning to the hero's
// left: south-east, east, north-east, north, north-west, west, south-west.
export const SPRITE_FRAMES = 8;

export const HERO_SPRITES: Partial<Record<CharacterId, string>> = { eneas };
