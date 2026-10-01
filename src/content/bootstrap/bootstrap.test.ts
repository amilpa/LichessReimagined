import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReadyStateSchema, setReadyState } from '#shared/testing/ready-state.ts';
import { assets } from './assets.ts';
import { coachChoice } from './coach-choice.ts';
import { fontFaces, fonts } from './fonts.ts';
import { reloadIfInjectedLate } from './late-reload.ts';
// What the original script did in the same cases.
import legacy from './fixtures/legacy.json' with { type: 'json' };

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  delete document.documentElement.dataset['cdcCoach'];
});
afterEach(() => setReadyState('complete'));

describe('assets', () => {
  it('tells the page world where the extension’s files are', () => {
    vi.stubGlobal('chrome', {
      runtime: { getURL: (path: string) => `chrome-extension://id/${path}` },
    });
    assets.start();
    expect(document.documentElement.dataset.cdcAssets).toBe('chrome-extension://id/');
    delete document.documentElement.dataset.cdcAssets;
  });
});

describe('fonts', () => {
  it('writes the same faces as the original', () => {
    expect(fontFaces()).toBe(legacy.fontFaces);
  });

  it.each(legacy.fonts)('adds them after Lichess’s, page $readyState', ({ readyState, after }) => {
    document.head.innerHTML = '<style id="lichess">x</style>';
    setReadyState(ReadyStateSchema.parse(readyState));
    fonts.start();
    const added = document.head.children.length > 1;
    expect(added).toBe(readyState !== 'loading');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    expect(document.head.innerHTML.replace(legacy.fontFaces, '<faces>')).toBe(after);
    document.head.innerHTML = '';
  });
});

describe('coach choice', () => {
  it.each(legacy.coach)(
    'reads $stored (random $random) as the original did',
    ({ stored, random, dataset, storedAfter }) => {
      vi.spyOn(Math, 'random').mockReturnValue(random);
      if (stored !== null) localStorage.setItem('cdc-coach', stored);
      coachChoice.start();
      expect(document.documentElement.dataset['cdcCoach']).toBe(dataset);
      expect(localStorage.getItem('cdc-coach')).toBe(storedAfter);
    },
  );
});

describe('late reload', () => {
  it.each(legacy.lateReload)(
    'page $readyState, last reload $stored: as the original',
    ({ readyState, stored, now, reloaded, reloads, storedAfter }) => {
      const reload = vi.fn<() => void>();
      vi.stubGlobal('location', { reload });
      vi.spyOn(Date, 'now').mockReturnValue(now);
      if (stored !== null) sessionStorage.setItem('cdc-late-reload', stored);
      setReadyState(ReadyStateSchema.parse(readyState));
      expect(reloadIfInjectedLate()).toBe(reloaded);
      expect(reload).toHaveBeenCalledTimes(reloads);
      expect(sessionStorage.getItem('cdc-late-reload')).toBe(storedAfter);
    },
  );
});
