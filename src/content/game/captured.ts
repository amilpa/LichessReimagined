import { pieceOf, wrapOrientation } from '#shared/chessground.ts';
import { createElement, queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { setHtml } from '#shared/html.ts';
import { createOwnedElement } from '#shared/owned-element.ts';
import { extensionUrl } from '#content/platform/runtime.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { CAPTURABLE_ROLES, capturedMarkup, type BarSide, type MaterialPiece } from './material.ts';

// The captured pieces in the game page's and the analysis board's player
// bars (styles/playerbar.css), read off the board as it is drawn.

function readPieces(board: Element): MaterialPiece[] {
  const pieces: MaterialPiece[] = [];
  for (const element of board.querySelectorAll('piece')) {
    const piece = pieceOf(element);
    if (!piece) continue;
    const role = CAPTURABLE_ROLES.find(name => name === piece.role);
    if (role) pieces.push({ color: piece.color, role });
  }
  return pieces;
}

// Three-check: Lichess counts the checks a side gave as kings in its
// material difference, which our bars hide.
function readChecks(main: Element): Record<BarSide, number> {
  const count = (side: BarSide): number =>
    main.querySelectorAll(`.material-${side} mpiece.king`).length;
  return { top: count('top'), bottom: count('bottom') };
}

// The game page names the variant on its app, the analysis board on <main>.
function readVariant(main: HTMLElement): string | undefined {
  const classes = queryOne(main, '.round__app', HTMLElement)?.className ?? main.className;
  return /\bvariant-(\w+)/.exec(classes)?.[1];
}

/** A sync task drawing the captured pieces, with the Neo pieces at `piecesUrl`. */
export function createCapturedSync(piecesUrl: string): () => void {
  const ownTopRow = createOwnedElement(() =>
    createElement('div', { className: 'cdc-captured cdc-captured--top' }),
  );
  const ownBottomRow = createOwnedElement(() =>
    createElement('div', { className: 'cdc-captured cdc-captured--bottom' }),
  );
  let lastKey = '';
  return () => {
    const main = queryOne(document, 'main.round, main.analyse', HTMLElement);
    const wrap =
      main && queryOne(main, '.round__app__board .cg-wrap, .analyse__board > .cg-wrap', Element);
    const board = wrap?.querySelector('cg-board');
    if (!main || !wrap || !board) return;
    // On the analysis board, only under the players of a game.
    if (main.matches('.analyse') && !main.querySelector(':scope > .cdc-player')) return;
    const variant = readVariant(main);
    const bottomColor = wrapOrientation(wrap);
    const checks = variant === 'threeCheck' ? readChecks(main) : { top: 0, bottom: 0 };
    const markup = capturedMarkup({
      pieces: readPieces(board),
      bottom: bottomColor,
      variant,
      checks,
      piecesUrl,
    });
    const topRow = ownTopRow(main);
    const bottomRow = ownBottomRow(main);
    if (topRow.isNew || bottomRow.isNew) lastKey = '';
    const key = `${markup.top.value}|${markup.bottom.value}`;
    if (key === lastKey) return;
    lastKey = key;
    setHtml(topRow.element, markup.top);
    setHtml(bottomRow.element, markup.bottom);
  };
}

export const capturedPieces: Feature = {
  name: 'captured pieces',
  start: () => onEveryTick('captured pieces', createCapturedSync(extensionUrl('img/pieces/neo/'))),
};
