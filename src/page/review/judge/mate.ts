import type { Color } from '#shared/chess/index.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import type { MoveClass } from '#page/review/classes/classes.ts';

/**
 * The longest mate our depth gets exact: a longer one comes out long (a mate
 * in 8 as a mate in 12), so only a move's short side is trusted.
 */
export const SURE_MATE = 5;

export type MateVerdict = Extract<MoveClass, 'excellent' | 'good' | 'inaccuracy'>;

const mateOf = (record: PositionRecord): number | undefined =>
  'mate' in record ? record.mate : undefined;

// No mate after the move: losing a mate counts as giving away endless moves.
const mateLost = (own: number): number => (own > 0 ? Infinity : 0);

function slowerMate(movesLost: number): MateVerdict | null {
  if (movesLost <= 0) return null;
  if (movesLost <= 2) return 'excellent';
  return movesLost <= 5 ? 'good' : 'inaccuracy';
}

/**
 * The verdict a move deserves from mate distances, which the win probability
 * can't see (a slower mate is 100% all the same). The winner of a sure mate
 * is judged by the moves given away; the loser, when a sure mate comes
 * clearly sooner, by how soon. Never worse than an inaccuracy: the result
 * stays the same.
 */
export function mateVerdict(
  before: PositionRecord,
  after: PositionRecord,
  color: Color,
): MateVerdict | null {
  const mateBefore = mateOf(before);
  const mateAfter = mateOf(after);
  if (!mateBefore || mateAfter === 0) return null;
  const sign = color === 'white' ? 1 : -1;
  const own = mateBefore * sign;
  const ownAfter = mateAfter === undefined ? mateLost(own) : mateAfter * sign;
  if (own > 0 && own <= SURE_MATE && ownAfter > 0) return slowerMate(ownAfter - (own - 1));
  if (own < 0 && ownAfter < 0 && -ownAfter <= SURE_MATE && ownAfter - own >= 3)
    return -ownAfter <= 2 ? 'inaccuracy' : 'good';
  return null;
}
