import { COACH_MOODS } from '#shared/coach.ts';
import { blinkAnimation, blinkMeta } from './blink.ts';
import { eulerianCircuit } from './circuit.ts';
import { faceAnimation } from './face.ts';
import { lidsAnimation } from './lids.ts';
import type { AnimationMeta } from './meta.ts';
import type { CoachRig } from './rig.ts';
import type { Animation } from './types.ts';

// A coach's face as three Lottie animations, built from the features traced
// out of its portrait and played over its plate (the portrait with its brows
// and mouth painted out):
// - face: the brows and the mouth, every mood's pose and a transition between
//   any two, then a talking loop per mood;
// - lids: where the upper lids rest in each mood, on the same circuit;
// - blink: the blinks, on their own loop.

export interface CoachAnimations {
  readonly face: Animation;
  readonly lids: Animation;
  readonly blink: Animation;
  readonly meta: AnimationMeta;
}

export function buildCoachAnimations(rig: CoachRig, coach: number): CoachAnimations {
  const circuit = eulerianCircuit(COACH_MOODS);
  const face = faceAnimation(rig, coach, circuit);
  const lids = lidsAnimation(rig, coach, circuit);
  return {
    face: face.animation,
    lids: lids.animation,
    blink: blinkAnimation(rig, coach),
    meta: { face: face.meta, lids: lids.meta, blink: blinkMeta() },
  };
}
