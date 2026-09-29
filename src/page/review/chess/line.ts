import {
  type Board,
  type Color,
  fenTurn,
  opposite,
  parseFen,
  parseSquare,
  type Piece,
  roleOfLetter,
  type Square,
  squareAt,
  squareCoords,
} from '#shared/chess/index.ts';
import { sanOn } from './notation.ts';

// An engine line, played out from its position so each move can be written
// as the review writes moves, with its number.

export interface LineMove {
  readonly san: string;
  readonly color: Color;
  /** The move's number, as a FEN counts them. */
  readonly number: number;
}

function castle(board: Map<Square, Piece>, king: Piece, from: Square, to: Square): void {
  const [fromFile, rank] = squareCoords(from);
  const target = board.get(to);
  // Chess960 and Lichess write castling as the king taking its own rook.
  const ontoRook = target?.role === 'rook' && target.color === king.color;
  const kingside = squareCoords(to)[0] > fromFile;
  const rookFrom = ontoRook ? to : squareAt(kingside ? 7 : 0, rank);
  const rook = rookFrom ? board.get(rookFrom) : undefined;
  board.delete(from);
  if (rookFrom) board.delete(rookFrom);
  const kingTo = squareAt(kingside ? 6 : 2, rank);
  const rookTo = squareAt(kingside ? 5 : 3, rank);
  if (kingTo) board.set(kingTo, king);
  if (rookTo && rook) board.set(rookTo, rook);
}

/** The board after a move in the engine's notation. */
export function boardAfter(board: Board, uci: string): Map<Square, Piece> {
  const next = new Map(board);
  const from = parseSquare(uci.slice(0, 2));
  const to = parseSquare(uci.slice(2, 4));
  const piece = from ? next.get(from) : undefined;
  if (!from || !to || !piece) return next;
  const [fromFile, fromRank] = squareCoords(from);
  const toFile = squareCoords(to)[0];
  const target = next.get(to);
  const ontoOwnRook = target?.role === 'rook' && target.color === piece.color;
  if (piece.role === 'king' && (Math.abs(toFile - fromFile) >= 2 || ontoOwnRook)) {
    castle(next, piece, from, to);
    return next;
  }
  // En passant: a pawn moving aside onto an empty square takes the pawn beside it.
  const passed = squareAt(toFile, fromRank);
  if (piece.role === 'pawn' && fromFile !== toFile && !target && passed) next.delete(passed);
  next.delete(from);
  const promotion = roleOfLetter(uci.charAt(4));
  next.set(to, promotion ? { color: piece.color, role: promotion } : piece);
  return next;
}

/** The moves of `line`, played from `fen`. */
export function lineMoves(fen: string, line: readonly string[]): LineMove[] {
  let board: Board = parseFen(fen).board;
  let color = fenTurn(fen);
  let number = Number(fen.split(' ')[5]) || 1;
  const moves: LineMove[] = [];
  for (const uci of line) {
    moves.push({ san: sanOn(board, uci), color, number });
    board = boardAfter(board, uci);
    if (color === 'black') number++;
    color = opposite(color);
  }
  return moves;
}
