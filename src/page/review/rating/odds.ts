import { ratingModel, type Speed } from './model.ts';

/** The ratings the likelihoods are computed over: 100 to 3200, every 10. */
export const RATING_GRID: readonly number[] = Array.from({ length: 311 }, (_, i) => 100 + 10 * i);

// The fit is quadratic over this range of x = (rating - 1500) / 500, linear beyond.
const QUADRATIC_FROM = -1.6;
const QUADRATIC_TO = 2.2;

function curvature(x: number): number {
  if (x < QUADRATIC_FROM)
    return QUADRATIC_FROM * QUADRATIC_FROM + 2 * QUADRATIC_FROM * (x - QUADRATIC_FROM);
  if (x > QUADRATIC_TO) return QUADRATIC_TO * QUADRATIC_TO + 2 * QUADRATIC_TO * (x - QUADRATIC_TO);
  return x * x;
}

function logSoftmax(logits: readonly number[]): number[] {
  const max = Math.max(...logits);
  const sum = Math.log(logits.reduce((total, logit) => total + Math.exp(logit - max), 0)) + max;
  return logits.map(logit => logit - sum);
}

/** Per context, per grid rating, per loss band: the log odds of a move falling in it. */
export type BandOdds = readonly (readonly (readonly number[])[])[];

const oddsBySpeed = new Map<Speed, BandOdds>();

export function bandOdds(speed: Speed): BandOdds {
  const cached = oddsBySpeed.get(speed);
  if (cached) return cached;
  const odds = ratingModel().theta[speed].map(context =>
    RATING_GRID.map(rating => {
      const x = (rating - 1500) / 500;
      return logSoftmax([
        0,
        ...context.map(([intercept, slope, bend]) => intercept + slope * x + bend * curvature(x)),
      ]);
    }),
  );
  oddsBySpeed.set(speed, odds);
  return odds;
}

/** The mean rating of a likelihood over RATING_GRID, under a normal prior. */
export function posteriorMean(
  logLikelihood: readonly number[],
  mean: number,
  deviation: number,
): number {
  const posterior = logLikelihood.map(
    (value, i) => value - 0.5 * (((RATING_GRID[i] ?? 0) - mean) / deviation) ** 2,
  );
  const max = Math.max(...posterior);
  let weights = 0;
  let total = 0;
  for (const [i, value] of posterior.entries()) {
    const weight = Math.exp(value - max);
    weights += weight;
    total += weight * (RATING_GRID[i] ?? 0);
  }
  return total / weights;
}
