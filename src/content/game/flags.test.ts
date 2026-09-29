import { afterEach, describe, expect, it, vi } from 'vitest';
import { queryAll } from '#shared/dom.ts';
import { flush } from '#shared/testing/timers.ts';
import { flagEmoji } from './flag-emoji.ts';
import { createFlagsSync } from './flags.ts';
// The original's emoji per code, its request, and the flags it set.
import legacy from './fixtures/legacy-flags.json' with { type: 'json' };

const readFlags = (): (string | null)[] =>
  queryAll(document, '.ruser, a.user-link', HTMLElement).map(bar => bar.dataset.cdcFlag ?? null);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('flagEmoji', () => {
  it.each(legacy.emoji)('turns %j into what the original showed', (code, emoji) => {
    expect(flagEmoji(code)).toBe(emoji);
  });

  it('shows nothing without a code', () => {
    expect(flagEmoji(undefined)).toBe('');
  });
});

describe('country flags', () => {
  const users = [
    { id: 'alice', profile: { flag: 'FR' } },
    { id: 'bob' },
    { id: 'carol', profile: { flag: 'GB-SCT' } },
  ];

  it('asks for every missing name at once, and marks the bars as the original did', async () => {
    const requests: { url: string; init: RequestInit | undefined }[] = [];
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
      requests.push({ url, init });
      return Promise.resolve(new Response(JSON.stringify(users)));
    });
    const sync = createFlagsSync();
    document.body.innerHTML = legacy.html;
    sync();
    expect(readFlags()).toEqual(legacy.loading);
    await flush();
    sync();
    expect(readFlags()).toEqual(legacy.after);
    expect(
      requests.map(({ url, init }) => ({ url, method: init?.method, body: init?.body })),
    ).toEqual(legacy.requests);
    sync();
    expect(requests).toHaveLength(1);
  });

  it('gives up on a name quietly when the API fails', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new Error('offline')));
    const sync = createFlagsSync();
    document.body.innerHTML = legacy.html;
    sync();
    await flush();
    sync();
    expect(readFlags().every(flag => flag === null)).toBe(true);
  });
});
