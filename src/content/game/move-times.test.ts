import { afterEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { flush } from '#shared/testing/timers.ts';
import { formatSpent, spentTimes } from './clock-times.ts';
import { createMoveTimes } from './move-times.ts';
// What the original script showed for each game, and how it wrote times.
import legacy from './fixtures/legacy-move-times.json' with { type: 'json' };

const readMoves = (): { time: string | null; share: string | null }[] =>
  queryAll(document, 'kwdb:not(.empty)', HTMLElement).map(move => ({
    time: move.dataset.cdcTime ?? null,
    share: move.style.getPropertyValue('--cdc-time') || null,
  }));

function serveExports(games: ReadonlyMap<string, unknown>): string[] {
  const urls: string[] = [];
  vi.stubGlobal('fetch', (url: string) => {
    urls.push(url);
    const game = games.get(/export\/(\w+)/.exec(url)?.[1] ?? '');
    const response =
      game === undefined
        ? new Response('not found', { status: 404 })
        : new Response(JSON.stringify(game));
    return Promise.resolve(response);
  });
  return urls;
}

afterEach(() => {
  document.body.innerHTML = '';
  history.replaceState(null, '', '/');
  vi.useRealTimers();
});

describe('clock times', () => {
  it.each(legacy.formats)('formats %d cs as the original did', (centiseconds, text) => {
    expect(formatSpent(Number(centiseconds))).toBe(text);
  });

  it('starts each side on its first move, and adds the increment', () => {
    const clock = { initial: 60, increment: 1 };
    expect(spentTimes({ clock, clocks: [6000, 5950, 5900, 5000, 6000] })).toEqual([
      0, 50, 200, 1050, 0,
    ]);
    expect(spentTimes({})).toEqual([]);
  });
});

describe('move times', () => {
  it.each(legacy.scenarios)('shows what the original showed: $name', async scenario => {
    const urls = serveExports(new Map([[scenario.game.id, scenario.game]]));
    const tracker = createMoveTimes();
    history.replaceState(null, '', scenario.path);
    document.body.innerHTML = scenario.html;
    tracker.sync();
    await flush();
    await flush();
    tracker.sync();
    expect(urls).toEqual(scenario.requests.map(({ url }) => url));
    expect(readMoves()).toEqual(scenario.moves);
    const list = queryOne(document, 'l4x', HTMLElement);
    expect(list?.dataset.cdcTimes !== undefined).toBe(scenario.listMarked);
    const clock = scenario.clock && {
      initial: scenario.clock.initial,
      increment: scenario.clock.increment,
    };
    expect(tracker.finishedGame()).toEqual(clock && { id: scenario.id, clock });
  });

  it('asks again a second apart while the export lags the last move, five times at most', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const [scenario] = legacy.scenarios;
    if (!scenario) throw new Error('no scenario');
    const lagging = { ...scenario.game, clocks: scenario.game.clocks?.slice(0, -1) };
    const urls = serveExports(new Map([[scenario.game.id, lagging]]));
    const tracker = createMoveTimes();
    history.replaceState(null, '', scenario.path);
    document.body.innerHTML = scenario.html;
    for (let i = 0; i < 8; i++) {
      tracker.sync();
      await flush();
      tracker.sync();
      vi.advanceTimersByTime(1001);
    }
    expect(urls).toHaveLength(5);
  });

  it('rescales every bar when a longer think comes in', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const [scenario] = legacy.scenarios;
    if (!scenario) throw new Error('no scenario');
    const games = new Map<string, unknown>([
      [scenario.game.id, { ...scenario.game, clocks: [18000, 18000, 17500, 17000] }],
    ]);
    serveExports(games);
    const tracker = createMoveTimes();
    history.replaceState(null, '', scenario.path);
    document.body.innerHTML = scenario.html;
    tracker.sync();
    await flush();
    tracker.sync();
    expect(readMoves()[3]).toEqual({ time: '12.0s', share: '1.000' });
    games.set(scenario.game.id, { ...scenario.game, clocks: [18000, 18000, 17500, 17000, 15000] });
    vi.advanceTimersByTime(1001);
    tracker.sync();
    await flush();
    tracker.sync();
    // The original kept 1.000 here: it only rewrote a bar whose label changed.
    expect(readMoves()[3]).toEqual({ time: '12.0s', share: '0.444' });
  });
});
