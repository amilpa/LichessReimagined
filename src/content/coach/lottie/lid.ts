import type { Point } from '#shared/geometry.ts';
import { LID_SKIN } from './constants.ts';
import { lerp, openPath, outline, valueAt } from './geometry.ts';
import { verticalGradient } from './primitives.ts';
import type { RigEye } from './rig.ts';
import type { BezierPath, GradientFillItem } from './types.ts';

// An upper lid: its shapes at any closure, and its skin.

export interface LidShapes {
  /** The lid, from the top of the eye down to its edge. */
  readonly lid: BezierPath;
  /** The edge alone, where the lash line is drawn. */
  readonly edge: BezierPath;
}

/**
 * The lid when it is `closed` of the way shut (0 to 1). When shut, its edge is
 * one smooth arc from corner to corner, as deep as the eye and just past its
 * lower lash, so no white shows.
 */
export function lidShapes({ x: columns, top, bottom }: RigEye, closed: number): LidShapes {
  const last = columns.length - 1;
  const firstTop = valueAt(top, 0);
  const lastTop = valueAt(top, last);
  const middleBottom = valueAt(bottom, Math.floor(columns.length / 2));
  const sag = middleBottom + 0.6 - lerp(firstTop, lastTop, 0.5);
  const edge = columns.map((x, i): Point => {
    const along = i / last;
    const across = 2 * along - 1;
    const shut = Math.max(
      lerp(firstTop, lastTop, along) + sag * (1 - across * across) ** 0.75,
      valueAt(bottom, i) + 0.3,
    );
    return [x, lerp(valueAt(top, i), shut, closed)];
  });
  const rim = columns.map((x, i): Point => [x, valueAt(top, i) - 0.3]);
  return { lid: outline(rim, edge), edge: openPath(edge) };
}

export function lidSkin(eye: RigEye, coach: number): GradientFillItem {
  return verticalGradient({
    colors: LID_SKIN.get(coach) ?? eye.skin,
    offsets: [0, 1],
    from: Math.min(...eye.top),
    to: Math.max(...eye.bottom),
  });
}
