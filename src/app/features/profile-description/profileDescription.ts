// A custom field on the Matrix profile, so it needs no table of ours.
export const DESCRIPTION_FIELD = 'br.com.blazeroom.description';
export const MAX_DESCRIPTION_LENGTH = 160;

// Only this app limits the length, and anyone can write the field another way.
export const cleanDescription = (value: unknown): string =>
  typeof value === 'string'
    ? Array.from(value.trim()).slice(0, MAX_DESCRIPTION_LENGTH).join('').trim()
    : '';
