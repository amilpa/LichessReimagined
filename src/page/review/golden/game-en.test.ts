import { afterEach, expect, it, vi } from 'vitest';
import { GAME_EN } from '#page/review/fixtures/review-scenarios.ts';
import { portSnapshots } from './port-snapshots.ts';
// What the original script showed after each step of the same script.
import legacy from './fixtures/legacy-game-en.json' with { type: 'json' };

afterEach(() => {
  vi.useRealTimers();
});

it('shows what the original showed, step by step', async () => {
  expect(await portSnapshots(GAME_EN, legacy)).toEqual(legacy);
}, 30_000);
