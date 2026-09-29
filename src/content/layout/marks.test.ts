import { afterEach, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { setReadyState } from '#shared/testing/ready-state.ts';
import { marks, syncMarks } from './marks.ts';
// What the original script marked on the same pages.
import legacy from './fixtures/legacy.json' with { type: 'json' };

const navOf = (): string | undefined =>
  queryOne(document, '.subnav', HTMLElement)?.dataset['cdcNav'];

afterEach(() => {
  setReadyState('complete');
  document.body.innerHTML = '';
});

describe('syncMarks', () => {
  it.each(legacy.marks)('marks $page as the original did', ({ page, marked }) => {
    document.body.innerHTML = page;
    syncMarks();
    expect(document.body.innerHTML).toBe(marked);
  });

  it('writes nothing when the marks are already right', () => {
    document.body.innerHTML = legacy.marks[0]?.marked ?? '';
    const observer = new MutationObserver(() => {});
    observer.observe(document.body, { attributes: true, subtree: true });
    syncMarks();
    expect(observer.takeRecords()).toEqual([]);
    observer.disconnect();
  });
});

describe('marks', () => {
  it('marks what arrives while the page parses, then stops watching', async () => {
    setReadyState('loading');
    marks.start();
    document.body.innerHTML = '<nav class="subnav"><a href="/player/bots">Bots</a></nav>';
    await Promise.resolve();
    expect(navOf()).toBe('bots');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    document.body.innerHTML = '<nav class="subnav"><a href="/thanks">Thanks</a></nav>';
    await Promise.resolve();
    expect(navOf()).toBeUndefined();
  });

  it('marks a parsed page at once', () => {
    document.body.innerHTML = '<nav class="subnav"><a href="/thanks">Thanks</a></nav>';
    const spy = vi.spyOn(document, 'addEventListener');
    marks.start();
    expect(navOf()).toBe('about');
    expect(spy).not.toHaveBeenCalled();
  });
});
