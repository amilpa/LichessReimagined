import { afterEach, describe, expect, it, vi } from 'vitest';
import { engineCount } from './engine-pool.ts';

function device(cores: number, memory: number | undefined): void {
  vi.spyOn(navigator, 'hardwareConcurrency', 'get').mockReturnValue(cores);
  Object.defineProperty(navigator, 'deviceMemory', { value: memory, configurable: true });
}

describe('engineCount', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(navigator, 'deviceMemory');
  });

  it('runs an engine per core but one, up to three', () => {
    device(2, 8);
    expect(engineCount()).toBe(1);
    device(16, 8);
    expect(engineCount()).toBe(3);
  });

  it('runs fewer on a device short of memory', () => {
    device(16, 4);
    expect(engineCount()).toBe(2);
    device(16, 2);
    expect(engineCount()).toBe(1);
    device(16, 0.5);
    expect(engineCount()).toBe(1);
  });

  it('runs two at most when the browser doesn’t tell the memory', () => {
    device(16, undefined);
    expect(engineCount()).toBe(2);
  });
});
