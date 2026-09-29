import type { Point } from '#shared/geometry.ts';
import { roundTenth } from '#shared/math.ts';

interface Segment {
  readonly from: Point;
  readonly to: Point;
  readonly width: number;
  readonly slope: number;
}

function segmentsOf(points: readonly Point[]): Segment[] {
  const segments: Segment[] = [];
  for (let k = 1; k < points.length; k++) {
    const from = points[k - 1];
    const to = points[k];
    if (!from || !to) continue;
    const width = to[0] - from[0];
    segments.push({ from, to, width, slope: (to[1] - from[1]) / width });
  }
  return segments;
}

// Fritsch–Carlson: flat at a turning point, else a weighted harmonic mean of
// the slopes on either side, which keeps the curve from overshooting.
function tangentBetween(before: Segment | undefined, after: Segment | undefined): number {
  if (!before) return after?.slope ?? 0;
  if (!after) return before.slope;
  if (before.slope * after.slope <= 0) return 0;
  return (
    (3 * (before.width + after.width)) /
    ((2 * after.width + before.width) / before.slope +
      (after.width + 2 * before.width) / after.slope)
  );
}

/**
 * An SVG path through the points as a monotone cubic (d3's curveMonotoneX):
 * smooth, yet never above or below the points it joins.
 */
export function monotoneCurve(points: readonly Point[]): string {
  const [first] = points;
  if (!first) return '';
  // A lone point still needs some length to draw its round cap.
  if (points.length === 1) return `M${first[0]},${first[1]}h0.01`;
  const segments = segmentsOf(points);
  const tangents = points.map((_, k) => tangentBetween(segments[k - 1], segments[k]));
  const curves = segments.map(({ from, to, width }, k) => {
    const handle = width / 3;
    const startTangent = tangents[k] ?? 0;
    const endTangent = tangents[k + 1] ?? 0;
    const controls = [
      from[0] + handle,
      from[1] + startTangent * handle,
      to[0] - handle,
      to[1] - endTangent * handle,
      to[0],
      to[1],
    ];
    return `C${controls.map(roundTenth).join(',')}`;
  });
  return `M${roundTenth(first[0])},${roundTenth(first[1])}${curves.join('')}`;
}
