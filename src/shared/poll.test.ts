import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pollUntil } from './poll.ts';

beforeEach(() => vi.useFakeTimers({ now: 0, toFake: ['setTimeout', 'Date'] }));
afterEach(() => vi.useRealTimers());

describe('pollUntil', () => {
  it('hands over a value there at once, without waiting', () => {
    const found = vi.fn<(value: string) => void>();
    pollUntil(() => 'now', found, { intervalMs: 50, giveUpMs: 1000 });
    expect(found).toHaveBeenCalledExactlyOnceWith('now');
  });

  it('tries every interval until the value comes', () => {
    let value: number | null = null;
    const read = vi.fn<() => number | null>(() => value);
    const found = vi.fn<(value: number) => void>();
    pollUntil(read, found, { intervalMs: 50, giveUpMs: 1000 });
    vi.advanceTimersByTime(149);
    expect(read).toHaveBeenCalledTimes(3);
    value = 7;
    vi.advanceTimersByTime(1);
    expect(found).toHaveBeenCalledExactlyOnceWith(7);
    vi.advanceTimersByTime(1000);
    expect(read).toHaveBeenCalledTimes(4);
  });

  it('gives up once the time is out', () => {
    const read = vi.fn<() => null>(() => null);
    pollUntil(read, () => {}, { intervalMs: 250, giveUpMs: 1000 });
    vi.advanceTimersByTime(5000);
    // At 0, 250, 500, 750 and 1000 ms: the last miss is past the limit.
    expect(read).toHaveBeenCalledTimes(5);
  });

  it('stops as soon as the value is no longer worth waiting for', () => {
    let worthWaiting = true;
    const read = vi.fn<() => null>(() => null);
    pollUntil(read, () => {}, {
      intervalMs: 250,
      giveUpMs: 30_000,
      worthWaiting: () => worthWaiting,
    });
    vi.advanceTimersByTime(500);
    worthWaiting = false;
    vi.advanceTimersByTime(5000);
    expect(read).toHaveBeenCalledTimes(4);
  });
});
