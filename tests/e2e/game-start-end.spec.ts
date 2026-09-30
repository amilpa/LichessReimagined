import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { readFleeting } from './support/fleeting.ts';
import { playMoves, startFriendGame } from './support/friend-game.ts';
import { computedStyle } from './support/lichess.ts';

// One game, start to end, between two visitors in their own browsers: the
// players' intro as it opens, then the scholar's mate, whose Na6 and b6 leave
// theory, so the coach has errors to count. One live game serves both, and no
// engine plays either side.

const SCHOLARS_MATE = ['e2e4', 'e7e5', 'd1h5', 'b8a6', 'f1c4', 'b7b6', 'h5f7'];

async function expectIntro(page: Page): Promise<void> {
  await expect
    .poll(async () => (await readFleeting(page)).intro, 'the intro played')
    .not.toBeNull();
  const { intro } = await readFleeting(page);
  if (!intro) return;
  expect(intro.usernames).toHaveLength(2);
  for (const name of intro.usernames) expect(name).not.toBe('');
  expect(new Set(intro.widths).size, 'both cards the same width').toBe(1);
  expect(intro.board).toMatch(/^url\("chrome-extension:\/\/.*\/img\/boards\/\w+\.webp"\)$/);
  expect(intro.swords).toMatch(
    /^url\("https:\/\/lichess1\.org\/assets\/flair\/img\/objects\.crossed-swords\.webp"\)$/,
  );
  // Clipped by the board itself, which stays in step with the drop.
  expect(intro.overflow).toBe('hidden');
  const board = page.locator('main.round .round__app__board cg-board');
  await expect(page.locator('main.round > .cdc-intro')).not.toBeAttached();
  expect(await computedStyle(board, 'content', '::after')).toBe('none');
  expect(await computedStyle(board, 'overflow')).toBe('visible');
}

async function expectGameOver(winner: Page, loser: Page): Promise<void> {
  const won = winner.locator('main.round > .cdc-end .cdc-end__card');
  await expect(won.locator('.cdc-end__title')).toHaveText('You beat Anonymous!');
  await expect(won.locator('.cdc-end__reason')).toHaveText('by checkmate');
  await expect(winner.locator('.cdc-end__king--win .cdc-end__king-label')).toHaveText('Winner');
  await expect(winner.locator('.cdc-end__king--loss .cdc-end__king-label')).toHaveText('Checkmate');
  // Lichess's own badges give way to ours.
  expect(await computedStyle(winner.locator('main.round .cg-custom-svgs'), 'display')).toBe('none');
  expect((await readFleeting(winner)).confetti, 'confetti for the winner').toBe(true);
  // The badges shrink to pips as the card comes in.
  await expect(winner.locator('main.round > .cdc-end')).toHaveClass(/\bcdc-end--settled\b/);

  const lost = loser.locator('main.round > .cdc-end .cdc-end__card');
  await expect(lost.locator('.cdc-end__title')).toHaveText('You lost');
  expect((await readFleeting(loser)).confetti, 'no confetti for the loser').toBe(false);

  // The coach's quick look, from Lichess's engine on the game page: b6 let the mate in.
  for (const card of [won, lost])
    await expect(card.locator('.cdc-end__bubble')).toHaveText(/accuracy/, { timeout: 60_000 });
  const blunders = lost.locator('.cdc-end__count', { hasText: /blunder/ }).locator('b');
  await expect.poll(async () => Number(await blunders.textContent())).toBeGreaterThanOrEqual(1);
  await expect(lost.locator('.cdc-end__review')).toHaveAttribute('href', /^\/\w{8}\/black/);
  await expect(lost.locator('.cdc-end__btn[data-cdc-end="rematch"]')).toBeVisible();

  await lost.locator('.cdc-end__close').click();
  await expect(lost).toHaveCount(0);
  await expect(loser.locator('.cdc-end__king')).toHaveCount(2);
}

test('a game opens on the players’ intro and ends on its result', async ({ page }) => {
  // Two browsers, a live game and the engine on both sides.
  test.slow();
  const game = await startFriendGame(page);
  try {
    await test.step('the intro', async () => {
      for (const side of [game.white, game.black]) await expectIntro(side);
    });
    await playMoves(game, SCHOLARS_MATE);
    await test.step('the game over', () => expectGameOver(game.white, game.black));
    expect(game.guestErrors, 'errors from the extension on the guest’s pages').toEqual([]);
  } finally {
    await game.guest.close();
  }
});
