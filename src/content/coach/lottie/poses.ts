import type { CoachMood } from '#shared/coach.ts';

// How each mood moves the portrait's features, in its pixels. At rest every
// feature is the portrait's own, so the neutral face is the portrait itself.

export interface MouthPose {
  /** The mouth's width, as a share of the portrait's. */
  readonly width: number;
  /** Moves both corners up (negative) or down; `liftLeft` / `liftRight` move one. */
  readonly lift: number;
  readonly liftLeft: number;
  readonly liftRight: number;
  /** The middle pushed sideways. */
  readonly shift: number;
  /** The middle dipping (positive, as in a smile) or rising. */
  readonly bend: number;
  /** How much of the painted opening shuts, 0 to 1. */
  readonly close: number;
  /** The jaw dropping. */
  readonly open: number;
  /** The upper lip going up. */
  readonly raise: number;
  /** The opening from flat (0) to an ellipse (1). */
  readonly round: number;
  /** How far the teeth show under the upper lip; null lets the mouth decide. */
  readonly teeth: number | null;
  readonly tongue: number;
  /** Each lip's thickness, as a share of the portrait's. */
  readonly upperLip: number;
  readonly lowerLip: number;
}

export const REST_MOUTH: MouthPose = {
  width: 1,
  lift: 0,
  liftLeft: 0,
  liftRight: 0,
  shift: 0,
  bend: 0,
  close: 0,
  open: 0,
  raise: 0,
  round: 0,
  teeth: null,
  tongue: 0,
  upperLip: 1,
  lowerLip: 1,
};

export const MOUTH_POSES: Readonly<Record<CoachMood, Partial<MouthPose>>> = {
  neutral: {},
  happy: { width: 1.05, lift: -1.3, bend: 0.4, open: 0.8 },
  delight: {
    width: 1.1,
    lift: -2.2,
    bend: 0.6,
    open: 5,
    raise: 0.8,
    round: 0.25,
    tongue: 2,
    lowerLip: 0.85,
  },
  doubt: { width: 0.84, close: 1, liftLeft: -2, liftRight: 1, shift: 1.6, lowerLip: 1.05 },
  worry: { width: 0.86, close: 0.8, lift: 3.4, bend: -2.2, lowerLip: 1.1 },
  shock: {
    width: 0.5,
    lift: 0.6,
    open: 9,
    raise: 1.6,
    round: 1,
    teeth: 1.3,
    tongue: 2,
    upperLip: 0.8,
    lowerLip: 0.8,
  },
};

/** A brow sprite moved up (negative) or down, its inner end tilted up by `tilt` degrees. */
export interface BrowPose {
  readonly offsetY: number;
  readonly tilt: number;
}

const brow = (offsetY: number, tilt = 0): BrowPose => ({ offsetY, tilt });

export const BROW_POSES: Readonly<Record<CoachMood, readonly [BrowPose, BrowPose]>> = {
  neutral: [brow(0), brow(0)],
  happy: [brow(-1.3), brow(-1.3)],
  delight: [brow(-3.2, 2), brow(-3.2, 2)],
  doubt: [brow(-3.8, -5), brow(1.3, -8)],
  worry: [brow(-1.2, 12), brow(-1.2, 12)],
  shock: [brow(-4.4, 4), brow(-4.4, 4)],
};

/** How closed each upper lid rests, 0 open to 1 shut. */
export const LID_POSES: Readonly<Record<CoachMood, readonly [number, number]>> = {
  neutral: [0, 0],
  happy: [0.1, 0.1],
  delight: [0.38, 0.38],
  doubt: [0, 0.42],
  worry: [0.24, 0.24],
  shock: [0, 0],
};

/** How wide a talking mouth opens: a grin or an "O" is open already. */
export const TALK_OPENING: Readonly<Partial<Record<CoachMood, number>>> = {
  delight: 0.6,
  shock: 0.45,
};

/** The moods whose mouth is a smile, which shows the corners' hooks. */
export const SMILES: ReadonlySet<CoachMood> = new Set(['neutral', 'happy', 'delight']);
