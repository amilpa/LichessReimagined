import type { Point } from '#shared/geometry.ts';
import { clamp } from '#shared/math.ts';

// The radar's shape, in viewBox units: the SVG scales, so only proportions matter.

export const RADIUS = 100;
export const RINGS = 4;
// The smallest share of the radius a point is drawn at, so a low score stays visible.
const MIN_SHARE = 0.06;

/** Corner `index` of a regular polygon, starting at the top as Chart.js does. */
export function vertex(index: number, corners: number, radius: number): Point {
  const angle = (index / corners) * 2 * Math.PI - Math.PI / 2;
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
}

export const formatPoint = ([x, y]: Point): string => `${x.toFixed(2)},${y.toFixed(2)}`;

export function polygon(corners: number, radius: number): string {
  return Array.from({ length: corners }, (_, i) => formatPoint(vertex(i, corners, radius))).join(
    ' ',
  );
}

/**
 * The scale's ends. There are no tick labels (each theme shows its own
 * number), so it only has to keep the points well inside the rim.
 */
export function bounds(values: readonly number[]): readonly [number, number] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  return span === 0 ? [min - 10, min + 10] : [min - span * 0.6, max + span * 0.25];
}

/** Where each value sits on its spoke. */
export function plotPoints(values: readonly number[]): Point[] {
  const [low, high] = bounds(values);
  return values.map((value, i) => {
    const share = clamp((value - low) / (high - low), MIN_SHARE, 1);
    return vertex(i, values.length, RADIUS * share);
  });
}
