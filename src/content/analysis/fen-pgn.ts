import { createElement, queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { createOwnedElement } from '#shared/owned-element.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// The analysis page's FEN and PGN: Lichess shows them under the board, which our
// layout drops so the page never scrolls. A button in the controls opens them
// over the engine and the moves (styles/analysis/fen-pgn.css), as Lichess's
// menu does: the free board's fields to paste a position or a game into, a
// game's "Share & export".

export const OPEN = 'cdc-fen-pgn-open';
const BUTTON = 'cdc-fen-pgn';
// Lichess's clipboard glyph.
const ICON = '';
const LABEL = 'FEN / PGN';

const FIELDS = 'main.analyse > .analyse__underboard :is(.copyables, .fen-pgn)';

function buildButton(): HTMLButtonElement {
  const button = createElement('button', {
    className: `fbt ${BUTTON}`,
    attrs: { type: 'button', 'data-icon': ICON, title: LABEL, 'aria-label': LABEL },
  });
  button.addEventListener('click', () => {
    const root = document.documentElement;
    root.classList.toggle(OPEN, !root.classList.contains(OPEN));
    syncFenPgn();
  });
  return button;
}

const ownButton = createOwnedElement(buildButton);

export function syncFenPgn(): void {
  const root = document.documentElement;
  const controls = queryOne(document, 'main.analyse .analyse__controls', HTMLElement);
  // A study's underboard holds its own tabs, not these fields.
  if (!controls || !document.querySelector(FIELDS)) {
    if (root.classList.contains(OPEN)) root.classList.toggle(OPEN, false);
    return;
  }
  const button = ownButton(controls).element;
  const open = root.classList.contains(OPEN);
  button.classList.toggle('active', open);
  if (button.getAttribute('aria-pressed') !== String(open))
    button.setAttribute('aria-pressed', String(open));
}

export const fenPgn: Feature = {
  name: 'FEN and PGN',
  start: () => onEveryTick('FEN and PGN', syncFenPgn),
};
