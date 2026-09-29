import { parseFen, sideToMove } from '#shared/chess/fen.ts';
import type { Square } from '#shared/chess/types.ts';

// Checkmate on the analysis board: a red badge on the mated king's square,
// then after a moment the square turns red under a "Checkmate" label.

const LABEL_DELAY_MS = 2500;

interface MateNode {
  readonly fen: string;
  readonly san?: string | undefined;
}

/** The mated king's square, if the position is checkmate. */
export function matedKing(node: MateNode | null): Square | null {
  if (!node?.san?.endsWith('#') || !node.fen) return null;
  // The side to move is the one mated. A FEN that doesn't say whose turn it is
  // reads as black's, as it did in the original.
  const mated = sideToMove(node.fen) ?? 'black';
  for (const [square, piece] of parseFen(node.fen).board) {
    if (piece.role === 'king' && piece.color === mated) return square;
  }
  return null;
}

export type MatePhase = 'none' | 'badge' | 'label';

/**
 * Tells how far into a checkmate the board is. The label comes in after a
 * moment whether or not anything else moves, so `onLabelDue` asks for a
 * redraw then.
 */
export function createMateClock(
  onLabelDue: () => void,
): (node: object | null, king: Square | null) => MatePhase {
  let matedNode: object | null = null;
  let since = 0;
  let timer = 0;
  return (node, king) => {
    if (!king) {
      matedNode = null;
      return 'none';
    }
    if (node !== matedNode) {
      matedNode = node;
      since = Date.now();
    }
    if (Date.now() - since >= LABEL_DELAY_MS) return 'label';
    clearTimeout(timer);
    timer = setTimeout(onLabelDue, since + LABEL_DELAY_MS - Date.now());
    return 'badge';
  };
}
