import { afterEach, describe, expect, it } from 'vitest';
import { queryAll } from '#shared/dom.ts';
import { OPEN, syncFenPgn } from './fen-pgn.ts';

// The markup Lichess serves on the free analysis board, a game's analysis and
// a study: only the first two have the FEN and PGN under the board.
const CONTROLS =
  '<div class="analyse__controls"><div class="jumps"></div><button class="fbt" data-act="menu"></button></div>';
const FREE_BOARD = `<main class="analyse">${CONTROLS}<div class="analyse__underboard"><div class="copyables"><div class="pair"><label class="name">FEN</label><input class="copyable"></div></div></div></main>`;
const GAME = `<main class="analyse">${CONTROLS}<div class="analyse__underboard"><div class="analyse__underboard__panels"><div class="fen-pgn"></div></div></div></main>`;
const STUDY = `<main class="analyse">${CONTROLS}<div class="analyse__underboard"><div class="study__underboard"></div></div></main>`;

const root = document.documentElement;
const buttons = (): HTMLButtonElement[] => queryAll(document, '.cdc-fen-pgn', HTMLButtonElement);

afterEach(() => {
  document.body.innerHTML = '';
  root.classList.toggle(OPEN, false);
});

describe('the FEN and PGN button', () => {
  it.each([
    ['the free board', FREE_BOARD],
    ['a game’s analysis', GAME],
  ])('joins the controls on %s, once', (_name, markup) => {
    document.body.innerHTML = markup;
    syncFenPgn();
    syncFenPgn();
    expect(buttons()).toHaveLength(1);
    expect(buttons()[0]?.parentElement?.className).toBe('analyse__controls');
  });

  it('stays out of a study, whose underboard has other things', () => {
    document.body.innerHTML = STUDY;
    syncFenPgn();
    expect(buttons()).toHaveLength(0);
  });

  it('opens the fields and closes them again', () => {
    document.body.innerHTML = FREE_BOARD;
    syncFenPgn();
    buttons()[0]?.click();
    expect(root.classList.contains(OPEN)).toBe(true);
    expect(buttons()[0]?.getAttribute('aria-pressed')).toBe('true');
    expect(buttons()[0]?.classList.contains('active')).toBe(true);
    buttons()[0]?.click();
    expect(root.classList.contains(OPEN)).toBe(false);
    expect(buttons()[0]?.getAttribute('aria-pressed')).toBe('false');
  });

  it('closes once the page has no fields left', () => {
    document.body.innerHTML = FREE_BOARD;
    syncFenPgn();
    buttons()[0]?.click();
    document.body.innerHTML = STUDY;
    syncFenPgn();
    expect(root.classList.contains(OPEN)).toBe(false);
  });

  it('comes back when Lichess redraws the controls', () => {
    document.body.innerHTML = FREE_BOARD;
    syncFenPgn();
    document.body.innerHTML = FREE_BOARD;
    syncFenPgn();
    expect(buttons()).toHaveLength(1);
  });
});
