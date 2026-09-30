import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { opponentName } from './board.ts';

// The bars of a game seen from `bottom`'s side: alice plays White, the computer Black.
function round(bottom: 'white' | 'black'): HTMLElement {
  const white =
    '<a class="user-link" href="/@/alice"><span class="utitle">FM&nbsp;</span>alice</a>';
  const black = '<name>Stockfish level 3</name>';
  document.body.innerHTML =
    `<main class="round"><div class="round__app__board main-board"><div class="cg-wrap orientation-${bottom}"></div></div>` +
    `<div class="ruser-top ruser user-link">${bottom === 'white' ? black : white}</div>` +
    `<div class="ruser-bottom ruser user-link">${bottom === 'white' ? white : black}</div></main>`;
  const main = queryOne(document, 'main.round', HTMLElement);
  if (!main) throw new Error('no game page');
  return main;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('opponentName', () => {
  it('reads the other side’s bar, however the board is turned', () => {
    expect(opponentName(round('white'), 'white', 'Anonymous')).toBe('Stockfish level 3');
    expect(opponentName(round('white'), 'black', 'Anonymous')).toBe('alice');
    // The player flipped the board: their own bar is on top.
    expect(opponentName(round('black'), 'white', 'Anonymous')).toBe('Stockfish level 3');
  });

  it('falls back on a name when the bar has none', () => {
    document.body.innerHTML = '<main class="round"></main>';
    const main = queryOne(document, 'main.round', HTMLElement);
    expect(main && opponentName(main, 'white', 'Anonymous')).toBe('Anonymous');
  });
});
