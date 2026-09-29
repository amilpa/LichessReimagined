import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod/mini';
import { flush } from '#shared/testing/timers.ts';
import { sounds } from './index.ts';
// What the original script fetched and posted, with the same failures.
import legacy from './fixtures/legacy.json' with { type: 'json' };

const PostedSchema = z.object({
  type: z.string(),
  sounds: z.record(z.string(), z.instanceof(ArrayBuffer)),
});

const FAILING = new Set(['sounds/castle.mp3', 'sounds/game-end.mp3']);

function stubFetch(gate: Promise<void>): string[] {
  const fetched: string[] = [];
  vi.stubGlobal('fetch', async (url: string) => {
    fetched.push(url);
    await gate;
    const path = url.replace('chrome-extension://abc/', '');
    if (FAILING.has(path)) throw new TypeError('Failed to fetch');
    return {
      arrayBuffer: async () => {
        if (path === 'sounds/notify.mp3') throw new Error('aborted');
        return new TextEncoder().encode(path).buffer;
      },
    };
  });
  return fetched;
}

function pageReady(source: Window | null): void {
  window.dispatchEvent(new MessageEvent('message', { data: { type: 'cdc:page-ready' }, source }));
}

describe('sounds', () => {
  it('reads and posts the sounds as the original did', async () => {
    vi.stubGlobal('chrome', {
      runtime: { getURL: (path: string) => `chrome-extension://abc/${path}` },
    });
    const gate = Promise.withResolvers<void>();
    const fetched = stubFetch(gate.promise);
    const posted: unknown[] = [];
    vi.spyOn(window, 'postMessage').mockImplementation((message: unknown, origin?: unknown) => {
      const { type, sounds: files } = PostedSchema.parse(message);
      const decoded = Object.entries(files).map(([name, bytes]): [string, string] => [
        name,
        new TextDecoder().decode(bytes),
      ]);
      posted.push({ type, sounds: Object.fromEntries(decoded), origin });
    });

    sounds.start();
    // The page script asks before the sounds are in: nothing to send yet.
    pageReady(window);
    await flush();
    const beforeLoad = posted.length;
    gate.resolve();
    for (let i = 0; i < 5; i++) await flush();
    const afterLoad = posted.length;
    pageReady(window);
    pageReady(null);
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'other' }, source: window }));
    window.dispatchEvent(new MessageEvent('message', { data: null, source: window }));

    expect({ fetched, beforeLoad, afterLoad, afterReady: posted.length, posted }).toEqual(legacy);
  });
});
