import { monotoneCurve } from '#shared/charts/curve.ts';
import type { Point } from '#shared/geometry.ts';
import type { SampledSeries } from './sampling.ts';
import type { Plot } from './scales.ts';

export interface SeriesPaths {
  readonly line: string;
  /** The line closed down to the plot's bottom, for the fill. */
  readonly area: string;
  /** The highest and lowest y the line reaches. */
  readonly top: number;
  readonly low: number;
}

export function seriesPaths(plot: Plot, row: SampledSeries): SeriesPaths {
  const points = plot.times.flatMap((time, j): Point[] => {
    const value = row.values[j];
    return value === null || value === undefined ? [] : [[plot.x(time), plot.y(value)]];
  });
  const line = monotoneCurve(points);
  const [first] = points;
  const last = points.at(-1);
  const area =
    first && last ? `${line}L${last[0]},${plot.bottom}L${first[0]},${plot.bottom}Z` : line;
  const heights = points.map(([, y]) => y);
  return { line, area, top: Math.min(...heights), low: Math.max(...heights) };
}
