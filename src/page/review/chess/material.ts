import { attackers, opposite, parseFen, parseSquare, PIECE_VALUES } from '#shared/chess/index.ts';
import type { Board, Color, Piece, Role, Square } from '#shared/chess/index.ts';

// The review's facts still import the values from here.
export { PIECE_VALUES } from '#shared/chess/index.ts';

// As an attacker the king is worth the most: it can only take what's undefended.
const ATTACKER_VALUES: Readonly<Record<Role, number>> = { ...PIECE_VALUES, king: 100 };

/** The values of `by`'s pieces attacking `target`, pins ignored. */
export const attackerValues = (board: Board, target: Square, by: Color): number[] =>
  attackers(board, target, by).map(role => ATTACKER_VALUES[role]);

/** The piece on a square named in text ("e4"), if any. */
export function pieceOn(board: Board, name: string): Piece | undefined {
  const square = parseSquare(name);
  return square ? board.get(square) : undefined;
}

/**
 * A piece left to be won: attacked, and either undefended or attacked by
 * something cheaper.
 */
export function isHanging(board: Board, square: Square, piece: Piece): boolean {
  const hits = attackerValues(board, square, opposite(piece.color));
  if (hits.length === 0) return false;
  return (
    Math.min(...hits) < PIECE_VALUES[piece.role] ||
    attackers(board, square, piece.color).length === 0
  );
}

/**
 * A sound piece sacrifice: the moved piece can be taken by something cheaper,
 * or for free, and it wasn't just a trade.
 */
export function isSacrifice(fenBefore: string, fenAfter: string, uci: string): boolean {
  const before = parseFen(fenBefore).board;
  const after = parseFen(fenAfter).board;
  const dest = parseSquare(uci.slice(2, 4));
  const piece = dest ? after.get(dest) : undefined;
  if (!dest || !piece || piece.role === 'pawn' || piece.role === 'king') return false;
  const value = PIECE_VALUES[piece.role];
  const taken = before.get(dest);
  const captured = taken ? PIECE_VALUES[taken.role] : 0;
  if (captured >= value) return false;
  return isHanging(after, dest, piece);
}
