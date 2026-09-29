import type { Analysis } from '#page/lichess/analysis.ts';
import { Stockfish } from './engine/stockfish.ts';
import type { Session } from './session.ts';

/**
 * One engine for the page, booted once: the game's analysis and the moves
 * played off it share it, one position at a time. A failed boot stays failed.
 */
export function engineFor(session: Session, analysis: Analysis): Promise<Stockfish> {
  session.engine ??= (async () => {
    const engine = new Stockfish({ chess960: analysis.chess960 });
    await engine.boot();
    return engine;
  })();
  return session.engine;
}
