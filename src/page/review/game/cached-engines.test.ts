import { afterEach, expect, it, vi } from 'vitest';
import { setUp, useFakeEngine } from '#page/review/fixtures/review-script.ts';
import { review } from '#page/review/index.ts';

// A started review can't be stopped: this file has its window to itself.

afterEach(() => {
  vi.useRealTimers();
});

it('boots one engine only for a move played on a review taken from the cache', async () => {
  const { ctrl, advance } = setUp({ game: 'passant', lang: 'en', cached: true, steps: [] });
  vi.spyOn(navigator, 'hardwareConcurrency', 'get').mockReturnValue(8);
  const booted = useFakeEngine(ctrl);
  review.start();
  await advance(500);
  expect(booted()).toBe(0);
  ctrl.playUci('a2a3');
  ctrl.redraw();
  await advance(5000);
  expect(booted()).toBe(1);
});
