import type { EngineResult } from './uci.ts';
import type { EngineSearch } from './stockfish.ts';

// The page's engines, one search each at a time. A search waits for the first
// engine free; the moves played on the board and Explain's lines go before
// the game's own positions, as someone is waiting on them.

export interface PoolEngine {
  readonly running: boolean;
  analyse(search: EngineSearch): Promise<EngineResult>;
}

interface Request {
  readonly search: EngineSearch;
  readonly resolve: (result: EngineResult) => void;
  readonly reject: (error: unknown) => void;
}

export class EnginePool {
  readonly #idle: PoolEngine[];
  readonly #waiting: Request[] = [];
  #size: number;

  constructor(engines: readonly PoolEngine[]) {
    this.#idle = [...engines];
    this.#size = engines.length;
  }

  /** The engines still running: as many searches can run at once. */
  get size(): number {
    return this.#size;
  }

  analyse(search: EngineSearch, { urgent = false } = {}): Promise<EngineResult> {
    return new Promise((resolve, reject) => {
      if (this.#size === 0) {
        reject(new Error('No engine is running'));
        return;
      }
      if (urgent) this.#waiting.unshift({ search, resolve, reject });
      else this.#waiting.push({ search, resolve, reject });
      this.#dispatch();
    });
  }

  #dispatch(): void {
    for (;;) {
      const engine = this.#idle.pop();
      const request = engine && this.#waiting.shift();
      if (!engine || !request) {
        if (engine) this.#idle.push(engine);
        return;
      }
      void engine
        .analyse(request.search)
        .then(request.resolve, request.reject)
        .finally(() => this.#release(engine));
    }
  }

  // An engine that stopped answering leaves the pool; with none left, the waiting searches fail.
  #release(engine: PoolEngine): void {
    if (engine.running) this.#idle.push(engine);
    else this.#size--;
    if (this.#size === 0)
      for (const request of this.#waiting.splice(0))
        request.reject(new Error('No engine is running'));
    this.#dispatch();
  }
}
