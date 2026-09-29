/** A point, in the units of whatever draws it (px, squares, viewBox units). */
export type Point = readonly [x: number, y: number];

/** A rectangle in window coordinates; a DOMRect is one. */
export interface Box {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

/** Space kept free on each side, in px (a chart's margins around its plot, for one). */
export interface Padding {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}
