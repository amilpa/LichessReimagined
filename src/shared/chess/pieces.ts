import { ROLES, type Color, type Role } from './types.ts';

// The pieces' letters, as FEN and SAN write them and as the piece images are
// named (wp, bn…), and their usual values.

export const ROLE_LETTERS: Readonly<Record<Role, string>> = {
  pawn: 'p',
  knight: 'n',
  bishop: 'b',
  rook: 'r',
  queen: 'q',
  king: 'k',
};

const ROLE_BY_LETTER: ReadonlyMap<string, Role> = new Map(
  ROLES.map(role => [ROLE_LETTERS[role], role]),
);

/** A role from its letter, either case ("Q", "n"). */
export const roleOfLetter = (letter: string): Role | undefined =>
  ROLE_BY_LETTER.get(letter.toLowerCase());

export const colorLetter = (color: Color): string => (color === 'white' ? 'w' : 'b');

/** The king counts for nothing: it can't be traded. */
export const PIECE_VALUES: Readonly<Record<Role, number>> = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
  king: 0,
};
