import type { CoachMood } from '#shared/coach.ts';
import { FACE_STEP, INSIDE_COLOR, SYLLABLES, type CurlStyle } from './constants.ts';
import { hexToRgb, mixRgb } from './geometry.ts';
import type { TalkLoop } from './meta.ts';
import { mouthShapes, type MouthPart } from './mouth.ts';
import {
  BROW_POSES,
  MOUTH_POSES,
  REST_MOUTH,
  SMILES,
  TALK_OPENING,
  type MouthPose,
} from './poses.ts';
import { SIDES, type CoachRig } from './rig.ts';
import { KeyLists, type Key } from './track.ts';
import type { BezierPath, Vector } from './types.ts';

// The face's keys, pose by pose: the mouth's shapes and color, and the brows.

export interface FaceKeys {
  readonly mouth: KeyLists<MouthPart, BezierPath>;
  readonly insideColor: Key<Vector>[];
  readonly curlOpacity: Key<number>[];
  readonly browPositions: readonly [Key<Vector>[], Key<Vector>[]];
  readonly browTurns: readonly [Key<number>[], Key<number>[]];
}

export interface FaceWriter {
  readonly rig: CoachRig;
  readonly curl: CurlStyle | null;
  readonly keys: FaceKeys;
}

export const createFaceKeys = (): FaceKeys => ({
  mouth: new KeyLists(),
  insideColor: [],
  curlOpacity: [],
  browPositions: [[], []],
  browTurns: [[], []],
});

interface PoseOptions {
  readonly mood: CoachMood;
  /** Changes to the mood's own mouth pose. */
  readonly mouth?: Partial<MouthPose>;
  /** How far the brows lift over the mood's (negative is up); null leaves them out. */
  readonly browLift?: number | null;
}

function writeBrows({ rig, keys }: FaceWriter, frame: number, mood: CoachMood, lift: number): void {
  for (const side of SIDES) {
    const [centerX, centerY] = rig.brows[side].center;
    const { offsetY, tilt } = BROW_POSES[mood][side];
    keys.browPositions[side].push([frame, [centerX, centerY + offsetY + lift, 0]]);
    // The inner end is towards the nose: up is anticlockwise on the left.
    keys.browTurns[side].push([frame, side === 0 ? -tilt : tilt]);
  }
}

function writePose(writer: FaceWriter, frame: number, options: PoseOptions): void {
  const { mood, mouth = {}, browLift = 0 } = options;
  const { rig, curl, keys } = writer;
  const pose: MouthPose = { ...REST_MOUTH, ...MOUTH_POSES[mood], ...mouth };
  for (const [part, shape] of mouthShapes({ mouth: rig.mouth, pose, curl })) {
    keys.mouth.add(part, frame, shape);
  }
  // A thin mouth line has the portrait's color, an open mouth is dark.
  const line = hexToRgb(rig.mouth.colors.line ?? INSIDE_COLOR);
  const openness = Math.min(1, (pose.open + pose.raise) / 3.5);
  keys.insideColor.push([frame, [...mixRgb(line, hexToRgb(INSIDE_COLOR), openness), 1]]);
  // The corners' hooks belong to a smile.
  keys.curlOpacity.push([frame, SMILES.has(mood) ? 100 : 0]);
  if (browLift !== null) writeBrows(writer, frame, mood, browLift);
}

/** Every mood's pose along the circuit, one every FACE_STEP frames. */
export function writeCircuit(writer: FaceWriter, circuit: readonly CoachMood[]): void {
  for (const [k, mood] of circuit.entries()) writePose(writer, k * FACE_STEP, { mood });
}

/** A syllable's mouth: the jaw drops and the lips part, less so for a shut mouth (doubt, worry). */
const syllableMouth = (rest: MouthPose, amplitude: number): Partial<MouthPose> => ({
  open: rest.open + amplitude * 2.4,
  width: rest.width * (1 - 0.04 * amplitude),
  close: rest.close * (1 - 0.35 * amplitude),
  round: Math.min(1, rest.round + 0.15),
});

/** A mood's talking loop from `start`; the brows lift on the stressed syllables only. */
export function writeTalkLoop(writer: FaceWriter, mood: CoachMood, start: number): TalkLoop {
  const rest: MouthPose = { ...REST_MOUTH, ...MOUTH_POSES[mood] };
  const stops: number[] = [];
  let frame = start;
  writePose(writer, frame, { mood });
  for (const [frames, opening] of SYLLABLES) {
    const amplitude = opening * (TALK_OPENING[mood] ?? 1);
    const stressed = amplitude >= 1;
    if (stressed) writePose(writer, frame, { mood });
    writePose(writer, frame + frames * 0.45, {
      mood,
      mouth: syllableMouth(rest, amplitude),
      browLift: stressed ? -0.7 : null,
    });
    frame += frames;
    writePose(writer, frame, { mood, browLift: stressed ? 0 : null });
    stops.push(frame);
  }
  return [start, frame, stops];
}
