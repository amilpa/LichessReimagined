// Test support: just enough chess to grow a fake analysis tree. Moves are
// applied without checking they're legal; castling, en passant and
// promotion move the right pieces.

const FILES = 'abcdefgh';

type Grid = (string | null)[][];

function readGrid(placement: string): Grid {
  return placement.split('/').map(row => {
    const cells: (string | null)[] = [];
    for (const char of row) {
      if (/\d/.test(char)) cells.push(...Array.from({ length: Number(char) }, () => null));
      else cells.push(char);
    }
    return cells;
  });
}

function writeGrid(grid: Grid): string {
  return grid
    .map(row => {
      let out = '';
      let empty = 0;
      for (const cell of row) {
        if (cell === null) empty++;
        else {
          out += (empty > 0 ? String(empty) : '') + cell;
          empty = 0;
        }
      }
      return out + (empty > 0 ? String(empty) : '');
    })
    .join('/');
}

interface Cell {
  readonly row: number;
  readonly column: number;
}

const cellOf = (square: string): Cell => ({
  row: 8 - Number(square[1]),
  column: FILES.indexOf(square[0] ?? ''),
});

const pieceAt = (grid: Grid, { row, column }: Cell): string | null => grid[row]?.[column] ?? null;

function put(grid: Grid, { row, column }: Cell, piece: string | null): void {
  const line = grid[row];
  if (line) line[column] = piece;
}

export interface Played {
  readonly fen: string;
  readonly san: string;
}

function castle(grid: Grid, from: Cell, to: Cell, king: string): string {
  const kingSide = to.column > from.column;
  const rookFrom = { row: from.row, column: kingSide ? 7 : 0 };
  const rook = pieceAt(grid, rookFrom);
  put(grid, from, null);
  put(grid, rookFrom, null);
  put(grid, { row: from.row, column: kingSide ? 6 : 2 }, king);
  put(grid, { row: from.row, column: kingSide ? 5 : 3 }, rook);
  return kingSide ? 'O-O' : 'O-O-O';
}

const isWhite = (piece: string): boolean => piece === piece.toUpperCase();

function pawnSan(uci: string, capture: boolean): string {
  const promotion = uci[4];
  const taking = capture ? `${uci[0] ?? ''}x` : '';
  return `${taking}${uci.slice(2, 4)}${promotion ? `=${promotion.toUpperCase()}` : ''}`;
}

// Any other move: a capture en passant takes the pawn beside, a promotion swaps the pawn.
function plainMove(grid: Grid, uci: string, piece: string): string {
  const from = cellOf(uci.slice(0, 2));
  const to = cellOf(uci.slice(2, 4));
  const target = pieceAt(grid, to);
  const role = piece.toLowerCase();
  const passant = role === 'p' && from.column !== to.column && target === null;
  if (passant) put(grid, { row: from.row, column: to.column }, null);
  const promotion = uci[4];
  const promoted = isWhite(piece) ? promotion?.toUpperCase() : promotion;
  put(grid, from, null);
  put(grid, to, promoted ?? piece);
  const capture = target !== null || passant;
  if (role === 'p') return pawnSan(uci, capture);
  return `${role.toUpperCase()}${capture ? 'x' : ''}${uci.slice(2, 4)}`;
}

function isCastle(grid: Grid, uci: string, piece: string): boolean {
  const from = cellOf(uci.slice(0, 2));
  const to = cellOf(uci.slice(2, 4));
  const target = pieceAt(grid, to);
  const ownRook = target?.toLowerCase() === 'r' && isWhite(target) === isWhite(piece);
  return piece.toLowerCase() === 'k' && (Math.abs(to.column - from.column) >= 2 || ownRook);
}

/** The position after `uci`, and a plain SAN for it (no check marks, no disambiguation). */
export function playUci(fen: string, uci: string): Played {
  const [placement = '', turn = 'w', , , , fullmove = '1'] = fen.split(' ');
  const grid = readGrid(placement);
  const from = cellOf(uci.slice(0, 2));
  const piece = pieceAt(grid, from) ?? (turn === 'w' ? 'P' : 'p');
  const san = isCastle(grid, uci, piece)
    ? castle(grid, from, cellOf(uci.slice(2, 4)), piece)
    : plainMove(grid, uci, piece);
  const next = turn === 'w' ? 'b' : 'w';
  const moves = turn === 'b' ? Number(fullmove) + 1 : Number(fullmove);
  return { fen: `${writeGrid(grid)} ${next} - - 0 ${moves}`, san };
}

const squareIndex = (square: string): number =>
  FILES.indexOf(square[0] ?? '') + 8 * (Number(square[1]) - 1);

/** Lichess's node id: a character per square, as scalachess's UciCharPair. */
export function nodeId(uci: string): string {
  const origin = String.fromCharCode(35 + squareIndex(uci.slice(0, 2)));
  const promotion = uci[4];
  const dest = promotion
    ? String.fromCharCode(35 + 64 + 8 * 'qrbnk'.indexOf(promotion) + FILES.indexOf(uci[2] ?? ''))
    : String.fromCharCode(35 + squareIndex(uci.slice(2, 4)));
  return origin + dest;
}

/** A move for the side to move: its first pawn that can step forward. */
export function someMove(fen: string): string | null {
  const [placement = '', turn = 'w'] = fen.split(' ');
  const grid = readGrid(placement);
  const white = turn === 'w';
  for (let row = 0; row < 8; row++)
    for (let column = 0; column < 8; column++) {
      const piece = pieceAt(grid, { row, column });
      if (piece !== (white ? 'P' : 'p')) continue;
      const ahead = { row: row + (white ? -1 : 1), column };
      if (ahead.row < 0 || ahead.row > 7 || pieceAt(grid, ahead) !== null) continue;
      const promotion = ahead.row === 0 || ahead.row === 7 ? 'q' : '';
      return `${FILES[column] ?? ''}${8 - row}${FILES[column] ?? ''}${8 - ahead.row}${promotion}`;
    }
  return null;
}
