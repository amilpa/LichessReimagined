import { expect, type Locator, type Page } from '@playwright/test';

// Boxes and scrolling, measured on the live page.

export interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** The element's box in the viewport; it must be rendered. */
export async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  if (box === null) throw new Error(`${String(locator)} has no box: it isn't rendered`);
  return { left: box.x, top: box.y, right: box.x + box.width, bottom: box.y + box.height };
}

function viewportOf(page: Page): { width: number; height: number } {
  const viewport = page.viewportSize();
  if (viewport === null) throw new Error('the page has no fixed viewport');
  return viewport;
}

/** How many pixels the page is wider than the window: 0 when nothing overflows. */
export function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const root = document.scrollingElement ?? document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });
}

// A wheel scroll is animated: a page that scrolls has moved well within this.
const SCROLL_SETTLE_MS = 600;

/**
 * Wheels down over the sidebar, as a user would, and says how far the page
 * scrolled. The sidebar is fixed and doesn't scroll itself, so the wheel goes
 * to the page; over the board it would step through the moves instead.
 */
export async function wheelScroll(page: Page): Promise<number> {
  const viewport = viewportOf(page);
  await page.mouse.move(40, viewport.height / 2);
  await page.mouse.wheel(0, viewport.height);
  // A page that can't scroll sends no event to wait for: only time tells.
  await page.waitForTimeout(SCROLL_SETTLE_MS);
  return page.evaluate(() => window.scrollY);
}

// Chessground rounds the board to whole pixels per square, a pixel or two
// inside its wrapper, which is what the bars line up with.
const SLACK = 2;

/** Something beside the board: which of the board's edges it lines up with, and where it sits. */
export interface BoardNeighbour {
  readonly name: string;
  readonly locator: Locator;
  readonly edges: readonly (keyof Box)[];
  readonly side: 'above' | 'below' | 'left';
}

function clearOf(board: Box, box: Box, side: BoardNeighbour['side']): boolean {
  if (side === 'above') return box.bottom <= board.top + SLACK;
  if (side === 'below') return box.top >= board.bottom - SLACK;
  return box.right <= board.left + SLACK;
}

/** Each neighbour lines up with the board's edges and stays off the board. */
export async function expectLinedUp(
  board: Locator,
  neighbours: readonly BoardNeighbour[],
): Promise<void> {
  const boardBox = await boxOf(board);
  for (const { name, locator, edges, side } of neighbours) {
    const box = await boxOf(locator);
    for (const edge of edges)
      expect(
        Math.abs(box[edge] - boardBox[edge]),
        `${name}: its ${edge} edge against the board's`,
      ).toBeLessThanOrEqual(SLACK);
    expect(clearOf(boardBox, box, side), `${name} is ${side} the board`).toBe(true);
  }
}

/** The element is entirely in the window. */
export async function expectInView(page: Page, locator: Locator): Promise<void> {
  const box = await boxOf(locator);
  const { width, height } = viewportOf(page);
  const name = String(locator);
  expect(box.top, `${name}'s top`).toBeGreaterThanOrEqual(0);
  expect(box.left, `${name}'s left`).toBeGreaterThanOrEqual(0);
  // A fraction of a pixel past the edge is the layout's rounding.
  expect(box.bottom, `${name}'s bottom`).toBeLessThanOrEqual(height + 1);
  expect(box.right, `${name}'s right`).toBeLessThanOrEqual(width + 1);
}
