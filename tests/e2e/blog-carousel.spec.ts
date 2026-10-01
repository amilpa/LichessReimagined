import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { openLichess } from './support/lichess.ts';

// The home page's blog cards follow a mouse drag, then land on whole cards,
// without opening the card the drag started on.

const cardHrefs = (page: Page): Promise<string[]> =>
  page
    .locator('.lobby__blog .ublog-post-card')
    .evaluateAll(cards => cards.map(card => card.getAttribute('href') ?? ''));

async function dragBy(page: Page, distance: number): Promise<void> {
  const box = await page.locator('.lobby__blog .ublog-post-card').nth(1).boundingBox();
  if (!box) throw new Error('no card to drag');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 3;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + distance, y, { steps: 12 });
  await page.mouse.up();
}

test('the blog cards drag a card at a time', async ({ page }) => {
  await openLichess(page, '/');
  const blog = page.locator('main.lobby .lobby__blog');
  await expect(blog).toBeVisible();
  const cards = blog.locator('.ublog-post-card');
  const [first, second] = await Promise.all([
    cards.nth(0).boundingBox(),
    cards.nth(1).boundingBox(),
  ]);
  if (!first || !second) throw new Error('no blog cards');
  const slot = second.x - first.x;
  // An arrow stops Lichess's autoplay, which would move the cards under the test.
  await blog.locator('.carousel__next').click();
  const start = await cardHrefs(page);

  await dragBy(page, -slot);
  await expect.poll(() => cardHrefs(page)).toEqual([...start.slice(1), ...start.slice(0, 1)]);
  await expect(blog).not.toHaveAttribute('data-cdc-dragging');
  expect(new URL(page.url()).pathname).toBe('/');
  const shifts = await cards.evaluateAll(all =>
    all.flatMap(card => (card instanceof HTMLElement ? [card.style.transform] : [])),
  );
  expect(shifts.every(shift => shift === '')).toBe(true);

  await dragBy(page, slot);
  await expect.poll(() => cardHrefs(page)).toEqual(start);
  expect(new URL(page.url()).pathname).toBe('/');
});
