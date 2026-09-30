import { describe, expect, it } from 'vitest';
import { EnginePool, type PoolEngine } from './pool.ts';
import type { EngineResult } from './uci.ts';
import type { EngineSearch } from './stockfish.ts';

const RESULT: EngineResult = { lines: [] };

/** An engine whose searches end when the test says so. */
class HeldEngine implements PoolEngine {
  running = true;
  readonly started: string[] = [];
  readonly #ends: ((failed: boolean) => void)[] = [];

  analyse({ position }: EngineSearch): Promise<EngineResult> {
    this.started.push(position);
    return new Promise((resolve, reject) => {
      this.#ends.push(failed => (failed ? reject(new Error('gone')) : resolve(RESULT)));
    });
  }

  end(failed = false): void {
    this.#ends.shift()?.(failed);
  }
}

const settle = (): Promise<void> => new Promise(resolve => setTimeout(resolve));

describe('EnginePool', () => {
  it('runs a search per engine at once, the others waiting their turn', async () => {
    const [first, second] = [new HeldEngine(), new HeldEngine()];
    const pool = new EnginePool([first, second]);
    const searches = ['one', 'two', 'three'].map(position => pool.analyse({ position }));
    expect([...first.started, ...second.started].toSorted()).toEqual(['one', 'two']);
    second.end();
    await settle();
    expect(second.started).toEqual(['one', 'three']);
    first.end();
    second.end();
    await expect(Promise.all(searches)).resolves.toHaveLength(3);
  });

  it('puts an urgent search before the waiting ones', async () => {
    const engine = new HeldEngine();
    const pool = new EnginePool([engine]);
    void pool.analyse({ position: 'running' });
    void pool.analyse({ position: 'game' });
    void pool.analyse({ position: 'played' }, { urgent: true });
    engine.end();
    await settle();
    expect(engine.started).toEqual(['running', 'played']);
  });

  it('drops an engine that stopped answering, and fails the rest once none is left', async () => {
    const engine = new HeldEngine();
    const pool = new EnginePool([engine]);
    const first = pool.analyse({ position: 'one' });
    const second = pool.analyse({ position: 'two' });
    engine.running = false;
    engine.end(true);
    await expect(first).rejects.toThrow('gone');
    await expect(second).rejects.toThrow('No engine is running');
    expect(pool.size).toBe(0);
    await expect(pool.analyse({ position: 'three' })).rejects.toThrow('No engine is running');
  });
});
