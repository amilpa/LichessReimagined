import { describe, expect, it } from 'vitest';
import { EnginePool, type PoolEngine } from './pool.ts';
import type { EngineResult } from './uci.ts';
import type { EngineSearch } from './stockfish.ts';

const RESULT: EngineResult = { lines: [] };

/** An engine whose searches end when the test says so. */
class HeldEngine implements PoolEngine {
  running = true;
  quits = 0;
  readonly started: string[] = [];
  readonly #ends: ((failed: boolean) => void)[] = [];

  analyse({ position }: EngineSearch): Promise<EngineResult> {
    this.started.push(position);
    return new Promise((resolve, reject) => {
      this.#ends.push(failed => (failed ? reject(new Error('gone')) : resolve(RESULT)));
    });
  }

  quit(): void {
    this.running = false;
    this.quits++;
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

  it('gives a lost engine’s search to another', async () => {
    const [lost, other] = [new HeldEngine(), new HeldEngine()];
    const pool = new EnginePool([other, lost]);
    const search = pool.analyse({ position: 'one' });
    lost.running = false;
    lost.end(true);
    await settle();
    expect(other.started).toEqual(['one']);
    expect(pool.size).toBe(1);
    other.end();
    await expect(search).resolves.toEqual(RESULT);
  });

  it('fails the searches once no engine is left', async () => {
    const engine = new HeldEngine();
    const pool = new EnginePool([engine]);
    const first = pool.analyse({ position: 'one' });
    const second = pool.analyse({ position: 'two' });
    engine.running = false;
    engine.end(true);
    await expect(first).rejects.toThrow('No engine is running');
    await expect(second).rejects.toThrow('No engine is running');
    expect(pool.size).toBe(0);
    await expect(pool.analyse({ position: 'three' })).rejects.toThrow('No engine is running');
  });

  it('ends the idle engines past those kept at once, and refuses later ones', () => {
    const [busy, idle, spare] = [new HeldEngine(), new HeldEngine(), new HeldEngine()];
    const pool = new EnginePool([spare, idle, busy]);
    void pool.analyse({ position: 'one' });
    pool.keep(1);
    expect([busy.quits, idle.quits, spare.quits]).toEqual([0, 1, 1]);
    expect(pool.size).toBe(1);
    const late = new HeldEngine();
    pool.add(late);
    expect(late.quits).toBe(1);
    expect(pool.size).toBe(1);
  });

  it('ends a busy engine past those kept once its search is done', async () => {
    const [first, second] = [new HeldEngine(), new HeldEngine()];
    const pool = new EnginePool([first, second]);
    void pool.analyse({ position: 'one' });
    void pool.analyse({ position: 'two' });
    pool.keep(1);
    expect(first.quits + second.quits).toBe(0);
    second.end();
    await settle();
    expect(second.quits).toBe(1);
    expect(pool.size).toBe(1);
  });

  it('ends every engine, a busy one once its search is done, and fails the waiting searches', async () => {
    const [first, second] = [new HeldEngine(), new HeldEngine()];
    const pool = new EnginePool([first, second]);
    const running = ['one', 'two'].map(position => pool.analyse({ position }));
    const waiting = pool.analyse({ position: 'three' });
    pool.end();
    await expect(waiting).rejects.toThrow('No engine is running');
    expect(first.quits + second.quits).toBe(0);
    first.end();
    second.end();
    await expect(Promise.all(running)).resolves.toHaveLength(2);
    expect([first.quits, second.quits]).toEqual([1, 1]);
    expect(pool.size).toBe(0);
    const late = new HeldEngine();
    pool.add(late);
    expect(late.quits).toBe(1);
  });

  it('ends an idle engine at once', () => {
    const idle = new HeldEngine();
    const pool = new EnginePool([idle]);
    pool.end();
    expect(idle.quits).toBe(1);
    expect(pool.size).toBe(0);
  });

  it('takes an engine booted later, which picks up the waiting searches', async () => {
    const [first, later] = [new HeldEngine(), new HeldEngine()];
    const pool = new EnginePool([first]);
    void pool.analyse({ position: 'one' });
    void pool.analyse({ position: 'two' });
    pool.add(later);
    await settle();
    expect(later.started).toEqual(['two']);
    expect(pool.size).toBe(2);
  });
});
