import { afterEach, expect, it, vi } from 'vitest';
import { fenAfter } from '#page/review/fixtures/fake-lichess.ts';
import { installFakeStockfish } from '#page/review/fixtures/fake-stockfish.ts';
import { setUp } from '#page/review/fixtures/review-script.ts';
import { review } from '#page/review/index.ts';

// A started review can't be stopped: this file has its window to itself.

afterEach(() => {
  vi.useRealTimers();
});

it('analyzes a game with several engines at once, each position once', async () => {
  const { ctrl, advance } = setUp({ game: 'passant', lang: 'en', cached: false, steps: [] });
  vi.spyOn(navigator, 'hardwareConcurrency', 'get').mockReturnValue(8);
  const deep: string[] = [];
  installFakeStockfish(
    (depth, fen) => {
      if (depth >= 16) deep.push(fen);
      return depth >= 16 ? 150 : 30;
    },
    (fen, moves) => fenAfter(ctrl.tree.root, fen, moves),
  );
  review.start();
  // One engine takes 30 ms and 150 ms per position: 4.5 s for this game's 25.
  await advance(2500);
  const positions = ctrl.mainline.length;
  expect(localStorage.getItem(`cdc-review:passanta:${positions}:v1`)).not.toBeNull();
  expect(new Set(deep).size).toBe(deep.length);
});
