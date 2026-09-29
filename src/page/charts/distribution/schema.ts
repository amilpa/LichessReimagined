import { z } from 'zod/mini';
import { lenient } from '#shared/zod.ts';

// The distribution page's init data (ui/chart/src/ratingDistribution.ts).
export const DistributionSchema = z.object({
  // Players per 25 points from 400. A chart needs two columns at least, and
  // a player to set its scale.
  freq: z.array(z.number()).check(
    z.minLength(2),
    z.refine(counts => counts.some(count => count > 0)),
  ),
  myRating: lenient(z.number()),
  // The player whose page linked here, if any.
  otherRating: lenient(z.number()),
  otherPlayer: lenient(z.string()),
});

export type DistributionData = z.infer<typeof DistributionSchema>;
