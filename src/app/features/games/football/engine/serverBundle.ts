// What the API needs from the football engine to run online matches: it steps the same match as
// the two players from their relayed inputs, so it holds the true score, catches a copy that
// drifted and hands late watchers the match as it is. scripts/build-football-engine.mjs bundles
// this file into api/src/football/engine.gen.js; bundle.test.ts fails when that copy is stale.
export { createMatch, step } from './match';
export { NO_INPUT } from './types';
export { hashMatch, isPackedInput, unpackInput } from './net';
export { HALF_OPTIONS } from './data';
// The API takes only team ids it finds here.
export { TEAMS } from './teams';
