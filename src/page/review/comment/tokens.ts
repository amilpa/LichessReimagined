import type { Color, Piece } from '#shared/chess/index.ts';
import { colorLetter, ROLE_LETTERS } from '#page/review/chess/notation.ts';

// Pieces, moves and squares go into the coach's text as [[…]] tokens, which
// the comment's markup draws as Neo pieces, move chips and bold squares: a
// beginner sees which piece, and whose, without reading the notation.

/** [[p:wn]]: a piece, drawn. */
export const pieceToken = ({ color, role }: Piece): string =>
  `[[p:${colorLetter(color)}${ROLE_LETTERS[role]}]]`;

/** [[m:w:Nf3]]: a move, as a chip with its piece. */
export const moveToken = (san: string, color: Color): string =>
  `[[m:${colorLetter(color)}:${san}]]`;

/** [[s:e4]]: a square, in bold. */
export const squareToken = (square: string): string => `[[s:${square}]]`;
