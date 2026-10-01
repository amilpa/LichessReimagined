import type { Color, Piece } from '#shared/chess/index.ts';
import type { LineMove } from '#page/review/chess/line.ts';
import { colorLetter, ROLE_LETTERS } from '#page/review/chess/notation.ts';

// Pieces, moves and squares go into the coach's text as [[…]] tokens, which
// the comment's markup draws as pieces, move chips and bold squares: a
// beginner sees which piece, and whose, without reading the notation.

/** [[p:wn]]: a piece, drawn. */
export const pieceToken = ({ color, role }: Piece): string =>
  `[[p:${colorLetter(color)}${ROLE_LETTERS[role]}]]`;

/** [[m:w:Nf3]]: a move, as a chip with its piece. */
export const moveToken = (san: string, color: Color): string =>
  `[[m:${colorLetter(color)}:${san}]]`;

/** [[s:e4]]: a square, in bold. */
export const squareToken = (square: string): string => `[[s:${square}]]`;

/** [[n:12.:w:Nf3]]: a move with its number, kept on one line. */
export const numberedMoveToken = (number: string, san: string, color: Color): string =>
  `[[n:${number}:${colorLetter(color)}:${san}]]`;

// White's moves carry their number, and so does a line's first move when it's Black's.
function numbered({ san, color, number }: LineMove, first: boolean): string {
  if (color === 'white') return numberedMoveToken(`${number}.`, san, color);
  return first ? numberedMoveToken(`${number}...`, san, color) : moveToken(san, color);
}

/** "12. Nf3 Qd7 13. O-O" as tokens: a line, numbered as on a score sheet. */
export const lineToken = (moves: readonly LineMove[]): string =>
  moves.map((move, i) => numbered(move, i === 0)).join(' ');
