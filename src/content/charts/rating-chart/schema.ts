import { z } from 'zod/mini';
import { lenient } from '#shared/zod.ts';

// What Lichess's rating history module charts (ui/chart/src/ratingHistory.ts):
// one series per rating, each point `[year, month from 0, day, rating]`.

/** A point; Lichess may add fields after the four we read. */
export const PointSchema = z.tuple([z.number(), z.number(), z.number(), z.number()], z.number());

const SeriesSchema = z.object({
  name: z.string(),
  // Checked one by one: a bad point is skipped, not the whole chart.
  points: z.array(z.unknown()),
});

export const RatingHistorySchema = z.object({
  data: z.array(SeriesSchema).check(z.minLength(1)),
  // Set on a rating's stats page, which charts that rating alone.
  singlePerfName: lenient(z.string()),
});

export type RatingHistory = z.infer<typeof RatingHistorySchema>;
