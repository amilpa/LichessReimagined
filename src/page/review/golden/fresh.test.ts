import { afterEach, expect, it, vi } from 'vitest';
import { FRESH } from '#page/review/fixtures/review-scenarios.ts';
import { portSnapshots } from './port-snapshots.ts';
// What the original script showed after each step of the same script.
import legacy from './fixtures/legacy-fresh.json' with { type: 'json' };

afterEach(() => {
  vi.useRealTimers();
});

it('shows what the original showed, step by step', async () => {
  expect(await portSnapshots(FRESH, legacy)).toEqual(legacy);
}, 30_000);
