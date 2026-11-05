import { expect, it } from 'vitest';
import { isSpaceOwner } from './spaceOwner';

it('offers deletion only to the space creator or v12 additional creators', () => {
  const content = { type: 'm.space', room_version: '12', additional_creators: ['@co:test'] };
  expect(isSpaceOwner({ sender: '@owner:test', content }, '@owner:test')).toBe(true);
  expect(isSpaceOwner({ sender: '@owner:test', content }, '@co:test')).toBe(true);
  expect(isSpaceOwner({ sender: '@owner:test', content }, '@admin:test')).toBe(false);
  expect(isSpaceOwner({ content: { type: 'm.space', creator: '@old:test' } }, '@old:test')).toBe(
    true
  );
  expect(isSpaceOwner({ content: { ...content, room_version: '11' } }, '@co:test')).toBe(false);
  expect(isSpaceOwner(undefined, '@owner:test')).toBe(false);
});
