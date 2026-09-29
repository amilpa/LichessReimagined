import { isSquare } from '#shared/chess/squares.ts';
import type { Square } from '#shared/chess/types.ts';

// Chessground keeps the square of each piece and square element in a `cgKey`
// expando, set by script rather than as an attribute.
export function cgKey(element: Element): Square | null {
  if (!('cgKey' in element)) return null;
  const key = element.cgKey;
  return typeof key === 'string' && isSquare(key) ? key : null;
}
