import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { openLichess } from './support/lichess.ts';

// A study's chapter list sits in the panel beside the board, within the
// window: the page doesn't scroll, so a list below it can't be reached.

/** A study whose chapters are all gamebooks: the coach replaces the tools. */
const GAMEBOOK_STUDY = '/study/NwXr1qag';
const STUDY = '/study/2Zl6MgFH';

async function box(locator: Locator): Promise<{ top: number; bottom: number; left: number }> {
  const bounds = await locator.boundingBox();
  if (bounds === null) throw new Error('not rendered');
  return { top: bounds.y, bottom: bounds.y + bounds.height, left: bounds.x };
}

async function chapterList(page: Page): Promise<Locator> {
  const list = page.locator('main.analyse > .analyse__side');
  await expect(list.locator('.study__side')).toBeVisible();
  return list;
}

for (const viewport of [
  { width: 1024, height: 768 },
  { width: 1600, height: 900 },
]) {
  test.describe(`at ${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport });

    test('a study’s chapter list fits in the window', async ({ page }) => {
      await openLichess(page, STUDY);
      const list = await box(await chapterList(page));
      expect(list.bottom).toBeLessThanOrEqual(viewport.height);
    });

    test('a gamebook’s coach sits over the chapter list, in line with it', async ({ page }) => {
      await openLichess(page, GAMEBOOK_STUDY);
      const list = await box(await chapterList(page));
      const coach = await box(page.locator('main.analyse > .gamebook'));
      expect(list.bottom).toBeLessThanOrEqual(viewport.height);
      expect(coach.left).toBe(list.left);
      // No empty cell between the coach and the list.
      expect(list.top - coach.bottom).toBeLessThan(2);
    });
  });
}
