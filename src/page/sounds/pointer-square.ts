import { squareAt } from '#shared/chess/squares.ts';
import type { Color, Square } from '#shared/chess/types.ts';
import type { Box } from '#shared/geometry.ts';

export interface PointerOnBoard {
  readonly rect: Pick<Box, 'left' | 'top' | 'width' | 'height'>;
  readonly x: number;
  readonly y: number;
  readonly orientation: Color;
}

/** The square under a point of the page, or null off the board. */
export function squareFromPoint({ rect, x, y, orientation }: PointerOnBoard): Square | null {
  const column = Math.floor(((x - rect.left) / rect.width) * 8);
  const row = Math.floor(((y - rect.top) / rect.height) * 8);
  if (column < 0 || column > 7 || row < 0 || row > 7) return null;
  return orientation === 'white' ? squareAt(column, 7 - row) : squareAt(7 - column, row);
}
