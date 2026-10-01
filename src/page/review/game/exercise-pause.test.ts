import { afterEach, expect, it, vi } from 'vitest';
import { setUp, useFakeEngine } from '#page/review/fixtures/review-script.ts';
import { review } from '#page/review/index.ts';

// A started review can't be stopped: this file has its window to itself.

afterEach(() => {
  vi.useRealTimers();
});

it('waits while "Learn from your mistakes" runs, and carries on once it ends', async () => {
  const { ctrl, advance } = setUp({ game: 'passant', lang: 'en', cached: false, steps: [] });
  let searches = 0;
  useFakeEngine(ctrl, () => {
    searches++;
    return 30;
  });
  ctrl.retro = {};
  review.start();
  await advance(5000);
  expect(searches).toBe(0);
  ctrl.retro = undefined;
  await advance(5000);
  expect(searches).toBeGreaterThan(0);
});
