import { afterEach, describe, expect, it } from 'vitest';
import type { Color } from '#shared/chess/types.ts';
import { infoParts, syncGameMeta } from './game-meta.ts';
// The game info as the original left it.
import legacy from './fixtures/legacy-game-meta.json' with { type: 'json' };

const ratings = new Map<Color, string>(
  Object.entries(legacy.computer).flatMap(([color, rating]) =>
    color === 'white' || color === 'black' ? [[color, rating]] : [],
  ),
);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('game info', () => {
  it.each(legacy.scenarios)('splits it as the original did: $name', ({ html, after, again }) => {
    document.body.innerHTML = html;
    syncGameMeta(ratings);
    expect(document.querySelector('.game__meta')?.innerHTML).toBe(after);
    syncGameMeta(ratings);
    expect(document.querySelector('.game__meta')?.innerHTML).toBe(again);
  });

  it('only touches the game page’s side panel', () => {
    const html =
      '<main class="analyse"><div class="game__meta"><div class="setup">a • b</div></div></main>';
    document.body.innerHTML = html;
    syncGameMeta(ratings);
    expect(document.body.innerHTML).toBe(html);
  });

  it('splits a line on its bullets', () => {
    expect(infoParts(' 3+2 •Rated•  • Blitz ')).toEqual(['3+2', 'Rated', 'Blitz']);
  });
});
