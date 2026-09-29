import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withLegacyNames } from '#shared/charts/fixtures/names.ts';
import { addMonths, initialRange, rangeStart } from './dates.ts';
import { ratingChart } from './index.ts';
import { extractInlineInit, readInlineInit } from './inline-init.ts';
import { signedChange } from './legend.ts';
import { sampleRange } from './sampling.ts';
import { niceTicks } from './scales.ts';
import { readSeries, type Series } from './series.ts';
import { dateFormats, timeTicks } from './time-ticks.ts';
// What the original script (before the TypeScript port) made of the same inputs.
import legacy from './fixtures/legacy.json' with { type: 'json' };

// The original named a series' index `i`.
const asLegacy = (series: readonly Series[] | null) =>
  series?.map(({ index, name, color, points }) => ({ i: index, name, color, points })) ?? null;

function series(json: unknown): Series[] {
  const result = readSeries(json);
  if (!result) throw new Error('unreadable series');
  return result;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(legacy.now);
});

afterEach(() => {
  vi.useRealTimers();
  document.documentElement.lang = '';
  document.body.replaceChildren();
});

describe('readSeries', () => {
  it.each(legacy.parse.map(({ input, output }, k) => [k, input, output]))(
    'reads case %i as the original did',
    (_, input, output) => {
      expect(asLegacy(readSeries(input))).toEqual(output);
    },
  );

  it('skips bad points but refuses a malformed series', () => {
    const points = [[2025, 0, 1, 1500], [2025, 0, 1], 'x', [2025, 0, 2, 1510, 99]];
    expect(series({ data: [{ name: 'Blitz', points }] })[0]?.points).toEqual([
      [Date.UTC(2025, 0, 1), 1500],
      [Date.UTC(2025, 0, 2), 1510],
    ]);
    expect(readSeries({ data: [{ name: 'Blitz' }] })).toBeNull();
  });

  it('treats a stats page name that is not a string as absent', () => {
    const data = [{ name: 'Blitz', points: [[2025, 0, 1, 1500]] }];
    expect(series({ data, singlePerfName: 42 })).toHaveLength(1);
  });
});

describe('the inline data of a stats page', () => {
  it.each(legacy.inline.map(({ scripts, output }) => [scripts, output]))(
    'reads %j as the original did',
    (scripts, output) => {
      const external = document.createElement('script');
      external.type = 'text/plain';
      external.setAttribute('src', 'x.js');
      external.textContent = scripts[0] ?? '';
      document.body.append(external);
      for (const text of scripts) {
        const script = document.createElement('script');
        script.type = 'text/plain';
        script.textContent = text;
        document.body.append(script);
      }
      expect(readInlineInit(document)).toEqual(output);
    },
  );

  it('unescapes the rating name', () => {
    const text = `loadEsm('chart.ratingHistory',{init:{data:[],singlePerfName:'King\\'s \\\\ x'}})`;
    expect(extractInlineInit(text)).toEqual({ data: [], singlePerfName: "King's \\ x" });
  });
});

describe('scales', () => {
  it.each(legacy.niceTicks.map(({ min, max, output }) => [min, max, output]))(
    'ticks %d–%d as the original did',
    (min, max, output) => {
      expect(niceTicks(min, max)).toEqual({ min: output.lo, max: output.hi, ticks: output.ticks });
    },
  );

  it.each(Object.entries(legacy.timeTicks))(
    'labels the dates in %s as the original did',
    (lang, cases) => {
      const formats = dateFormats(lang);
      for (const { start, end, width, output } of cases) {
        expect(timeTicks({ start, end, width }, formats)).toEqual(output);
      }
    },
  );
});

describe('dates', () => {
  it.each(legacy.addMonths.map(([time = 0, months = 0, output]) => [time, months, output]))(
    'moves %d by %d months as the original did',
    (time, months, output) => {
      expect(addMonths(time, months)).toBe(output);
    },
  );

  it('opens on three months, or on everything for a short history', () => {
    const end = Date.UTC(2026, 8, 28);
    expect(initialRange(null, { first: Date.UTC(2020, 0, 1), end })).toBe('3M');
    expect(initialRange(null, { first: Date.UTC(2026, 7, 1), end })).toBe('ALL');
    expect(initialRange('YTD', { first: Date.UTC(2026, 7, 1), end })).toBe('YTD');
  });

  it('never starts a range before the history', () => {
    const span = { first: Date.UTC(2026, 6, 1), end: Date.UTC(2026, 8, 28) };
    expect(rangeStart('1Y', span)).toBe(span.first);
    expect(rangeStart('1M', span)).toBe(Date.UTC(2026, 7, 28));
    expect(rangeStart('YTD', { ...span, first: 0 })).toBe(Date.UTC(2026, 0, 1));
  });
});

describe('sampleRange', () => {
  it.each(legacy.sample.map(({ json, start, end, output }) => [start, end, json, output]))(
    'samples %d–%d as the original did',
    (start, end, json, output) => {
      const { times, rows } = sampleRange(series(json), start, end);
      expect({ times, rows: rows.map(({ index, values }) => ({ i: index, values })) }).toEqual(
        output,
      );
    },
  );
});

it.each(legacy.signed.map(([change, text]) => [change, text]))(
  'writes a change of %d as %s',
  (change, text) => {
    expect(signedChange(Number(change))).toBe(text);
  },
);

describe('the feature', () => {
  it.each(legacy.pages.map(({ name, body, after }) => [name, body, after]))(
    'on the %s page, adds what the original did',
    (_, body, after) => {
      document.documentElement.lang = 'en';
      document.body.innerHTML = body;
      ratingChart.start();
      const chart = document.querySelector('.rating-history-container');
      expect(chart ? withLegacyNames(chart.outerHTML) : null).toBe(after);
    },
  );
});
