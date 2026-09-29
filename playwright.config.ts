import { defineConfig } from '@playwright/test';

// The end-to-end tests load the built extension (dist/chrome) into
// Playwright's Chromium and drive live lichess.org pages. Each test launches
// its own browser (tests/e2e/fixtures.ts), so any can run beside any other:
// a few at a time, as each is a whole browser and lichess.org sees them all
// come from one address. Tests tagged @slow run the engine
// (`pnpm test:e2e:fast` skips them).

const CI = process.env['CI'] !== undefined;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: true,
  workers: CI ? 2 : 3,
  retries: CI ? 2 : 0,
  forbidOnly: CI,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
