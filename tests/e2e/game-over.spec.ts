import { expect, test } from './fixtures.ts';
import { computedStyle } from './support/lichess.ts';
import { playMoves, startFriendGame } from './support/friend-game.ts';

// A game the player watches end: badges on the kings, confetti for the winner,
// and a card where the coach counts the player's moves. Two visitors play the
// fool's mate, the quickest game to end on the board.

const FOOLS_MATE = ['f2f3', 'e7e5', 'g2g4', 'd8h4'];

test('a game that ends on the board shows its result to both players', async ({ page }) => {
  const game = await startFriendGame(page);
  try {
    await playMoves(game, FOOLS_MATE);
    const { white: loser, black: winner } = game;

    const card = winner.locator('main.round > .cdc-end .cdc-end__card');
    await expect(card.locator('.cdc-end__title')).toHaveText('You won!');
    await expect(card.locator('.cdc-end__reason')).toHaveText('by checkmate');
    await expect(winner.locator('.cdc-confetti__piece').first()).toBeAttached();
    await expect(winner.locator('.cdc-end__king--win .cdc-end__king-label')).toHaveText('Winner');
    await expect(winner.locator('.cdc-end__king--loss .cdc-end__king-label')).toHaveText(
      'Checkmate',
    );
    // Lichess's own badges give way to ours.
    expect(await computedStyle(winner.locator('main.round .cg-custom-svgs'), 'display')).toBe(
      'none',
    );

    const lost = loser.locator('main.round > .cdc-end .cdc-end__card');
    await expect(lost.locator('.cdc-end__title')).toHaveText('You lost');
    await expect(loser.locator('.cdc-confetti')).toHaveCount(0);

    // The coach's quick look, from Lichess's engine on the game page.
    for (const card of [lost, winner.locator('.cdc-end__card')])
      await expect(card.locator('.cdc-end__bubble')).toHaveText(/accuracy/, { timeout: 60_000 });
    await expect(lost.locator('.cdc-end__review')).toHaveAttribute('href', /^\/\w{8}\/white/);
    await expect(lost.locator('.cdc-end__btn[data-cdc-end="rematch"]')).toBeVisible();

    await lost.locator('.cdc-end__close').click();
    await expect(lost).toHaveCount(0);
    await expect(loser.locator('.cdc-end__king')).toHaveCount(2);
    expect(game.guestErrors, 'errors from the extension on the guest’s pages').toEqual([]);
  } finally {
    await game.guest.close();
  }
});
