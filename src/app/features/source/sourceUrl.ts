const ref = import.meta.env.VITE_BLAZEROOM_SOURCE_REF;

// Deployed builds use immutable source tags; local development uses the mirror branch.
export const sourceUrl = `https://github.com/pistydotta/cinny/tree/${
  typeof ref === 'string' && /^web-[0-9a-f]{40}$/.test(ref) ? ref : 'source'
}`;
