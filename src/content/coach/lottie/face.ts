import { COACH_MOODS, type CoachMood } from '#shared/coach.ts';
import {
  CURLS,
  FACE_STEP,
  INSIDE_COLOR,
  SYLLABLES,
  TEETH_COLOR,
  TONGUE_COLOR,
  type CurlStyle,
} from './constants.ts';
import { createFaceKeys, writeCircuit, writeTalkLoop, type FaceKeys } from './face-poses.ts';
import { valueAt } from './geometry.ts';
import { moodRecord, poseFrames, transitions, type FaceMeta } from './meta.ts';
import type { MouthPart } from './mouth.ts';
import {
  animation,
  fill,
  group,
  imageLayer,
  shapeLayer,
  stroke,
  verticalGradient,
} from './primitives.ts';
import type { CoachRig, RigMouth, Side } from './rig.ts';
import { numberTrack, pathTrack, still, vectorTrack } from './track.ts';
import type {
  Animation,
  GradientFillItem,
  ImageAsset,
  ImageLayer,
  Layer,
  ShapeItem,
  ShapeLayer,
} from './types.ts';

// The face: the brows and the mouth. Every mood's pose along the circuit,
// then a talking loop per mood.

const TALK_FRAMES = SYLLABLES.reduce((sum, [frames]) => sum + frames, 0);

function lipShade(mouth: RigMouth, lip: 'upper' | 'lower'): GradientFillItem {
  const { curves, shade } = mouth;
  const middle = Math.floor(curves.upperTop.length / 2);
  if (lip === 'upper') {
    const [from, to] = [valueAt(curves.upperTop, middle), valueAt(curves.openingTop, middle)];
    return verticalGradient({ colors: shade.upper, offsets: [0.15, 0.5, 0.85], from, to });
  }
  const [from, to] = [valueAt(curves.openingBottom, middle), valueAt(curves.lowerBottom, middle)];
  return verticalGradient({ colors: shade.lower, offsets: [0.2, 0.4, 0.6, 0.8, 0.92], from, to });
}

interface LayerContext {
  readonly rig: CoachRig;
  readonly keys: FaceKeys;
  readonly end: number;
}

/** A brow sprite, drawn at 2x, turning about its middle. */
function browLayer({ rig, keys, end }: LayerContext, side: Side): ImageLayer {
  const brow = rig.brows[side];
  const [centerX, centerY] = brow.center;
  return imageLayer({
    name: side === 0 ? 'brow L' : 'brow R',
    index: side + 1,
    asset: `brow${side}`,
    end,
    transform: {
      o: still(100),
      r: numberTrack(keys.browTurns[side]),
      p: vectorTrack(keys.browPositions[side]),
      a: still([(centerX - brow.x) * 2, (centerY - brow.y) * 2, 0]),
      s: still([50, 50, 100]),
    },
  });
}

interface MouthLayerOptions {
  readonly name: string;
  readonly index: number;
  readonly part: MouthPart;
  readonly paint: ShapeItem;
}

function mouthLayer(
  context: LayerContext,
  { name, index, part, paint }: MouthLayerOptions,
): ShapeLayer {
  const path: ShapeItem = { ty: 'sh', ks: pathTrack(context.keys.mouth.get(part)) };
  return shapeLayer({ name, index, end: context.end, shapes: [group([path, paint])] });
}

/** The corners' hooks, above the lips: Lottie draws its first layer on top. */
function curlLayers(context: LayerContext, curl: CurlStyle | null): ShapeLayer[] {
  if (!curl) return [];
  const hook = (part: MouthPart, index: number): ShapeLayer => {
    const opacity = numberTrack(context.keys.curlOpacity);
    const paint = stroke({ color: curl.color, width: curl.width, opacity });
    return mouthLayer(context, { name: part, index, part, paint });
  };
  return [hook('curlR', 9), hook('curlL', 8)];
}

function faceLayers(context: LayerContext, curl: CurlStyle | null): Layer[] {
  const { rig, keys } = context;
  const inside = { ...fill(INSIDE_COLOR), c: vectorTrack(keys.insideColor) };
  const teeth = fill(rig.mouth.colors.teeth ?? TEETH_COLOR);
  return [
    browLayer(context, 0),
    browLayer(context, 1),
    ...curlLayers(context, curl),
    mouthLayer(context, {
      name: 'upper lip',
      index: 3,
      part: 'upper',
      paint: lipShade(rig.mouth, 'upper'),
    }),
    mouthLayer(context, {
      name: 'lower lip',
      index: 4,
      part: 'lower',
      paint: lipShade(rig.mouth, 'lower'),
    }),
    mouthLayer(context, { name: 'teeth', index: 5, part: 'teeth', paint: teeth }),
    mouthLayer(context, { name: 'tongue', index: 6, part: 'tongue', paint: fill(TONGUE_COLOR) }),
    mouthLayer(context, { name: 'inside', index: 7, part: 'inside', paint: inside }),
  ];
}

const browAssets = ({ brows }: CoachRig): ImageAsset[] =>
  brows.map((brow, side) => ({
    id: `brow${side}`,
    w: brow.w * 2,
    h: brow.h * 2,
    u: '',
    p: `data:image/png;base64,${brow.png}`,
    e: 1,
  }));

export function faceAnimation(
  rig: CoachRig,
  coach: number,
  circuit: readonly CoachMood[],
): { readonly animation: Animation; readonly meta: FaceMeta } {
  const curl = CURLS.get(coach) ?? null;
  const writer = { rig, curl, keys: createFaceKeys() };
  writeCircuit(writer, circuit);
  // Each mood's loop in turn, a frame apart so that no two share a keyframe.
  const talkStart = circuit.length * FACE_STEP;
  const loopStart = (mood: CoachMood): number =>
    talkStart + COACH_MOODS.indexOf(mood) * (TALK_FRAMES + 1);
  const talk = moodRecord(mood => writeTalkLoop(writer, mood, loopStart(mood)));
  const end = talkStart + COACH_MOODS.length * (TALK_FRAMES + 1) + 1;
  const layers = faceLayers({ rig, keys: writer.keys, end }, curl);
  return {
    animation: animation({ name: `coach ${coach} face`, layers, end, assets: browAssets(rig) }),
    meta: {
      pose: poseFrames(circuit, FACE_STEP),
      transitions: transitions(circuit, FACE_STEP),
      talk,
    },
  };
}
