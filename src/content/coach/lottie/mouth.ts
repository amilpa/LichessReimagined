import type { Point } from '#shared/geometry.ts';
import { clamp } from '#shared/math.ts';
import type { CurlStyle } from './constants.ts';
import { lerp, openPath, outline, valueAt } from './geometry.ts';
import type { MouthPose } from './poses.ts';
import type { RigMouth } from './rig.ts';
import type { BezierPath } from './types.ts';

// The mouth in a pose: the lips, the opening, the teeth and the tongue as
// shapes, plus the corners' hooks on the coaches who have them.

export type MouthPart = 'upper' | 'lower' | 'inside' | 'teeth' | 'tongue' | 'curlL' | 'curlR';

/** Points per lip curve, corner to corner. */
const MOUTH_POINTS = 11;

/** The portrait's curves at one point. */
interface Sample {
  readonly upperTop: number;
  readonly openingTop: number;
  readonly openingBottom: number;
  readonly lowerBottom: number;
}

/** One point of the posed mouth: where each edge is at `x`. */
interface MouthPoint {
  readonly x: number;
  readonly upperTop: number;
  readonly openingTop: number;
  readonly openingBottom: number;
  readonly lowerBottom: number;
  readonly teethBottom: number;
  readonly tongueTop: number;
}

type Edge = Exclude<keyof MouthPoint, 'x'>;

function resample(curve: readonly number[], position: number): number {
  const j = Math.min(Math.floor(position), curve.length - 2);
  return lerp(valueAt(curve, j), valueAt(curve, j + 1), position - j);
}

function samples({ curves }: RigMouth): Sample[] {
  const span = curves.upperTop.length - 1;
  return Array.from({ length: MOUTH_POINTS }, (_, i) => {
    const position = (span * i) / (MOUTH_POINTS - 1);
    return {
      upperTop: resample(curves.upperTop, position),
      openingTop: resample(curves.openingTop, position),
      openingBottom: resample(curves.openingBottom, position),
      lowerBottom: resample(curves.lowerBottom, position),
    };
  });
}

/** How far the teeth show: as painted if the portrait shows them, else once the mouth opens. */
function teethDepth(mouth: RigMouth, pose: MouthPose, painted: readonly Sample[]): number {
  if (pose.teeth !== null) return pose.teeth;
  if (mouth.colors.teeth !== null) {
    return Math.max(...painted.map(sample => sample.openingBottom - sample.openingTop)) + 2;
  }
  return 2.4 * Math.min(1, (pose.open + pose.raise) / 3);
}

interface Posed {
  readonly mouth: RigMouth;
  readonly pose: MouthPose;
  readonly teeth: number;
}

function mouthPoint({ mouth, pose, teeth }: Posed, sample: Sample, k: number): MouthPoint {
  const [leftX, rightX] = mouth.x;
  const [leftY, rightY] = mouth.y;
  const centerX = (leftX + rightX) / 2;
  const along = k / (MOUTH_POINTS - 1);
  // -1 at the left corner, 1 at the right; `middle` is 0 at the corners, 1 between.
  const across = -1 + 2 * along;
  const middle = 1 - across * across;
  const chord = lerp(leftY, rightY, along);
  const cornerLift = pose.lift + (across < 0 ? pose.liftLeft : pose.liftRight);
  const baseline = chord + cornerLift * across * across + pose.bend * middle;
  // The jaw: flat-ish for a talking mouth, an ellipse for an "O".
  const jaw = middle ** lerp(0.9, 0.5, pose.round);
  const upperEdge = sample.upperTop - chord;
  const openTop = sample.openingTop - chord;
  const openBottom = sample.openingBottom - chord;
  const lowerEdge = sample.lowerBottom - chord;
  const openingTop = baseline + openTop - pose.raise * jaw;
  const openingBottom = openingTop + (openBottom - openTop) * (1 - pose.close) + pose.open * jaw;
  return {
    x: centerX + (lerp(leftX, rightX, along) - centerX) * pose.width + pose.shift * middle,
    upperTop: openingTop - (openTop - upperEdge) * pose.upperLip,
    openingTop,
    openingBottom,
    lowerBottom: openingBottom + (lowerEdge - openBottom) * pose.lowerLip,
    // The teeth hang from the upper lip and stop short of the corners, where
    // the portraits show the dark mouth line instead.
    teethBottom: Math.min(
      openingTop + teeth * Math.max(0, 1 - (Math.abs(across) / 0.82) ** 4),
      openingBottom,
    ),
    tongueTop: Math.max(openingBottom - pose.tongue * middle ** 0.7, openingTop),
  };
}

interface CurlOptions {
  readonly pose: MouthPose;
  readonly style: CurlStyle;
}

function curlPath(corner: MouthPoint, direction: -1 | 1, { pose, style }: CurlOptions): BezierPath {
  const { x, openingTop: y } = corner;
  // A corner pulled down flattens its hook.
  const turn = pose.lift + (direction < 0 ? pose.liftLeft : pose.liftRight);
  const rise = style.rise * clamp(1 - turn / 2, 0, 1.2);
  return openPath([
    [x - direction * style.inner * pose.width, y + 0.5 + 0.2 * turn],
    [x, y],
    [x + direction * style.outer, y - rise],
  ]);
}

interface MouthOptions {
  readonly mouth: RigMouth;
  readonly pose: MouthPose;
  readonly curl: CurlStyle | null;
}

export function mouthShapes({ mouth, pose, curl }: MouthOptions): Map<MouthPart, BezierPath> {
  const painted = samples(mouth);
  const posed = { mouth, pose, teeth: teethDepth(mouth, pose, painted) };
  const points = painted.map((sample, k) => mouthPoint(posed, sample, k));
  const curve = (edge: Edge): Point[] => points.map(point => [point.x, point[edge]]);
  const shapes = new Map<MouthPart, BezierPath>([
    ['upper', outline(curve('upperTop'), curve('openingTop'))],
    ['lower', outline(curve('openingBottom'), curve('lowerBottom'))],
    ['inside', outline(curve('openingTop'), curve('openingBottom'))],
    ['teeth', outline(curve('openingTop'), curve('teethBottom'))],
    ['tongue', outline(curve('tongueTop'), curve('openingBottom'))],
  ]);
  if (curl) {
    const options = { pose, style: curl };
    shapes.set('curlL', curlPath(valueAt(points, 0), -1, options));
    shapes.set('curlR', curlPath(valueAt(points, points.length - 1), 1, options));
  }
  return shapes;
}
