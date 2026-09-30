import { z } from 'zod/mini';
import { createGuard } from '#shared/guards.ts';
import { clamp } from '#shared/math.ts';
import { FULL_SEARCH, type SearchLimits, STOCKFISH_BUILD } from './settings.ts';
import { assetUrl } from '#page/lichess/assets.ts';
import { type EngineResult, SearchCollector } from './uci.ts';

// Lichess's Stockfish build (stockfish-web), loaded from its own assets in the
// page world. One search runs at a time: the others queue behind it.

const FactorySchema = z.object({
  default: z.function({ input: [z.unknown()], output: z.unknown() }),
});

const StockfishModuleSchema = z.object({
  uci: z.function({ input: [z.string()], output: z.unknown() }),
  getRecommendedNnue: z.function({ input: [z.number()], output: z.unknown() }),
  setNnueBuffer: z.function({ input: [z.instanceof(Uint8Array), z.number()], output: z.unknown() }),
});

type StockfishModule = z.infer<typeof StockfishModuleSchema>;

const isFactory = createGuard(FactorySchema);
const isStockfishModule = createGuard(StockfishModuleSchema);

const INITIAL_PAGES = 1536;

// How long past its `movetime` a search may run before it's stopped, and then
// how long the engine has to answer the stop.
const STOP_GRACE_MS = 3000;
const GIVE_UP_MS = 3000;

// Some browsers refuse a large shared memory: ask for less until they agree.
function sharedMemory(): WebAssembly.Memory {
  for (let maximum = 32767; ; maximum = Math.ceil(maximum * 0.75)) {
    try {
      return new WebAssembly.Memory({ shared: true, initial: INITIAL_PAGES, maximum });
    } catch (error) {
      if (maximum <= INITIAL_PAGES || !(error instanceof RangeError)) throw error;
    }
  }
}

async function loadNetworks(module: StockfishModule): Promise<void> {
  for (let i = 0; ; i++) {
    const name = module.getRecommendedNnue(i);
    if (typeof name !== 'string' || name === '') return;
    const response = await fetch(assetUrl(`lifat/nnue/${name}`));
    module.setNnueBuffer(new Uint8Array(await response.arrayBuffer()), i);
  }
}

async function loadModule(): Promise<StockfishModule> {
  const { root, script } = STOCKFISH_BUILD;
  const url = assetUrl(`${root}/${script}`, { documentOrigin: true });
  const wasmMemory = sharedMemory();
  const imported: unknown = await import(url);
  if (!isFactory(imported)) throw new Error('Stockfish did not load');
  const module: unknown = await imported.default({
    wasmMemory,
    locateFile: (file: string) => assetUrl(`${root}/${file}`),
    mainScriptUrlOrBlob: url,
  });
  if (!isStockfishModule(module)) throw new Error('Stockfish has an unexpected shape');
  return module;
}

export interface EngineSearch {
  /** What follows `position`: `fen …`, and the moves leading to it (`uciPosition`). */
  readonly position: string;
  readonly limits?: SearchLimits;
  /** Only the lines that start with these moves. */
  readonly searchMoves?: readonly string[];
}

export interface StockfishOptions {
  readonly chess960: boolean;
}

export class Stockfish {
  readonly #chess960: boolean;
  #module: StockfishModule | null = null;
  #onLine: ((text: string) => void) | null = null;
  #queue: Promise<unknown> = Promise.resolve();

  constructor(options: StockfishOptions) {
    this.#chess960 = options.chess960;
  }

  async boot(): Promise<void> {
    const module = await loadModule();
    await loadNetworks(module);
    Object.assign(module, { listen: (text: string) => this.#onLine?.(text) });
    this.#module = module;
    const threads = clamp((navigator.hardwareConcurrency || 2) - 1, 1, 4);
    module.uci('uci');
    module.uci(`setoption name Threads value ${threads}`);
    module.uci('setoption name Hash value 64');
    module.uci('setoption name MultiPV value 2');
    if (this.#chess960) module.uci('setoption name UCI_Chess960 value true');
    module.uci('ucinewgame');
  }

  /** The engine's two best lines for a position, from the side to move's view. */
  analyse(search: EngineSearch): Promise<EngineResult> {
    const result = this.#queue.then(() => this.#run(search));
    // A failed search doesn't hold up the ones queued behind it.
    this.#queue = result.catch(() => undefined);
    return result;
  }

  #run({ position, limits = FULL_SEARCH, searchMoves = [] }: EngineSearch): Promise<EngineResult> {
    return new Promise((resolve, reject) => {
      const module = this.#module;
      if (!module) throw new Error('Stockfish is not running');
      const collector = new SearchCollector();
      let giveUp = 0;
      // A search outliving its time is told to stop; one that won't means the engine is gone.
      const stop = setTimeout(() => {
        module.uci('stop');
        giveUp = setTimeout(() => {
          this.#onLine = null;
          this.#module = null;
          reject(new Error('Stockfish stopped answering'));
        }, GIVE_UP_MS);
      }, limits.movetime + STOP_GRACE_MS);
      this.#onLine = text => {
        const result = collector.read(text);
        if (!result) return;
        clearTimeout(stop);
        clearTimeout(giveUp);
        this.#onLine = null;
        resolve(result);
      };
      module.uci(`position ${position}`);
      // `searchmoves` takes the rest of the command: it goes last.
      const only = searchMoves.length > 0 ? ` searchmoves ${searchMoves.join(' ')}` : '';
      module.uci(`go depth ${limits.depth} movetime ${limits.movetime}${only}`);
    });
  }
}
