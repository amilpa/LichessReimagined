import { COLORS, ROLES, type Color, type Piece } from './chess/types.ts';

// Reads chessground's board from its classes, which both worlds can see. The
// square a piece stands on is a property set by chessground's script, so only
// the page world can read it (#page/lichess/chessground.ts).

/** The side at the bottom of a board's `.cg-wrap`. */
export const wrapOrientation = (wrap: Element): Color =>
  wrap.classList.contains('orientation-black') ? 'black' : 'white';

/** The piece a `piece` element shows, or null for one that isn't on the board. */
export function pieceOf(element: Element): Piece | null {
  const { classList } = element;
  // A ghost marks a dragged piece's square, and a fading piece is one just taken.
  if (classList.contains('ghost') || classList.contains('fading')) return null;
  const color = COLORS.find(name => classList.contains(name));
  const role = ROLES.find(name => classList.contains(name));
  return color && role ? { color, role } : null;
}
