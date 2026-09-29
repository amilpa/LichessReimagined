import { DAY_MS } from './dates.ts';
import type { RatingPoint, Series } from './series.ts';

// Samples across the plot: daily up to this many days, coarser beyond.
const MAX_SAMPLES = 180;

export interface SampledSeries extends Series {
  /** The rating at each sample time, null before the first point. */
  readonly values: readonly (number | null)[];
}

export interface Samples {
  readonly times: readonly number[];
  readonly rows: readonly SampledSeries[];
}

function sampleTimes(start: number, end: number): number[] {
  const step = Math.max(1, Math.ceil((end - start) / DAY_MS / MAX_SAMPLES)) * DAY_MS;
  const times: number[] = [];
  for (let time = start; time < end; time += step) times.push(time);
  times.push(end);
  return times;
}

/** The rating at each time: the last one on or before it. */
function ratingsAt(points: readonly RatingPoint[], times: readonly number[]): (number | null)[] {
  let next = 0;
  let current: number | null = null;
  return times.map(time => {
    for (let point = points[next]; point && point[0] <= time; point = points[next]) {
      current = point[1];
      next++;
    }
    return current;
  });
}

const playedBetween = (series: Series, start: number, end: number): boolean =>
  series.points.some(([time]) => time >= start && time <= end);

/**
 * Every series sampled on one time grid, so a series' path keeps the same
 * commands when the scale changes and the CSS can morph it (`d`).
 */
export function sampleRange(series: readonly Series[], start: number, end: number): Samples {
  const times = sampleTimes(start, end);
  const anyPlayed = series.some(one => playedBetween(one, start, end));
  const rows = series.flatMap((one): SampledSeries[] => {
    // A rating not played in the range is only shown when none was played in
    // it; each is then a flat line at its last value.
    if (anyPlayed && !playedBetween(one, start, end)) return [];
    const values = ratingsAt(one.points, times);
    return values.some(value => value !== null) ? [{ ...one, values }] : [];
  });
  return { times, rows };
}
