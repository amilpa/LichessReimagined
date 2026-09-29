// What the animations paint that no portrait shows, and their frame timing.

export const FPS = 60;
/** The portraits' size, which every rig coordinate is in. */
export const WIDTH = 300;
export const HEIGHT = 275;

export const INSIDE_COLOR = '#5b1f22';
export const TONGUE_COLOR = '#d9716f';
/** For the coaches whose portrait doesn't show their teeth. */
export const TEETH_COLOR = '#fdf6f1';
/** A shut eye's lash line. */
export const LASH_COLOR = '#3a2019';
export const LASH_WIDTH = 1.1;

/** Coach 2's lids are set by hand: her glasses sit where they'd be sampled. */
export const LID_SKIN: ReadonlyMap<number, readonly [string, string]> = new Map([
  [2, ['#f9b393', '#fcbb95']],
]);

/** The dark hooks at the corners of a smile, on the coaches who have them. */
export interface CurlStyle {
  /** How far a hook reaches in along the lips, and out past the corner. */
  readonly inner: number;
  readonly outer: number;
  /** How far it curls up. */
  readonly rise: number;
  readonly width: number;
  readonly color: string;
}

export const CURLS: ReadonlyMap<number, CurlStyle> = new Map([
  [1, { inner: 2.2, outer: 0.8, rise: 0.6, width: 0.8, color: '#8b492b' }],
  [3, { inner: 3, outer: 1.5, rise: 1.2, width: 0.9, color: '#8d3c23' }],
]);

export const FACE_STEP = 24;
export const LIDS_STEP = 18;

/**
 * A talking loop's syllables: frames, and how wide the mouth opens. Each ends
 * back on the pose, so talking can stop after any of them.
 */
export const SYLLABLES: readonly (readonly [frames: number, opening: number])[] = [
  [10, 0.7],
  [12, 1],
  [9, 0.4],
  [14, 1.2],
  [11, 0.6],
  [15, 0.9],
];

/** The blinks: an 11 s loop, at uneven frames, the second one double. */
export const BLINK_LOOP = 660;
export const BLINKS: readonly (readonly [frame: number, count: number])[] = [
  [84, 1],
  [310, 2],
  [520, 1],
];
/** A blink's length, and the gap between the two of a double one. */
export const BLINK_FRAMES = 14;
export const BLINK_GAP = 20;
