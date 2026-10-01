import { afterEach, expect, it, vi } from 'vitest';
import { setUp, useFakeEngine } from './fixtures/review-script.ts';
import { startEngines } from './engine-pool.ts';

afterEach(() => {
  vi.useRealTimers();
});

it('boots no more engines once the pool is ended', async () => {
  const { ctrl, advance } = setUp({ game: 'passant', lang: 'en', cached: false, steps: [] });
  const booted = useFakeEngine(ctrl);
  const pool = await startEngines({ chess960: false, count: 3 });
  pool.end();
  await advance(1000);
  // The second was already booting: it's ended as it comes in.
  expect(booted()).toBe(2);
  expect(pool.size).toBe(0);
});
