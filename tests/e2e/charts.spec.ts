import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { openLichess, storedValue } from './support/lichess.ts';
import { madeUpHistory, serveWithChart } from './support/stats-chart.ts';

// Lichess draws its charts with Chart.js into a canvas; ours are SVG, drawn
// from the page's own data, and only replace Lichess's once they're in.

const STATS_PAGE = { path: '/@/DrNykterstein/perf/blitz', perfName: 'Blitz' };
const DISTRIBUTION_PAGE = '/stat/rating/distribution/blitz';
const RANGE_KEY = 'cdc-rchart:range';

/** Hovers the middle of an element, as the pointer would. */
async function hoverMiddle(page: Page, selector: string): Promise<void> {
  const target = page.locator(selector);
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (box === null) throw new Error(`${selector} isn't rendered`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
}

test.describe('the rating history on a rating’s stats page', () => {
  test.beforeEach(async ({ page }) => {
    await serveWithChart(page, STATS_PAGE, madeUpHistory(new Date()));
    await openLichess(page, STATS_PAGE.path);
  });

  test('is drawn in SVG, in place of Lichess’s canvas', async ({ page }) => {
    const host = page.locator('.perf-stat > .rating-history-container');
    await expect(host).toHaveClass(/\bcdc-rchart-on\b/);
    await expect(host.locator('.cdc-rchart svg.cdc-rchart__svg')).toBeVisible();
    await expect(host.locator('.cdc-rchart__line').first()).toBeAttached();
    // The stats page charts its own rating only.
    await expect(host.locator('.cdc-rchart__chip')).toHaveCount(1);
    // Lichess's own, still there but out of sight.
    const lichessChart = page.locator('canvas.rating-history');
    await expect(lichessChart).toBeAttached();
    await expect(lichessChart).toBeHidden();
  });

  test('switches range with its pills, and keeps the range', async ({ page }) => {
    const pills = page.locator('.cdc-rchart__ranges [data-cdc-range]');
    await expect(pills).toHaveCount(6);
    await expect(page.locator('.cdc-rchart__ranges [data-cdc-range].active')).toHaveCount(1);
    const line = page.locator('.cdc-rchart__line').first();
    const curve = (): Promise<string> => line.evaluate(path => path.style.getPropertyValue('d'));
    await expect.poll(curve).not.toBe('');
    const before = await curve();
    const active = await page.locator('.cdc-rchart__ranges .active').getAttribute('data-cdc-range');
    const other = active === 'ALL' ? '1M' : 'ALL';
    await page.locator(`.cdc-rchart__ranges [data-cdc-range="${other}"]`).click();
    await expect(page.locator(`.cdc-rchart__ranges [data-cdc-range="${other}"]`)).toHaveClass(
      /\bactive\b/,
    );
    await expect.poll(curve).not.toBe(before);
    expect(await storedValue(page, RANGE_KEY)).toBe(other);
    await page.reload({ waitUntil: 'load' });
    await expect(page.locator(`.cdc-rchart__ranges [data-cdc-range="${other}"]`)).toHaveClass(
      /\bactive\b/,
    );
  });

  test('shows the rating under the pointer', async ({ page }) => {
    const tip = page.locator('.cdc-rchart__tip');
    await expect(page.locator('svg.cdc-rchart__svg')).toBeVisible();
    await expect(tip).not.toHaveClass(/--on/);
    await hoverMiddle(page, 'svg.cdc-rchart__svg');
    await expect(tip).toHaveClass(/\bcdc-rchart__tip--on\b/);
    await expect(tip).toContainText(STATS_PAGE.perfName);
    await expect(tip).toContainText(/\d{4}/);
    await expect(page.locator('.cdc-rchart__dot--on')).toHaveCount(1);
  });
});

test.describe('the rating distribution', () => {
  test.beforeEach(async ({ page }) => {
    await openLichess(page, DISTRIBUTION_PAGE);
  });

  test('draws its columns in SVG, in place of Lichess’s canvas', async ({ page }) => {
    const host = page.locator('#rating_distribution');
    await expect(host).toHaveClass(/\bcdc-dist-on\b/);
    await expect(host.locator('.cdc-dist svg.cdc-dist__svg')).toBeVisible();
    // A column per 25 points, from 400 to over 3000.
    await expect.poll(() => host.locator('.cdc-dist__bar').count()).toBeGreaterThan(50);
    await expect(host.locator('.cdc-dist__cumul')).toBeAttached();
    await expect(host.locator('canvas')).toBeAttached();
    await expect(host.locator('canvas')).toBeHidden();
  });

  test('shows the column under the pointer', async ({ page }) => {
    const tip = page.locator('.cdc-dist__tip');
    await expect(page.locator('svg.cdc-dist__svg')).toBeVisible();
    await hoverMiddle(page, 'svg.cdc-dist__svg');
    await expect(tip).toHaveClass(/\bcdc-rchart__tip--on\b/);
    await expect(tip).not.toBeEmpty();
    await expect(page.locator('.cdc-dist__bar--on')).toHaveCount(1);
  });
});
