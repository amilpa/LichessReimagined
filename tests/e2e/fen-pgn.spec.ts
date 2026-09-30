import { expect, test } from './fixtures.ts';
import { openLichess } from './support/lichess.ts';

// The analysis board's FEN and PGN, which Lichess shows under the board and our
// layout keeps in the panel, behind a button of the controls.

test('the free board takes a pasted PGN, and shows the position’s FEN', async ({ page }) => {
  await openLichess(page, '/analysis');
  const fields = page.locator('main.analyse > .analyse__underboard');
  await expect(fields).toBeHidden();
  await page.locator('.analyse__controls > .cdc-fen-pgn').click();
  await expect(fields).toBeVisible();
  await fields.locator('.pgn textarea').fill('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6');
  await fields.locator('.pgn button').click();
  await expect(fields.locator('.copyables input')).toHaveValue(
    'r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4',
  );
  await page.locator('.analyse__controls > .cdc-fen-pgn').click();
  await expect(fields).toBeHidden();
});
