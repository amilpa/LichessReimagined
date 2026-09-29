import type { Color, Piece, Role } from '#shared/chess/index.ts';
import { pieceToken } from '#page/review/comment/tokens.ts';

// French grammar for the coach's sentences: a piece's gender picks its
// articles and agreements.

const ROLE_NAMES: Readonly<Record<Role, string>> = {
  pawn: 'pion',
  knight: 'cavalier',
  bishop: 'fou',
  rook: 'tour',
  queen: 'dame',
  king: 'roi',
};

const isFeminine = ({ role }: Piece): boolean => role === 'rook' || role === 'queen';

const pieceName = (piece: Piece): string => pieceToken(piece) + ROLE_NAMES[piece.role];

/** "la [dame]", "le [fou]". */
export const definite = (piece: Piece): string =>
  `${isFeminine(piece) ? 'la' : 'le'} ${pieceName(piece)}`;

/** "une [tour]", "un [cavalier]". */
export const indefinite = (piece: Piece): string =>
  `${isFeminine(piece) ? 'une' : 'un'} ${pieceName(piece)}`;

/** The object pronoun standing for the piece: "la", "le". */
export const pronoun = (piece: Piece): string => (isFeminine(piece) ? 'la' : 'le');

/** A past participle's agreement: "défendue", "défendu". */
export const agreement = (piece: Piece): string => (isFeminine(piece) ? 'e' : '');

export const side = (color: Color): string => (color === 'white' ? 'les Blancs' : 'les Noirs');

/** "des Blancs": a side as a complement. */
export const sides = (color: Color): string => (color === 'white' ? 'des Blancs' : 'des Noirs');

export const capitalize = (text: string): string =>
  text.length === 0 ? text : text.charAt(0).toUpperCase() + text.slice(1);

/** "un net avantage" → "d’un net avantage". */
export const withDe = (text: string): string => text.replace(/^un(e?) /, 'd’un$1 ');

/** French puts a space before ! ? : ;, which mustn't wrap away from its word. */
export const typography = (text: string): string => text.replace(/ ([!?:;])/g, '\u00a0$1');
