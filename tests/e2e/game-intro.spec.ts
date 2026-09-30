import { expect, test } from './fixtures.ts';
import { computedStyle, openLichess } from './support/lichess.ts';

// A game against the computer opens on the players' intro: another board drops
// over the opponent's half with both players' cards, then lifts.

test('a new game opens on the players’ intro', async ({ page }) => {
  await openLichess(page, '/#ai');
  await page.locator('.game-setup .lobby__start__button--ai').click();
  const intro = page.locator('main.round > .cdc-intro');
  await expect(intro).toBeAttached();
  await expect(intro.locator('.cdc-intro__card--top.cdc-intro__card--computer')).toBeAttached();
  await expect(intro.locator('.cdc-intro__card--bottom .cdc-intro__username')).not.toBeEmpty();
  const board = page.locator('main.round .round__app__board cg-board');
  expect(await computedStyle(board, 'background-image', '::after')).toMatch(
    /^url\("chrome-extension:\/\/.*\/img\/boards\/\w+\.webp"\)$/,
  );
  await expect(intro).not.toBeAttached();
  expect(await computedStyle(board, 'content', '::after')).toBe('none');
});
