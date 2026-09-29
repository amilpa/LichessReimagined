import { seriesColor } from '#shared/charts/colors.ts';
import { PointSchema, type RatingHistory, RatingHistorySchema } from './schema.ts';

/** A rating at a time: `[UTC ms, rating]`. */
export type RatingPoint = readonly [time: number, rating: number];

export interface Series {
  /** Its position in Lichess's list, which sets its color and identifies it in our markup. */
  readonly index: number;
  readonly name: string;
  readonly color: string;
  /** Oldest first; never empty. */
  readonly points: readonly RatingPoint[];
}

function ratingPoints(points: readonly unknown[]): RatingPoint[] {
  return points
    .flatMap((point): RatingPoint[] => {
      const result = PointSchema.safeParse(point);
      if (!result.success) return [];
      const [year, month, day, rating] = result.data;
      return [[Date.UTC(year, month, day), rating]];
    })
    .toSorted(([oneTime], [otherTime]) => oneTime - otherTime);
}

/** The series worth drawing: those with a point, or just the page's own rating. */
export function toSeries({ data, singlePerfName }: RatingHistory): Series[] {
  const series = data.flatMap(({ name, points }, index): Series[] => {
    const ratings = ratingPoints(points);
    return ratings.length > 0 ? [{ index, name, color: seriesColor(index), points: ratings }] : [];
  });
  return singlePerfName ? series.filter(({ name }) => name === singlePerfName) : series;
}

/** The series in the module's data, or null if it isn't the data we know. */
export function readSeries(value: unknown): Series[] | null {
  const result = RatingHistorySchema.safeParse(value);
  return result.success ? toSeries(result.data) : null;
}
