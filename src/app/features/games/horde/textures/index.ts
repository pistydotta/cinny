import clover from './clover.png';
import dryGround from './dryGround.png';
import earth from './earth.png';
import grass from './grass.png';
import gravel from './gravel.png';
import skyDay from './skyDay.jpg';
import skyNight from './skyNight.jpg';
import undergrowth from './undergrowth.png';
import wildGrass from './wildGrass.png';

// Seamless 128px ground textures from the "PSX Forest Asset Collection" by Stark Crafts
// (starkcrafts.itch.io), free and allowed in games by its author. Drawn unfiltered, like an old
// console would.
export const GROUND_TEXTURES = { grass, wildGrass, undergrowth, clover, earth, dryGround, gravel };
export type GroundTexture = keyof typeof GROUND_TEXTURES;

// The day and the night sky, from the same author's "PSX Daysky" and "PSX Nightsky" HDRIs, made
// small: each is the whole sky unrolled, the horizon across its middle.
export const SKY_TEXTURES = { day: skyDay, night: skyNight };
