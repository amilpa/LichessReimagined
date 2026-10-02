import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeGithub } from '#shared/testing/github.ts';
import { fakeWorker } from '#shared/testing/worker.ts';
import { fetchPack } from './import.ts';

const text = (value: string): Uint8Array => new TextEncoder().encode(value);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const FILES = new Map([
  ['pack.json', text('{"name":"B","board":{"image":"b.png"}}')],
  ['b.png', PNG],
]);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchPack', () => {
  it('has the background worker download the pack', async () => {
    fakeWorker();
    fakeGithub({ repo: 'ann/packs', files: FILES });
    const download = await fetchPack('https://github.com/ann/packs', '');
    expect('pack' in download && download.pack.name).toBe('B');
  });

  it('turns down an image the browser can’t draw', async () => {
    // Lichess draws no board at all when one of its pieces fails to decode.
    vi.stubGlobal(
      'Image',
      class {
        src = '';
        decode = (): Promise<void> => Promise.reject(new Error('EncodingError'));
      },
    );
    fakeWorker();
    fakeGithub({ repo: 'ann/packs', files: FILES });
    expect(await fetchPack('https://github.com/ann/packs', '')).toEqual({
      error: "The board can't be drawn.",
    });
  });

  it('turns down what isn’t an answer of the worker’s', async () => {
    vi.stubGlobal('chrome', { runtime: { sendMessage: () => Promise.resolve({ pack: 'x' }) } });
    expect(await fetchPack('https://github.com/ann/packs', '')).toEqual({
      error: 'The pack could not be downloaded.',
    });
  });

  it('asks for a reload when the extension was updated under the page', async () => {
    vi.stubGlobal('chrome', {
      runtime: { sendMessage: () => Promise.reject(new Error('Extension context invalidated.')) },
    });
    expect(await fetchPack('https://github.com/ann/packs', '')).toEqual({
      error: 'The extension was updated: reload the page.',
    });
  });

  it('says the extension didn’t answer when its worker is gone', async () => {
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: () =>
          Promise.reject(new Error('The message port closed before a response was received.')),
      },
    });
    expect(await fetchPack('https://github.com/ann/packs', '')).toEqual({
      error: 'The extension did not answer: try again.',
    });
  });
});
