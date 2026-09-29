import type { Page } from '@playwright/test';

// A rating's stats page carries its history chart, but not always: Lichess
// leaves it out now and then (as it does on a profile for anyone signed out).
// When it's missing, these serve the live page with it, as lila's PerfStatUi
// renders it, drawn from a history made up to end today.

type Point = readonly [year: number, month: number, day: number, rating: number];

interface RatingSeries {
  readonly name: string;
  readonly points: readonly Point[];
}

const DAY_MS = 86_400_000;
const POINTS = 150;

/** A point every ten days up to `today`, the rating going up and down around `base`. */
function madeUpPoints(today: Date, base: number): Point[] {
  return Array.from({ length: POINTS }, (_, i) => {
    const date = new Date(today.getTime() - (POINTS - 1 - i) * 10 * DAY_MS);
    const rating = Math.round(base + 150 * Math.sin(i / 9) + i / 2);
    return [date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), rating];
  });
}

export const madeUpHistory = (today: Date): RatingSeries[] => [
  { name: 'Bullet', points: madeUpPoints(today, 2900) },
  { name: 'Blitz', points: madeUpPoints(today, 2800) },
];

// What lila puts where the anonymous page has nothing, and what its
// chart.ratingHistory module looks for.
const CHART_MARKUP =
  '<div class="rating-history-container"><div class="rating-history-container">' +
  '<div class="time-selector-buttons"></div><div class="spinner"></div>' +
  '<div class="chart-container"><canvas class="rating-history"></canvas></div>' +
  '<div id="time-range-slider"></div></div></div>';
const CHART_ANCHOR = '<div class="box__pad perf-stat__content">';

function withChart(body: string, history: readonly RatingSeries[], perfName: string): string {
  if (body.includes('rating-history-container')) return body;
  // The page's scripts need its nonce, or its CSP blocks the module call.
  const nonce = /<script nonce="([^"]+)"/.exec(body)?.[1];
  if (nonce === undefined || !body.includes(CHART_ANCHOR))
    throw new Error('the stats page no longer has the markup the chart goes in');
  const init = `{init:{data:${JSON.stringify(history)},singlePerfName:'${perfName}'}}`;
  const call = `<script nonce="${nonce}">site.load.then(()=>site.asset.loadEsm('chart.ratingHistory',${init}))</script>`;
  return body
    .replace(CHART_ANCHOR, CHART_MARKUP + CHART_ANCHOR)
    .replace('</body>', `${call}</body>`);
}

export interface StatsPage {
  /** The page's path, `/@/<user>/perf/<perf>`. */
  readonly path: string;
  /** The rating's name in the history, `Blitz`. */
  readonly perfName: string;
}

/** Serves `path` with its chart, drawn from `history` when Lichess left it out. */
export async function serveWithChart(
  page: Page,
  { path, perfName }: StatsPage,
  history: readonly RatingSeries[],
): Promise<void> {
  await page.route(path, async route => {
    const response = await route.fetch();
    const body = withChart(await response.text(), history, perfName);
    await route.fulfill({ response, body });
  });
}
