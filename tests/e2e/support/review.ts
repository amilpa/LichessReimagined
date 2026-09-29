import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { BrowserContext, Page } from '@playwright/test';
import { z } from 'zod/mini';
import { MOVE_CLASSES } from '#page/review/classes/classes.ts';
import { StoredRecordSchema } from '#page/review/evaluation/stored.ts';

// The Game Review of FINISHED_GAME. The engine takes a minute and never
// judges twice alike, so most tests start from its cache: every position
// at full depth, as this extension stored it once the analysis was done.
// The @slow review test records it again with CDC_RECORD_REVIEW=1.

/** Any of the review's verdicts, as it writes them in `data-cdc-cls`. */
export const VERDICT = new RegExp(`^(${MOVE_CLASSES.join('|')})$`);

const ReviewCacheSchema = z.object({
  storageKey: z.string().check(z.startsWith('cdc-review:')),
  records: z.array(StoredRecordSchema).check(z.minLength(2)),
});

export type ReviewCache = z.infer<typeof ReviewCacheSchema>;

const FIXTURE_FILE = path.join(import.meta.dirname, '..', 'fixtures', 'review-tKlG0mrQ.json');

export const REVIEW_CACHE: ReviewCache = ReviewCacheSchema.parse(
  JSON.parse(readFileSync(FIXTURE_FILE, 'utf8')),
);

/** Puts the cached review in every page's storage, before Lichess's scripts run. */
export async function seedReviewCache(context: BrowserContext): Promise<void> {
  const entry = { key: REVIEW_CACHE.storageKey, value: JSON.stringify(REVIEW_CACHE.records) };
  await context.addInitScript(({ key, value }) => localStorage.setItem(key, value), entry);
}

/** The review the extension cached for `gameId` on `page`, or null while its analysis runs. */
export async function storedReview(page: Page, gameId: string): Promise<ReviewCache | null> {
  const prefix = `cdc-review:${gameId}:`;
  const stored = await page.evaluate(start => {
    const key = Object.keys(localStorage).find(name => name.startsWith(start));
    return key === undefined ? null : { key, value: localStorage.getItem(key) ?? '' };
  }, prefix);
  if (stored === null) return null;
  const records: unknown = JSON.parse(stored.value);
  return ReviewCacheSchema.parse({ storageKey: stored.key, records });
}

export const shouldRecordReview = (): boolean => process.env['CDC_RECORD_REVIEW'] === '1';

export function recordReview(cache: ReviewCache): void {
  writeFileSync(FIXTURE_FILE, `${JSON.stringify(cache, null, 2)}\n`);
}

/** The review's elements, as the page script adds them to the analysis page. */
export function reviewParts(page: Page) {
  const panel = page.locator('#cdc-review');
  return {
    panel,
    start: panel.locator('.cdc-review__foot [data-cdc="moves"]'),
    close: panel.locator('.cdc-review__close'),
    reopen: panel.locator('.cdc-review__open'),
    bubbleTitle: panel.locator('.cdc-bubble .cdc-bubble__title'),
    comment: panel.locator('.cdc-bubble .cdc-bubble__sub'),
    avatar: panel.locator('.cdc-coach__avatar'),
    explain: panel.locator('.cdc-review__nav [data-cdc="explain"]'),
    best: panel.locator('.cdc-review__nav [data-cdc="best"]'),
    next: panel.locator('.cdc-review__nav [data-cdc="next"]'),
    controls: page.locator('#cdc-review-controls'),
    badge: page.locator('#cdc-board-overlay .cdc-badge'),
    evalBar: page.locator('#cdc-evalbar'),
    arrows: page.locator('#cdc-shapes .cdc-shapes__arrows polygon'),
  };
}
