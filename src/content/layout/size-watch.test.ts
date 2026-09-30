import { describe, expect, it } from 'vitest';
import { fakeLayout } from '#shared/testing/layout.ts';
import { createSizeWatch } from './size-watch.ts';

describe('createSizeWatch', () => {
  it('asks for a measure on new elements and after a resize only', () => {
    const layout = fakeLayout(() => 0);
    const board = document.createElement('div');
    const wrapper = document.createElement('div');
    const watch = createSizeWatch();
    expect(watch.changed([board, wrapper])).toBe(true);
    expect(watch.changed([board, wrapper])).toBe(false);
    layout.resize();
    expect(watch.changed([board, wrapper])).toBe(true);
    expect(watch.changed([board, wrapper])).toBe(false);
    // Lichess drew a new board.
    expect(watch.changed([document.createElement('div'), wrapper])).toBe(true);
    expect(watch.changed([wrapper])).toBe(true);
    expect(watch.changed([wrapper])).toBe(false);
  });
});
