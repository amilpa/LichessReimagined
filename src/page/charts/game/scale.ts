import { clamp } from '#shared/math.ts';

// The two charts share their x axis: the game from its start to its last
// move, one step per ply, so a move sits at the same x on both.

export interface PlotSize {
  readonly width: number;
  readonly height: number;
}

export interface PlyScale {
  readonly x: (ply: number) => number;
  /** The width of one ply. */
  readonly step: number;
}

/** Room on the sides for a dot or a column's half at either end. */
const SIDE = 6;

export function plyScale(lastPly: number, width: number): PlyScale {
  const step = (width - 2 * SIDE) / Math.max(1, lastPly);
  return { x: ply => SIDE + ply * step, step };
}

/** The ply of `plies` (in order) nearest to `x`. */
export function plyNear(plies: readonly number[], scale: PlyScale, x: number): number | null {
  if (plies.length === 0) return null;
  const guess = Math.round((x - SIDE) / scale.step);
  let best = plies[0] ?? 0;
  for (const ply of plies) if (Math.abs(ply - guess) < Math.abs(best - guess)) best = ply;
  return clamp(best, plies[0] ?? 0, plies.at(-1) ?? 0);
}
