/**
 * The values from `from` up to `to`, `step` (> 0) apart. They're summed one
 * step at a time, so fractional steps drift exactly as a plain loop's would.
 */
export function steps(from: number, to: number, step: number): number[] {
  const values: number[] = [];
  for (let value = from; value <= to; value += step) values.push(value);
  return values;
}
