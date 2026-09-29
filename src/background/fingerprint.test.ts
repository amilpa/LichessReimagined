import { describe, expect, it } from 'vitest';
import { digest, loadedFiles } from './fingerprint.ts';
// Fingerprints the original worker computed for the same texts.
import legacy from './fixtures/legacy.json' with { type: 'json' };

const CONTENT_SCRIPTS = [
  { matches: ['https://lichess.org/*'], css: ['content.css'], js: ['content.js'] },
  { matches: ['https://lichess.org/*'], js: ['page.js'], world: 'MAIN' },
];

describe('loadedFiles', () => {
  it('lists the manifest, the service worker and the content scripts, in order', () => {
    const manifest = {
      background: { service_worker: 'background.js' },
      content_scripts: CONTENT_SCRIPTS,
    };
    expect(loadedFiles(manifest)).toEqual([
      'manifest.json',
      'background.js',
      'content.css',
      'content.js',
      'page.js',
    ]);
  });

  it('lists Firefox’s background scripts', () => {
    const manifest = { background: { scripts: ['a.js', 'b.js'] }, content_scripts: [] };
    expect(loadedFiles(manifest)).toEqual(['manifest.json', 'a.js', 'b.js']);
  });

  it('refuses a manifest it can’t read', () => {
    expect(() => loadedFiles({ content_scripts: 'content.js' })).toThrow('content_scripts');
  });
});

describe('digest', () => {
  it.each(legacy.digests)('matches the original for $texts', async ({ texts, fingerprint }) => {
    expect(await digest(texts)).toBe(fingerprint);
  });
});
