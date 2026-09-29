import type { CoachMood } from '#shared/coach.ts';

// Where things are on each animation's timeline, for the player to drive it.

/** A stretch of frames, first to last. */
export type Segment = readonly [first: number, last: number];

export type Transition = `${CoachMood}>${CoachMood}`;

/** From one mood to another: every ordered pair of moods, never a mood to itself. */
export type Transitions = Partial<Record<Transition, Segment>>;

/** A mood's talking loop, and the frame each of its syllables ends on. */
export type TalkLoop = readonly [start: number, end: number, stops: readonly number[]];

export interface FaceMeta {
  /** The frame each mood's pose is held at. */
  readonly pose: Readonly<Record<CoachMood, number>>;
  readonly transitions: Transitions;
  readonly talk: Readonly<Record<CoachMood, TalkLoop>>;
}

export interface LidsMeta {
  readonly pose: Readonly<Record<CoachMood, number>>;
  readonly transitions: Transitions;
}

export interface BlinkMeta {
  readonly loop: number;
  readonly fps: number;
  /** Each blink's frames; a double blink counts as one. */
  readonly at: readonly Segment[];
}

export interface AnimationMeta {
  readonly face: FaceMeta;
  readonly lids: LidsMeta;
  readonly blink: BlinkMeta;
}

export const moodRecord = <T>(value: (mood: CoachMood) => T): Record<CoachMood, T> => ({
  neutral: value('neutral'),
  happy: value('happy'),
  delight: value('delight'),
  doubt: value('doubt'),
  worry: value('worry'),
  shock: value('shock'),
});

/** Each mood's pose: its first time round the circuit, a pose every `step` frames. */
export const poseFrames = (
  circuit: readonly CoachMood[],
  step: number,
): Record<CoachMood, number> => moodRecord(mood => circuit.indexOf(mood) * step);

/** Every transition along the circuit, a pose every `step` frames. */
export function transitions(circuit: readonly CoachMood[], step: number): Transitions {
  const segments: Transitions = {};
  for (const [k, mood] of circuit.entries()) {
    const previous = circuit[k - 1];
    if (previous !== undefined) segments[`${previous}>${mood}`] = [(k - 1) * step, k * step];
  }
  return segments;
}
