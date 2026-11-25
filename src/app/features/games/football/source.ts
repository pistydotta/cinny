import { step } from './engine/match';
import { GameEvent, Input, MatchState, Side } from './engine/types';
import { Netplay } from './online/netplay';
import { SpectatorFeed } from './online/spectate';

// Where the runner's match comes from, one tick at a time. `advance` returns the tick's
// events, or null when the match has to wait (online, for the other player's inputs).
export type MatchSource = {
  readonly match: MatchState;
  advance(inputs: [Input, Input]): GameEvent[] | null;
  ended(): boolean;
};

// Against the CPU or two people on one computer: the engine, stepped here.
export const localSource = (match: MatchState): MatchSource => ({
  match,
  advance(inputs) {
    step(match, inputs);
    return match.events;
  },
  ended: () => match.phase === 'over',
});

// Online, as a player: our side's keys go to the netplay session, the other side is its guess
// or the real input. Running ahead of the other player (once their lag is counted) skips a
// tick now and then so neither side keeps rolling back.
export const netSource = (
  net: Netplay,
  side: Side,
  lagTicks: () => number
): MatchSource & { net: Netplay; finish: () => void } => {
  let count = 0;
  let over = false;
  return {
    net,
    // The API says when a match is over: guessed ticks could end it early, and once it's
    // over the other player sends nothing more to wait for.
    finish: () => {
      over = true;
    },
    get match() {
      return net.match;
    },
    advance(inputs) {
      count += 1;
      if (net.advantage(lagTicks()) > 1.5 && count % 6 === 0) {
        net.settle();
        return [];
      }
      return net.advance(inputs[side]);
    },
    ended: () => over,
  };
};

// Watching: the confirmed inputs the API sends, a little behind.
export const watchSource = (feed: SpectatorFeed): MatchSource => ({
  get match() {
    return feed.match;
  },
  advance: () => feed.advance(),
  ended: () => feed.match.phase === 'over',
});
