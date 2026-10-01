import type { EngineResult } from './uci.ts';
import type { EngineSearch } from './stockfish.ts';

// The page's engines, one search each at a time. A search waits for the first
// engine free; the moves played on the board and Explain's lines go before
// the game's own positions, as someone is waiting on them. An engine that
// stops answering leaves the pool, its search going back to the others.

export interface PoolEngine {
  readonly running: boolean;
  analyse(search: EngineSearch): Promise<EngineResult>;
  quit(): void;
}

interface Request {
  readonly search: EngineSearch;
  readonly resolve: (result: EngineResult) => void;
  readonly reject: (error: unknown) => void;
}

const noEngine = (): Error => new Error('No engine is running');

export class EnginePool {
  readonly #idle: PoolEngine[];
  readonly #waiting: Request[] = [];
  #size: number;
  #limit = Infinity;

  constructor(engines: readonly PoolEngine[]) {
    this.#idle = [...engines];
    this.#size = engines.length;
  }

  /** The engines still running: as many searches can run at once. */
  get size(): number {
    return this.#size;
  }

  /** Takes an engine booted after the others, unless the pool was cut down since. */
  add(engine: PoolEngine): void {
    if (this.#size >= this.#limit) {
      engine.quit();
      return;
    }
    this.#idle.push(engine);
    this.#size++;
    this.#dispatch();
  }

  /** Ends the engines past `count`, each once its search is done: they weigh on the page. */
  keep(count: number): void {
    this.#limit = Math.max(1, count);
    this.#trim();
  }

  /** Ends every engine, each once its search is done; the searches still waiting fail. */
  end(): void {
    this.#limit = 0;
    for (const request of this.#waiting.splice(0)) request.reject(noEngine());
    this.#trim();
  }

  analyse(search: EngineSearch, { urgent = false } = {}): Promise<EngineResult> {
    return new Promise((resolve, reject) => {
      if (this.#size === 0) {
        reject(noEngine());
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
        .then(request.resolve, (error: unknown) => {
          // A lost engine's search is done again by another, if any is left.
          if (engine.running) request.reject(error);
          else this.#waiting.unshift(request);
        })
        .finally(() => this.#release(engine));
    }
  }

  #release(engine: PoolEngine): void {
    if (engine.running) this.#idle.push(engine);
    else this.#size--;
    this.#trim();
    if (this.#size === 0) for (const request of this.#waiting.splice(0)) request.reject(noEngine());
    this.#dispatch();
  }

  #trim(): void {
    while (this.#size > this.#limit) {
      const engine = this.#idle.pop();
      if (!engine) return;
      engine.quit();
      this.#size--;
    }
  }
}
