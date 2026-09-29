import { expect, type Page } from '@playwright/test';
import { boxOf } from './layout.ts';

// Lichess's top header, drawn as a fixed left sidebar from 1020px wide.

// `--cdc-sidebar-w` in styles/sidebar/layout.css.
const SIDEBAR_WIDTH = 176;

export async function expectSidebar(page: Page): Promise<void> {
  const sidebar = page.locator('#top');
  await expect(sidebar).toHaveCSS('position', 'fixed');
  const box = await boxOf(sidebar);
  const viewport = page.viewportSize();
  expect(box.left).toBe(0);
  expect(box.right).toBe(SIDEBAR_WIDTH);
  expect(box.bottom - box.top).toBe(viewport?.height);
  // The page makes room for it.
  await expect(page.locator('#main-wrap')).toHaveCSS('margin-left', `${SIDEBAR_WIDTH}px`);
  // Our Donate item, copied from Lichess's menu once the page is parsed.
  await expect(page.locator('#top #cdc-donate')).toBeVisible();
}

/** Below 1020px: Lichess's own header, which scrolls with the page. */
export async function expectLichessHeader(page: Page): Promise<void> {
  await expect(page.locator('#top')).not.toHaveCSS('position', 'fixed');
  await expect(page.locator('#main-wrap')).toHaveCSS('margin-left', '0px');
  await expect(page.locator('#cdc-donate')).toBeAttached();
  await expect(page.locator('#cdc-donate')).toBeHidden();
}
