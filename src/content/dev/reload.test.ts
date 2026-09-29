import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { trackListeners } from '#shared/testing/listeners.ts';
import { devReload } from './reload.ts';
// What the original script sent and reloaded, on the same clock.
import legacy from './fixtures/legacy.json' with { type: 'json' };

type Scenario = (typeof legacy.scenarios)[number];
interface OddScenario {
  readonly name: string;
  readonly manifest: object;
  readonly answer: unknown;
}

function setVisibility(state: string): void {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
}

let removeListeners = (): void => {};
beforeEach(() => {
  removeListeners = trackListeners(document, window);
  vi.useFakeTimers({ now: 0 });
});
afterEach(() => {
  removeListeners();
  vi.useRealTimers();
  setVisibility('visible');
});

interface Entry {
  readonly at: number;
  readonly event: string;
  readonly message?: unknown;
}

async function play(scenario: Scenario | OddScenario): Promise<Entry[]> {
  const log: Entry[] = [];
  const runtime = {
    id: 'orphaned' in scenario ? undefined : 'abc',
    getManifest: () => scenario.manifest,
    sendMessage: (message: unknown) => {
      log.push({ at: Date.now(), event: 'send', message });
      if ('reject' in scenario) return Promise.reject(new Error('no receiver'));
      return Promise.resolve('answer' in scenario ? scenario.answer : undefined);
    },
  };
  vi.stubGlobal('chrome', { runtime });
  vi.stubGlobal('location', { reload: () => log.push({ at: Date.now(), event: 'reload' }) });
  setVisibility('hidden' in scenario ? 'hidden' : 'visible');

  devReload.start();
  await vi.advanceTimersByTimeAsync(10);
  window.dispatchEvent(new Event('focus'));
  await vi.advanceTimersByTimeAsync(10);
  if ('orphanAfter' in scenario) {
    await vi.advanceTimersByTimeAsync(scenario.orphanAfter);
    runtime.id = undefined;
    log.push({ at: Date.now(), event: 'orphaned' });
  }
  await vi.advanceTimersByTimeAsync(1000);
  document.dispatchEvent(new Event('visibilitychange'));
  await vi.advanceTimersByTimeAsync(10);
  return log;
}

describe('devReload', () => {
  it.each(legacy.scenarios)('$name: as the original', async scenario => {
    expect(await play(scenario)).toEqual(scenario.log);
  });

  it('takes only a yes for a reload (the original took any truthy answer)', async () => {
    const log = await play({ name: 'odd answer', manifest: {}, answer: { reload: 'yes' } });
    expect(log.filter(entry => entry.event === 'reload')).toEqual([]);
    expect(log.filter(entry => entry.event === 'send')).toHaveLength(3);
  });
});
