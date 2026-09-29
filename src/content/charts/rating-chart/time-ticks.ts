import { addMonths, DAY_MS } from './dates.ts';

export interface DateFormats {
  readonly day: Intl.DateTimeFormat;
  readonly month: Intl.DateTimeFormat;
  readonly monthYear: Intl.DateTimeFormat;
  readonly year: Intl.DateTimeFormat;
  /** The tooltip's date. */
  readonly full: Intl.DateTimeFormat;
}

export function dateFormats(locale: string | undefined): DateFormats {
  const format = (options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat =>
    new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...options });
  return {
    day: format({ day: 'numeric', month: 'short' }),
    month: format({ month: 'short' }),
    monthYear: format({ month: 'short', year: 'numeric' }),
    year: format({ year: 'numeric' }),
    full: format({ day: 'numeric', month: 'short', year: 'numeric' }),
  };
}

export type TimeTick = readonly [time: number, label: string];

// Up to 45 days: four days evenly spread.
function dayTicks(start: number, end: number, formats: DateFormats): TimeTick[] {
  return [1, 2, 3, 4].map(k => {
    const time = Math.round((start + ((end - start) * k) / 5) / DAY_MS) * DAY_MS;
    return [time, formats.day.format(time)];
  });
}

// Up to 800 days: the first of each month, January's with the year.
function monthTicks(start: number, end: number, formats: DateFormats): TimeTick[] {
  const from = new Date(start);
  const ticks: TimeTick[] = [];
  let time = Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1);
  while (time <= end) {
    const format = new Date(time).getUTCMonth() === 0 ? formats.monthYear : formats.month;
    ticks.push([time, format.format(time)]);
    time = addMonths(time, 1);
  }
  return ticks;
}

// Beyond: each year's first day.
function yearTicks(start: number, end: number, formats: DateFormats): TimeTick[] {
  const ticks: TimeTick[] = [];
  for (let year = new Date(start).getUTCFullYear() + 1; Date.UTC(year, 0, 1) <= end; year++) {
    const time = Date.UTC(year, 0, 1);
    ticks.push([time, formats.year.format(time)]);
  }
  return ticks;
}

interface TimeAxis {
  readonly start: number;
  readonly end: number;
  /** The plot's width, in px. */
  readonly width: number;
}

/** The date labels under the plot, thinned to one per 72px so they don't collide. */
export function timeTicks({ start, end, width }: TimeAxis, formats: DateFormats): TimeTick[] {
  const days = (end - start) / DAY_MS;
  let ticks: TimeTick[];
  if (days <= 45) ticks = dayTicks(start, end, formats);
  else if (days <= 800) ticks = monthTicks(start, end, formats);
  else ticks = yearTicks(start, end, formats);
  const room = Math.max(1, Math.floor(width / 72));
  const every = Math.ceil(ticks.length / room);
  return ticks.filter((_, k) => k % every === 0);
}
