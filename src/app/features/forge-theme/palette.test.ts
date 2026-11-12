import chroma from 'chroma-js';
import { describe, expect, it } from 'vitest';
import { forgeDark, forgeLight } from './palette';

const containers = ['Background', 'Surface', 'SurfaceVariant'] as const;
const roles = ['Primary', 'Secondary', 'Success', 'Warning', 'Critical'] as const;

describe.each([
  ['dark', forgeDark],
  ['light', forgeLight],
])('forge %s palette', (_name, p) => {
  it('pins the spec surfaces', () => {
    const expected =
      p === forgeDark
        ? ['#0C0D0F', '#141619', '#1D2024', '#66241E', '#FFFFFF']
        : ['#F7F8F9', '#F7F8F9', '#FFFFFF', '#66241E', '#FFFFFF'];
    expect([
      p.Background.Container,
      p.Surface.Container,
      p.SurfaceVariant.Container,
      p.Primary.Main,
      p.Primary.OnMain,
    ]).toEqual(expected);
  });
  it('keeps text readable on every surface', () => {
    containers.forEach((c) =>
      expect(chroma.contrast(p[c].OnContainer, p[c].Container)).toBeGreaterThanOrEqual(4.5)
    );
    roles.forEach((r) => {
      expect(chroma.contrast(p[r].OnMain, p[r].Main)).toBeGreaterThanOrEqual(4.5);
      expect(chroma.contrast(p[r].OnContainer, p[r].Container)).toBeGreaterThanOrEqual(4.5);
    });
  });
  it('makes hover and active steps visible', () => {
    containers.forEach((c) => {
      expect(chroma.deltaE(p[c].Container, p[c].ContainerHover)).toBeGreaterThan(2);
      expect(chroma.deltaE(p[c].ContainerHover, p[c].ContainerActive)).toBeGreaterThan(2);
    });
  });
});
