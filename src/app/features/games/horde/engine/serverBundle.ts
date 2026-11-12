// What the API needs from the game's engine to check runs. scripts/build-horde-engine.mjs bundles
// this file into api/src/hordeEngine.gen.js; apiParity.test.ts fails when that copy is stale.
export { ENGINE_VERSION, META_UPGRADES, CHARACTER_IDS } from './data';
export { masteryLevel } from './achievements';
export { verifyReplay } from './replayCheck';
// For the API's tests: a bot run with a real replay.
export { recordedReport } from './recorded';
