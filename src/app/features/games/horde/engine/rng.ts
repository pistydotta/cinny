// The same seeded rng as the idle game: every roll of a run goes through one, so a seed plus the
// inputs of each tick always give the same run. That is what lets a server replay a run to check
// a ranking score, or run the same simulation for co-op.
export { createRng, hashSeed, rollRange, chance, pick } from '../../idle/engine/rng';
export type { Rng } from '../../idle/engine/rng';
