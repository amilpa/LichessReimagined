import { type Board, parseFen, squareAt } from '#shared/chess/index.ts';

// Lichess's own phases (scalachess's Divider): the middlegame starts once
// pieces are traded or developed, or the two camps mix; the endgame once six
// pieces or fewer are left, kings and pawns aside.

export type Phase = 'opening' | 'tactics' | 'strategy' | 'endgame';
export const PHASES: readonly Phase[] = ['opening', 'tactics', 'strategy', 'endgame'];

export interface Division {
  /** The first middlegame position's index, or -1. */
  readonly middle: number;
  /** The first endgame position's index, or -1. */
  readonly end: number;
}

const majorsAndMinors = (board: Board): number =>
  [...board.values()].filter(piece => piece.role !== 'king' && piece.role !== 'pawn').length;

function backRankSparse(board: Board): boolean {
  let white = 0;
  let black = 0;
  for (const [square, piece] of board) {
    if (piece.color === 'white' && square[1] === '1') white++;
    if (piece.color === 'black' && square[1] === '8') black++;
  }
  return white < 4 || black < 4;
}

type RegionScore = (rank: number) => number;
const none: RegionScore = () => 0;

// A 2×2 region's score by its white and black pieces, and its rank (1 to 7).
const REGION_SCORES: readonly (readonly RegionScore[])[] = [
  [
    none,
    y => 1 + y,
    y => (y < 6 ? 2 + (6 - y) : 0),
    y => (y < 7 ? 3 + (7 - y) : 0),
    y => (y < 7 ? 3 + (7 - y) : 0),
  ],
  [y => 1 + (8 - y), y => 5 + Math.abs(4 - y), y => 4 + (7 - y), y => 5 + (7 - y)],
  [y => (y > 2 ? 2 + (y - 2) : 0), y => 4 + (y - 1), () => 7],
  [y => (y > 1 ? 3 + (y - 1) : 0), y => 5 + (y - 1)],
  [y => (y > 1 ? 3 + (y - 1) : 0)],
];

const REGION: readonly (readonly [number, number])[] = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
];

function regionScore(board: Board, file: number, rank: number): number {
  let white = 0;
  let black = 0;
  for (const [dx, dy] of REGION) {
    const square = squareAt(file + dx, rank + dy);
    const piece = square ? board.get(square) : undefined;
    if (piece?.color === 'white') white++;
    else if (piece) black++;
  }
  return REGION_SCORES[white]?.[black]?.(rank + 1) ?? 0;
}

function mixedness(board: Board): number {
  let total = 0;
  for (let rank = 0; rank < 7; rank++)
    for (let file = 0; file < 7; file++) total += regionScore(board, file, rank);
  return total;
}

/** Where the middlegame and the endgame start in a game's positions. */
export function divide(fens: readonly string[]): Division {
  const boards = fens.map(fen => parseFen(fen).board);
  const middle = boards.findIndex(
    board => majorsAndMinors(board) <= 10 || backRankSparse(board) || mixedness(board) > 150,
  );
  const end = middle < 0 ? -1 : boards.findIndex(board => majorsAndMinors(board) <= 6);
  return { middle: middle >= 0 && end >= 0 && middle >= end ? -1 : middle, end };
}
