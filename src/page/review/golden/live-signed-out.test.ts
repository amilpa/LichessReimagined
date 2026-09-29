import { afterEach, expect, it, vi } from 'vitest';
import { LIVE_SIGNED_OUT } from '#page/review/fixtures/review-scenarios.ts';
import { portSnapshots } from './port-snapshots.ts';
// What the original script showed after each step of the same script.
import legacy from './fixtures/legacy-live-signed-out.json' with { type: 'json' };

afterEach(() => {
  vi.useRealTimers();
});

it('shows what the original showed, step by step', async () => {
  expect(await portSnapshots(LIVE_SIGNED_OUT, legacy)).toEqual(legacy);
}, 30_000);
