import { expect, test } from './fixtures.ts';
import { computedStyle, openLichess } from './support/lichess.ts';

// The game setup against the computer shows each level's estimated rating,
// the figures its player bar shows once the game starts.

test('each Stockfish level shows its estimated rating', async ({ page }) => {
  await openLichess(page, '/#ai');
  const fifth = page.locator(".game-setup label[for='sf_level_5']");
  await expect(fifth).toBeVisible();
  expect(await computedStyle(fifth, 'content', '::after')).toBe('"~1500"');
  const eighth = page.locator(".game-setup label[for='sf_level_8']");
  expect(await computedStyle(eighth, 'content', '::after')).toBe('"2800+"');
});
