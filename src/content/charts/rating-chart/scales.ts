import { steps } from '#shared/charts/steps.ts';
import type { Padding } from '#shared/geometry.ts';
import { DAY_MS } from './dates.ts';
import type { SampledSeries, Samples } from './sampling.ts';

// Room for the ratings on the left and the dates below.
export const PADDING: Padding = { top: 14, right: 14, bottom: 28, left: 46 };
export const HEIGHT = 300;
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;

const STEPS: readonly number[] = [5, 10, 20, 25, 50, 100, 150, 200, 250, 300, 400, 500, 1000];

export interface RatingTicks {
  readonly min: number;
  readonly max: number;
  readonly ticks: readonly number[];
}

/** A rating scale around `low`–`high` with some margin, in about four round steps. */
export function niceTicks(low: number, high: number): RatingTicks {
  const [lowest, highest] = low === high ? [low - 20, high + 20] : [low, high];
  const padding = (highest - lowest) * 0.08;
  const from = lowest - padding;
  const to = highest + padding;
  const rough = (to - from) / 4;
  const step = STEPS.find(candidate => candidate >= rough) ?? 1000;
  const min = Math.floor(from / step) * step;
  const max = Math.ceil(to / step) * step;
  return { min, max, ticks: steps(min, max + step / 2, step) };
}

/** What a draw lays out: the range's samples at the plot's width. */
export interface Layout extends Samples {
  readonly width: number;
  readonly start: number;
  readonly end: number;
}

/** A layout with its scales, for the ratings shown. */
export interface Plot extends Layout {
  readonly shown: readonly SampledSeries[];
  readonly ratings: RatingTicks;
  /** The plot's bottom edge, in px. */
  readonly bottom: number;
  readonly x: (time: number) => number;
  readonly y: (rating: number) => number;
}

export function scalePlot(layout: Layout, hidden: ReadonlySet<number>): Plot {
  const shown = layout.rows.filter(row => !hidden.has(row.index));
  const values = shown.flatMap(row => row.values.filter(value => value !== null));
  const ratings = niceTicks(Math.min(...values), Math.max(...values));
  const plotWidth = layout.width - PADDING.left - PADDING.right;
  const span = Math.max(DAY_MS, layout.end - layout.start);
  return {
    ...layout,
    shown,
    ratings,
    bottom: PADDING.top + PLOT_HEIGHT,
    x: time => PADDING.left + ((time - layout.start) / span) * plotWidth,
    y: rating =>
      PADDING.top + (1 - (rating - ratings.min) / (ratings.max - ratings.min)) * PLOT_HEIGHT,
  };
}
