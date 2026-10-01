// Lichess's own Stockfish build, the one its analysis board runs, and how
// deep the review searches.

export const STOCKFISH_BUILD = { root: 'npm/stockfish-web', script: 'sf_19_smallnet.js' };

/**
 * The build's script for this browser. Where relaxed SIMD runs, Lichess ships
 * the same engine built with it: same lines, about a quarter faster.
 */
export const stockfishScript = (relaxedSimd: boolean): string =>
  relaxedSimd
    ? STOCKFISH_BUILD.script.replace(/\.js$/, '_relaxed-simd.js')
    : STOCKFISH_BUILD.script;

export interface SearchLimits {
  readonly depth: number;
  readonly movetime: number;
}

// `movetime` only caps a search gone long: on one thread, the depth usually
// comes in well under half a second. Capped sooner, a third of the positions
// fell short of it.

/** What verdicts are made from. */
export const FULL_SEARCH: SearchLimits = { depth: 16, movetime: 5000 };

/** The graph's first draft: enough to show the game's trend within seconds. */
export const QUICK_SEARCH: SearchLimits = { depth: 12, movetime: 1000 };

/** The game over's quick look, on the game page: counts in seconds, never cached. */
export const GAME_OVER_SEARCH: SearchLimits = { depth: 10, movetime: 250 };
