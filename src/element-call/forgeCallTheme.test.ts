import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { forgeDark } from '../app/features/forge-theme/palette';
import { callAvatarHues, darkThemeClass, forgeCall, forgeCallCss } from './forgeCallTheme';

describe("Element Call's Forge colours", () => {
  it('match the palette', () => {
    expect(forgeCall).toEqual({
      stage: forgeDark.Surface.Container,
      tile: forgeDark.SurfaceVariant.Container,
    });
  });

  it("use Cinny's user colours for avatars", () => {
    const css = readFileSync(join(__dirname, '../index.css'), 'utf8');
    callAvatarHues.forEach((hue, i) => expect(css).toContain(`--mx-uc-${i + 1}: ${hue};`));
  });

  it('still names the variables Element Call reads (a new Element Call may rename them)', () => {
    const dir = join(__dirname, '../../node_modules/@element-hq/element-call-embedded/dist/assets');
    const name = readdirSync(dir).find((f) => /^index-.*\.css$/.test(f));
    const bundle = readFileSync(join(dir, name ?? ''), 'utf8');
    expect(bundle).toContain('--video-tile-background:var(--cpd-color-bg-subtle-secondary)');
    expect(bundle).toContain('--cpd-color-bg-canvas-default:var(--cpd-color-theme-bg)');
    expect(bundle).toContain('--cpd-avatar-bg:var(--cpd-color-bg-decorative-6)');
  });

  it('sets the variables Element Call reads', () => {
    const css = forgeCallCss();
    ['--cpd-color-theme-bg', '--video-tile-background', '--cpd-color-bg-decorative-6'].forEach(
      (name) => expect(css).toContain(name)
    );
  });

  it("keeps Element Call's theme dark", () => {
    expect(darkThemeClass('cpd-theme-light')).toBe('cpd-theme-dark');
    expect(darkThemeClass('cpd-theme-light-hc')).toBe('cpd-theme-dark-hc');
    expect(darkThemeClass('cpd-theme-dark')).toBe('cpd-theme-dark');
    expect(darkThemeClass('no-scroll-body')).toBe('no-scroll-body');
  });
});
