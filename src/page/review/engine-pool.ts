import { clamp } from '#shared/math.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { EnginePool } from './engine/pool.ts';
import { Stockfish } from './engine/stockfish.ts';
import type { Session } from './session.ts';

/** More engines barely help: the game's analysis is then held up by the cloud and the page. */
const MAX_ENGINES = 3;

/** One engine per core but one, left to the page, up to MAX_ENGINES. */
export const engineCount = (): number =>
  clamp((navigator.hardwareConcurrency || 2) - 1, 1, MAX_ENGINES);

/**
 * The page's engines, booted once: the game's analysis and the moves played
 * off it share them. Engines that fail to boot are left out; if all do, the
 * pool fails, and stays failed.
 */
export function engineFor(session: Session, analysis: Analysis): Promise<EnginePool> {
  session.engine ??= (async () => {
    const booted = await Promise.allSettled(
      Array.from({ length: engineCount() }, async () => {
        const engine = new Stockfish({ chess960: analysis.chess960 });
        await engine.boot();
        return engine;
      }),
    );
    const engines = booted.flatMap(result => (result.status === 'fulfilled' ? [result.value] : []));
    const failed = booted.find(result => result.status === 'rejected');
    if (engines.length === 0 && failed) throw failed.reason;
    return new EnginePool(engines);
  })();
  return session.engine;
}
