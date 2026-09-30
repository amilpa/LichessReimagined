import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { computedStyle, openLichess } from './support/lichess.ts';

// Learn: the stage cards' drawings, the level pills and the stars on the board.

/** Scores high enough for three stars on every level Lichess has. */
const THREE_STARS = 9999;

/** Plays the first levels of the rook and the knight, as Lichess saves them for a visitor. */
async function playSomeLevels(page: Page): Promise<void> {
  await page.evaluate(score => {
    const scores = (count: number): number[] => Array.from({ length: count }, () => score);
    const progress = { stages: { rook: { scores: scores(8) }, knight: { scores: scores(5) } } };
    localStorage.setItem('learn.progress', JSON.stringify(progress));
  }, THREE_STARS);
}

test('the stage cards show Lichess’s drawings, not white squares', async ({ page }) => {
  await openLichess(page, '/learn');
  const drawing = page.locator('.learn-stages .stage img').first();
  await expect(drawing).toBeVisible();
  // The drawing is whitened: the tile Lichess paints under it would turn white too.
  expect(await computedStyle(drawing, 'background-image')).toBe('none');
  expect(await computedStyle(drawing, 'padding-top')).toBe('0px');
});

test.describe('in a stage', () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  test('three stars stay inside their level’s pill', async ({ page }) => {
    await openLichess(page, '/learn');
    await playSomeLevels(page);
    // Lichess reads the progress once, when the page loads.
    await openLichess(page, '/learn#/5/2');
    await page.reload();
    const stars = page.locator('.learn__table .progress .stars.st3');
    await expect(stars.first()).toBeVisible();
    const overflowing = await stars.evaluateAll(elements =>
      elements.filter(element => {
        const pill = element.parentElement?.getBoundingClientRect();
        const box = element.getBoundingClientRect();
        return pill === undefined || box.left < pill.left || box.right > pill.right;
      }),
    );
    expect(overflowing).toHaveLength(0);
  });

  test('the pawns Lichess puts under the stars stay hidden', async ({ page }) => {
    await openLichess(page, '/learn#/5/2');
    const carriers = page.locator('.learn__main.apples piece.pawn.black');
    await expect(carriers.first()).toBeAttached();
    const drawn = await carriers.evaluateAll(pieces =>
      pieces.filter(piece => getComputedStyle(piece).backgroundImage !== 'none'),
    );
    expect(drawn).toHaveLength(0);
  });
});
