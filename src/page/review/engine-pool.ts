import { clamp } from '#shared/math.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { EnginePool } from './engine/pool.ts';
import { Stockfish } from './engine/stockfish.ts';
import type { Session } from './session.ts';

/** More engines barely help: the game's analysis is then held up by the cloud and the page. */
const MAX_ENGINES = 3;
/** Gigabytes of memory per engine, so a small machine keeps room for the rest of the browser. */
const GIGABYTES_PER_ENGINE = 2;
/** Without the device's memory (Firefox doesn't tell), no more than this. */
const UNKNOWN_MEMORY_ENGINES = 2;

/** The device's memory in gigabytes, rounded down by the browser (at most 8), if it tells. */
function deviceMemory(): number | null {
  const memory: unknown = Reflect.get(navigator, 'deviceMemory');
  return typeof memory === 'number' && memory > 0 ? memory : null;
}

/** One engine per core but one, left to the page, as far as the memory allows. */
export function engineCount(): number {
  const memory = deviceMemory();
  const byMemory =
    memory === null ? UNKNOWN_MEMORY_ENGINES : Math.floor(memory / GIGABYTES_PER_ENGINE);
  const byCores = (navigator.hardwareConcurrency || 2) - 1;
  return clamp(Math.min(byCores, byMemory), 1, MAX_ENGINES);
}

async function bootEngine(analysis: Analysis): Promise<Stockfish> {
  const engine = new Stockfish({ chess960: analysis.chess960 });
  await engine.boot();
  return engine;
}

/** The engines past the first, booted one after another; one that fails ends it. */
async function bootMore(pool: EnginePool, analysis: Analysis): Promise<void> {
  for (let count = 1; count < engineCount(); count++) {
    try {
      pool.add(await bootEngine(analysis));
    } catch (error) {
      // The browser short of memory, say: the engines already up carry on.
      console.warn('[LichessDotCom] an extra engine failed to boot', error);
      return;
    }
  }
}

/**
 * The page's engines, booted once: the game's analysis and the moves played
 * off it share them. The pool comes with the first engine, and takes the
 * others as they boot, one at a time. If the first fails, the pool fails,
 * and stays failed.
 */
export function engineFor(session: Session, analysis: Analysis): Promise<EnginePool> {
  session.engine ??= (async () => {
    const pool = new EnginePool([await bootEngine(analysis)]);
    void bootMore(pool, analysis);
    return pool;
  })();
  return session.engine;
}
