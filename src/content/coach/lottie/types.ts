import type { Point } from '#shared/geometry.ts';

// The part of the Lottie format (lottiefiles.github.io/lottie-docs) the
// coach's animations use: shape and image layers, groups of paths painted
// with fills, strokes and linear gradients, each property still or keyframed.

export type Vector = readonly number[];

/** A cubic Bézier path: its vertices, and each one's tangents relative to it. */
export interface BezierPath {
  readonly i: readonly Point[];
  readonly o: readonly Point[];
  readonly v: readonly Point[];
  readonly c: boolean;
}

/** One side of a keyframe's easing curve, a value per dimension. */
export interface EasingHandle {
  readonly x: readonly number[];
  readonly y: readonly number[];
}

export interface Easing {
  readonly o: EasingHandle;
  readonly i: EasingHandle;
}

/** The last keyframe of a property has no easing: nothing follows it. */
export interface Keyframe<T> {
  readonly t: number;
  readonly s: T;
  readonly o?: EasingHandle;
  readonly i?: EasingHandle;
}

/** A still value, or keyframes whose values are always lists (a number is wrapped). */
export type Property<Value, KeyframeValue> =
  | { readonly a: 0; readonly k: Value }
  | { readonly a: 1; readonly k: readonly Keyframe<KeyframeValue>[] };

export type NumberProperty = Property<number, Vector>;
export type VectorProperty = Property<Vector, Vector>;
export type PathProperty = Property<BezierPath, readonly BezierPath[]>;

export interface PathItem {
  readonly ty: 'sh';
  readonly ks: PathProperty;
}

// `r: 1` is the non-zero fill rule; `lc` / `lj` 2 are round caps and joins.
export interface FillItem {
  readonly ty: 'fl';
  readonly c: VectorProperty;
  readonly o: NumberProperty;
  readonly r: 1;
}

export interface StrokeItem {
  readonly ty: 'st';
  readonly c: VectorProperty;
  readonly o: NumberProperty;
  readonly w: NumberProperty;
  readonly lc: 2;
  readonly lj: 2;
}

/** A linear gradient (`t: 1`) from `s` to `e`; `g.k` holds offset, r, g, b per stop. */
export interface GradientFillItem {
  readonly ty: 'gf';
  readonly o: NumberProperty;
  readonly r: 1;
  readonly t: 1;
  readonly s: VectorProperty;
  readonly e: VectorProperty;
  readonly g: { readonly p: number; readonly k: VectorProperty };
}

/** A group's transform, which Lottie wants as the group's last item. */
export interface GroupTransformItem {
  readonly ty: 'tr';
  readonly p: VectorProperty;
  readonly a: VectorProperty;
  readonly s: VectorProperty;
  readonly r: NumberProperty;
  readonly o: NumberProperty;
}

export interface GroupItem {
  readonly ty: 'gr';
  readonly it: readonly ShapeItem[];
}

export type ShapeItem =
  | PathItem
  | FillItem
  | StrokeItem
  | GradientFillItem
  | GroupTransformItem
  | GroupItem;

export interface LayerTransform {
  readonly o: NumberProperty;
  readonly r: NumberProperty;
  readonly p: VectorProperty;
  readonly a: VectorProperty;
  readonly s: VectorProperty;
}

interface LayerBase {
  readonly ddd: 0;
  readonly ind: number;
  readonly nm: string;
  readonly sr: 1;
  readonly ip: 0;
  readonly op: number;
  readonly st: 0;
  readonly ks: LayerTransform;
  readonly ao: 0;
  readonly bm: 0;
}

export interface ShapeLayer extends LayerBase {
  readonly ty: 4;
  readonly shapes: readonly ShapeItem[];
}

export interface ImageLayer extends LayerBase {
  readonly ty: 2;
  readonly refId: string;
}

export type Layer = ShapeLayer | ImageLayer;

/** An embedded image (`e: 1`), its data URL in `p`. */
export interface ImageAsset {
  readonly id: string;
  readonly w: number;
  readonly h: number;
  readonly u: '';
  readonly p: string;
  readonly e: 1;
}

export interface Animation {
  readonly v: string;
  readonly fr: number;
  readonly ip: 0;
  readonly op: number;
  readonly w: number;
  readonly h: number;
  readonly nm: string;
  readonly ddd: 0;
  readonly assets: readonly ImageAsset[];
  readonly layers: readonly Layer[];
}
