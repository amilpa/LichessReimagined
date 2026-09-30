import { afterEach, expect, it, vi } from 'vitest';
import { fenAfter } from '#page/review/fixtures/fake-lichess.ts';
import { installFakeStockfish } from '#page/review/fixtures/fake-stockfish.ts';
import { setUp } from '#page/review/fixtures/review-script.ts';
import { review } from '#page/review/index.ts';

// A started review can't be stopped: this file has its window to itself.

afterEach(() => {
  vi.useRealTimers();
});

function setHidden(hidden: boolean): void {
  Object.defineProperty(document, 'hidden', { value: hidden, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

it('waits while the tab is hidden, and carries on once it shows', async () => {
  const { ctrl, advance } = setUp({ game: 'passant', lang: 'en', cached: false, steps: [] });
  let searches = 0;
  installFakeStockfish(
    () => {
      searches++;
      return 30;
    },
    (fen, moves) => fenAfter(ctrl.tree.root, fen, moves),
  );
  setHidden(true);
  review.start();
  await advance(5000);
  expect(searches).toBe(0);
  setHidden(false);
  await advance(5000);
  expect(searches).toBeGreaterThan(0);
});
