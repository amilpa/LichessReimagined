// Lichess's own Stockfish build, the one its analysis board runs, and how
// deep the review searches.

export const STOCKFISH_BUILD = { root: 'npm/stockfish-web', script: 'sf_19_smallnet.js' };

export interface SearchLimits {
  readonly depth: number;
  readonly movetime: number;
}

/** What verdicts are made from. */
export const FULL_SEARCH: SearchLimits = { depth: 16, movetime: 1500 };

/** The graph's first draft: enough to show the game's trend within seconds. */
export const QUICK_SEARCH: SearchLimits = { depth: 12, movetime: 500 };

/** The game over's quick look, on the game page: counts in seconds, never cached. */
export const GAME_OVER_SEARCH: SearchLimits = { depth: 10, movetime: 250 };
