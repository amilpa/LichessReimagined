import { afterEach, describe, expect, it, vi } from 'vitest';
import { flush } from '#shared/testing/timers.ts';
import { createCapturedSync } from './captured.ts';
import { capturedMarkup, type MaterialPiece } from './material.ts';
// What the original script drew for each board.
import legacy from './fixtures/legacy-captured.json' with { type: 'json' };

const inner = (selector: string): string | null =>
  document.querySelector(selector)?.innerHTML ?? null;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('captured pieces', () => {
  it.each(legacy.scenarios)('draws what the original drew: $name', scenario => {
    const sync = createCapturedSync(legacy.piecesUrl);
    document.body.innerHTML = scenario.html;
    sync();
    expect(inner('.cdc-captured--top')).toBe(scenario.top);
    expect(inner('.cdc-captured--bottom')).toBe(scenario.bottom);
  });

  it('leaves the bars alone while the board is the same', () => {
    const sync = createCapturedSync(legacy.piecesUrl);
    const [scenario] = legacy.scenarios;
    document.body.innerHTML = scenario?.html ?? '';
    sync();
    const group = document.querySelector('.cdc-captured--top > .cdc-captured__group');
    sync();
    expect(document.querySelector('.cdc-captured--top > .cdc-captured__group')).toBe(group);
    expect(document.querySelectorAll('.cdc-captured')).toHaveLength(2);
  });

  it('reads the board again only once it changes', async () => {
    const sync = createCapturedSync(legacy.piecesUrl);
    const scenario = legacy.scenarios.find(each => each.html.includes('piece'));
    document.body.innerHTML = scenario?.html ?? '';
    sync();
    const reads = vi.spyOn(Element.prototype, 'querySelectorAll');
    sync();
    expect(reads).not.toHaveBeenCalled();
    const before = inner('.cdc-captured--top') ?? '';
    for (const piece of document.querySelectorAll('cg-board piece')) piece.remove();
    await flush();
    sync();
    expect(inner('.cdc-captured--top')).not.toBe(before);
  });

  it('draws again into new bars when Lichess replaces <main>', () => {
    const sync = createCapturedSync(legacy.piecesUrl);
    const [scenario] = legacy.scenarios;
    document.body.innerHTML = scenario?.html ?? '';
    sync();
    document.body.innerHTML = scenario?.html ?? '';
    sync();
    expect(inner('.cdc-captured--top')).toBe(scenario?.top);
  });
});

describe('capturedMarkup', () => {
  const pawn: MaterialPiece = { color: 'white', role: 'pawn' };
  it('shows three-check kings after the pieces, and the lead last', () => {
    const markup = capturedMarkup({
      pieces: [pawn],
      bottom: 'white',
      variant: 'threeCheck',
      checks: { top: 0, bottom: 2 },
      piecesUrl: '/p/',
    });
    expect(markup.bottom.value).toMatch(/bk\.webp.*bk\.webp.*cdc-captured__score">\+1</);
  });
});
