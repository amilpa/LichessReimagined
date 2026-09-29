/** `value`, kept between `low` and `high` (`low` wins if they cross). */
export const clamp = (value: number, low: number, high: number): number =>
  Math.max(low, Math.min(high, value));

/** Rounds to a tenth: precise enough for a pixel coordinate, and short in markup. */
export const roundTenth = (value: number): number => Math.round(value * 10) / 10;
