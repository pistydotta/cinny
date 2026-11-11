import { CharacterId } from '../engine/types';
import bolsonaro from './bolsonaro.png';
import eneas from './eneas.png';
import janja from './janja.png';
import lula from './lula.png';

// Every hero is pixel art from PixelLab. Each sheet is one row of eight 48px frames, the hero
// seen from eight sides, in this order: facing the camera (south), then turning to the hero's
// left: south-east, east, north-east, north, north-west, west, south-west.
export const SPRITE_FRAMES = 8;

export const HERO_SPRITES: Record<CharacterId, string> = { eneas, lula, janja, bolsonaro };
