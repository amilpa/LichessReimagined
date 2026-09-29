import { z } from 'zod/mini';

// Times are UTC midnights in ms, because Lichess's points are days, not moments.

export const DAY_MS = 86_400_000;

export function addMonths(time: number, months: number): number {
  const date = new Date(time);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate());
}

export function todayUtc(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

export const RangeKeySchema = z.enum(['1M', '3M', '6M', 'YTD', '1Y', 'ALL']);
export type RangeKey = z.infer<typeof RangeKeySchema>;
export const RANGE_KEYS: readonly RangeKey[] = RangeKeySchema.options;

/** The history's first day, and the chart's last: today, or a later point. */
export interface HistorySpan {
  readonly first: number;
  readonly end: number;
}

// Where each range would start if the history went back far enough.
const RANGE_FLOORS: Readonly<Record<RangeKey, (span: HistorySpan) => number>> = {
  '1M': ({ end }) => addMonths(end, -1),
  '3M': ({ end }) => addMonths(end, -3),
  '6M': ({ end }) => addMonths(end, -6),
  YTD: ({ end }) => Date.UTC(new Date(end).getUTCFullYear(), 0, 1),
  '1Y': ({ end }) => addMonths(end, -12),
  ALL: ({ first }) => first,
};

/** Where a range starts: never before the history does. */
export const rangeStart = (key: RangeKey, span: HistorySpan): number =>
  Math.max(span.first, RANGE_FLOORS[key](span));

/** The range picked last, else Lichess's default: three months, unless the history is shorter. */
export function initialRange(stored: RangeKey | null, span: HistorySpan): RangeKey {
  if (stored !== null) return stored;
  return span.first < addMonths(span.end, -3) ? '3M' : 'ALL';
}
