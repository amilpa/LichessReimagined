export type Color = 'white' | 'black';
export type Role = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';
export type File = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
export type Rank = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
export type Square = `${File}${Rank}`;

export interface Piece {
  readonly color: Color;
  readonly role: Role;
}

export type Board = ReadonlyMap<Square, Piece>;

export const COLORS: readonly Color[] = ['white', 'black'];
export const ROLES: readonly Role[] = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];

export const opposite = (color: Color): Color => (color === 'white' ? 'black' : 'white');
