import { describe, expect, it } from 'vitest';
import { hasScene, trucoScene } from './trucoScene';

describe('trucoScene', () => {
  it('only seats two or four players at the bar', () => {
    expect([2, 3, 4, 6].map(hasScene)).toEqual([true, false, true, false]);
  });

  it('covers a tall stage and keeps the table at the bottom', () => {
    const s = trucoScene(390, 630, 4, 0);
    expect(s.wide).toBe(false);
    expect(s.width).toBeGreaterThanOrEqual(390);
    expect(s.top + s.height).toBe(630);
  });

  it.each([
    [1504, 819],
    [1214, 752],
  ])('covers a wide stage with the whole photo at %i × %i', (width, height) => {
    const s = trucoScene(width, height, 4, 0);
    expect(s.wide).toBe(true);
    // No bare stage around the photo, and its proportions kept.
    expect(s.left).toBeLessThanOrEqual(0);
    expect(s.top).toBeLessThanOrEqual(0);
    expect(s.left + s.width).toBeGreaterThanOrEqual(width);
    expect(s.top + s.height).toBeGreaterThanOrEqual(height);
    expect(s.width / s.height).toBeCloseTo(1672 / 941, 2);
  });

  it.each([
    [1504, 819],
    [1280, 620],
    [984, 652],
  ])('gathers the trick in the middle and the vira by the hand at %i × %i', (width, height) => {
    const s = trucoScene(width, height, 4, 0);
    const [mine, left, far, right] = s.played;
    // The far card lies on the table, past its back edge.
    expect(far.y).toBeGreaterThanOrEqual(s.top + s.height * 0.75);
    // The four meet in the middle, each a step toward its player.
    expect(far.x).toBe(Math.round(width / 2));
    expect(mine.x).toBe(far.x);
    expect(left.x).toBeLessThan(far.x);
    expect(right.x).toBeGreaterThan(far.x);
    expect(far.y).toBeLessThan(left.y);
    expect(left.y).toBe(right.y);
    expect(left.y).toBeLessThan(mine.y);
    // The viewer's card clears their hand, held low but mostly showing.
    const handTop = height - Math.ceil(s.handCard * 1.54) - 12 + s.handDrop;
    expect(mine.y + (s.card + 13) * 0.62).toBeLessThanOrEqual(handTop);
    expect(height - handTop).toBeGreaterThanOrEqual(s.handCard * 1.2);
    // The vira stands right of the hand and the call buttons, inside the stage.
    expect(s.vira.x - s.viraCard / 2).toBeGreaterThan(width / 2 + s.handCard * 1.65);
    expect(s.vira.x + s.viraCard * 1.65).toBeLessThanOrEqual(width);
  });

  it('puts the viewer at the camera and the others clockwise on the chairs', () => {
    const s = trucoScene(1280, 620, 4, 2);
    const [left, across, right, me] = [3, 0, 1, 2].map((seat) => s.seats[seat]);
    expect(left.x).toBeLessThan(across.x);
    expect(across.x).toBeLessThan(right.x);
    expect(across.y).toBeLessThan(me.y);
    expect(me.x).toBe(640);
    // Each card lands between its player and the middle of the table.
    expect(s.played[3].x).toBeGreaterThan(left.x);
    expect(s.played[1].x).toBeLessThan(right.x);
  });

  it('seats a two-player game across the table', () => {
    const s = trucoScene(1280, 620, 2, 1);
    expect(s.seats[0].x).toBe(640);
    expect(s.seats[0].y).toBeLessThan(s.seats[1].y);
  });

  it('keeps every seat and card inside a phone screen', () => {
    const s = trucoScene(390, 630, 4, 0);
    [...s.seats, ...s.played, s.vira].forEach((p) => {
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(390);
      expect(p.y).toBeGreaterThan(0);
      expect(p.y).toBeLessThan(630);
    });
  });

  it.each([
    [390, 630],
    [833, 745],
  ])('centers the vira between the far play and the viewer’s hand at %i × %i', (width, height) => {
    const scene = trucoScene(width, height, 4, 1);
    expect(scene.vira.x).toBe(Math.round(width / 2));
    expect(scene.vira.y).toBeGreaterThan(scene.played[3].y);
    expect(scene.vira.y + scene.viraCard * 0.68).toBeLessThan(height - scene.handCard * 1.54 - 12);
    expect(trucoScene(width, height, 4, 0).vira).toEqual(scene.vira);
  });

  it.each([320, 390])('separates the viewer’s play from the side cards at %ipx', (width) => {
    const scene = trucoScene(width, 630, 4, 0);
    const playedWidth = scene.card + 13;
    expect(scene.played[0].x).toBeGreaterThan(width / 2 + scene.handCard);
    expect(scene.played[0].x + playedWidth / 2).toBeLessThan(width);
    expect(scene.played[0].y - scene.played[3].y).toBeGreaterThan(playedWidth * 1.06);
  });

  it('keeps the viewer centered and their card off their avatar on a short stage', () => {
    const s = trucoScene(1000, 480, 4, 0);
    expect(s.seats[0].x).toBe(500);
    expect(s.seats[0].y).toBeLessThanOrEqual(480 - 42);
    const card = s.played[0];
    const apart = Math.abs(card.x - 500) > s.card || s.seats[0].y - card.y > s.card * 0.9 + 36;
    expect(apart).toBe(true);
  });

  it.each([
    [1214, 752],
    [1280, 620],
    [390, 630],
  ])('keeps the center panel above the far seat at %i × %i', (width, height) => {
    const s = trucoScene(width, height, 4, 0);
    expect(s.seats[2].y - s.door.y).toBeGreaterThanOrEqual(Math.min(110, s.seats[2].y - 90));
  });
});
