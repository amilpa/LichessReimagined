import { describe, expect, it, vi } from 'vitest';
import { hasFlags, presentFlags, syncHasFlags } from './has-flags.ts';
// The words the original script wrote for the same pages.
import legacy from './fixtures/legacy.json' with { type: 'json' };

const root = document.documentElement;

describe('presentFlags', () => {
  it.each(legacy.has)('reads $page as the original did', ({ page, has }) => {
    document.body.innerHTML = page;
    expect(presentFlags(document)).toBe(has);
    syncHasFlags();
    expect(root.dataset['cdcHas']).toBe(has);
  });
});

describe('hasFlags', () => {
  it('follows the page before the next frame, but not the board or the clock', async () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      frames.push(callback),
    );
    document.body.innerHTML =
      '<main class="round"><div class="cg-wrap"><cg-container></cg-container></div><div class="rclock"><div class="time"></div></div></main>';
    hasFlags.start();
    expect(root.dataset['cdcHas']).toBe('round');

    document.querySelector('cg-container')?.append(document.createElement('piece'));
    document.querySelector('.time')?.classList.add('hurry');
    await Promise.resolve();
    expect(frames).toHaveLength(0);

    document
      .querySelector('main')
      ?.append(Object.assign(document.createElement('div'), { className: 'pocket' }));
    document.querySelector('main')?.classList.add('tv-single');
    await Promise.resolve();
    expect(frames).toHaveLength(1);
    expect(root.dataset['cdcHas']).toBe('round');
    for (const frame of frames.splice(0)) frame(0);
    expect(root.dataset['cdcHas']).toBe('round pocket');
  });
});
