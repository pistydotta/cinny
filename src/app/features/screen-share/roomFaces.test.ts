import { describe, expect, it } from 'vitest';
import { keepFaceOrder } from './roomFaces';

const none = new Set<string>();

describe('keepFaceOrder', () => {
  it('starts in the call order', () => {
    expect(keepFaceOrder([], ['@a:x', '@b:x', '@c:x'], none, 5)).toEqual(['@a:x', '@b:x', '@c:x']);
  });

  it('does not move people already shown when they talk', () => {
    const previous = ['@a:x', '@b:x', '@c:x'];
    expect(keepFaceOrder(previous, previous, new Set(['@c:x']), 5)).toEqual(previous);
    expect(keepFaceOrder(previous, previous, new Set(['@b:x', '@c:x']), 5)).toEqual(previous);
  });

  it('brings a hidden speaker to the front', () => {
    // Six people and five slots: four faces and "+2", so @e and @f are hidden.
    const previous = ['@a:x', '@b:x', '@c:x', '@d:x', '@e:x', '@f:x'];
    expect(keepFaceOrder(previous, previous, new Set(['@f:x']), 5)).toEqual([
      '@f:x',
      '@a:x',
      '@b:x',
      '@c:x',
      '@d:x',
      '@e:x',
    ]);
  });

  it('drops people who left and adds newcomers at the end', () => {
    expect(keepFaceOrder(['@b:x', '@a:x', '@c:x'], ['@a:x', '@c:x', '@d:x'], none, 5)).toEqual([
      '@a:x',
      '@c:x',
      '@d:x',
    ]);
  });
});
