import { z } from 'zod/mini';

// The puzzle dashboard's init data: `radar` is the Chart.js config Lichess
// draws its theme radar from.

const MIN_THEMES = 3;

const RadarSchema = z
  .pipe(
    z.object({
      labels: z.array(z.string()),
      datasets: z.tuple([z.object({ data: z.array(z.coerce.number()) })], z.unknown()),
    }),
    z.transform(({ labels, datasets: [{ data }] }) => ({ labels, values: data })),
  )
  // A radar needs a triangle at least, and one value per theme.
  .check(
    z.refine(
      ({ labels, values }) => values.length >= MIN_THEMES && values.length === labels.length,
    ),
  );

export const DashboardInitSchema = z.object({ radar: RadarSchema });

export type Radar = z.infer<typeof RadarSchema>;
