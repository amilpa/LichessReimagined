import {
  BLINK_FRAMES,
  BLINK_GAP,
  BLINK_LOOP,
  BLINKS,
  FPS,
  LASH_COLOR,
  LASH_WIDTH,
} from './constants.ts';
import { lidShapes, lidSkin } from './lid.ts';
import type { BlinkMeta } from './meta.ts';
import { animation, group, shapeLayer, stillTransform, stroke } from './primitives.ts';
import { SIDES, type CoachRig, type Side } from './rig.ts';
import { easeOut, numberTrack, still, vectorTrack, type Key } from './track.ts';
import type { Animation, ShapeLayer, Vector } from './types.ts';

// The blinks: a shut lid over each eye, dropping from the top of the eye and
// back, on a loop of its own so the coach blinks whatever it's doing. It
// drops fast enough that its squashed in-betweens don't show.

interface BlinkKeys {
  /** The lid's scale, flat (open) or full (shut). */
  readonly scale: Key<Vector>[];
  readonly lash: Key<number>[];
}

function blinkKeys(): BlinkKeys {
  const scale: Key<Vector>[] = [[0, [100, 0, 100]]];
  const lash: Key<number>[] = [[0, 0]];
  for (const [first, count] of BLINKS) {
    for (let i = 0; i < count; i++) {
      const start = first + i * BLINK_GAP;
      const end = start + BLINK_FRAMES;
      scale.push([start, [100, 0, 100]], [start + 4, [100, 100, 100]]);
      scale.push([start + 6, [100, 100, 100]], [end, [100, 0, 100]]);
      // An open lid is a line along the top of the eye, so its lash is hidden.
      lash.push([start, 0], [start + 2, 100], [start + 10, 100], [end, 0]);
    }
  }
  scale.push([BLINK_LOOP, [100, 0, 100]]);
  lash.push([BLINK_LOOP, 0]);
  return { scale, lash };
}

function blinkLayer(rig: CoachRig, coach: number, side: Side): ShapeLayer {
  const eye = rig.eyes[side];
  const { lid, edge } = lidShapes(eye, 1);
  const { scale, lash } = blinkKeys();
  const top = Math.min(...eye.top);
  const centerX = eye.x.reduce((sum, x) => sum + x) / eye.x.length;
  const lashLine = stroke({
    color: LASH_COLOR,
    width: LASH_WIDTH,
    opacity: numberTrack(lash, easeOut),
  });
  return shapeLayer({
    name: `blink ${side}`,
    index: side + 1,
    end: BLINK_LOOP + 1,
    shapes: [
      group([{ ty: 'sh', ks: still(edge) }, lashLine]),
      group([{ ty: 'sh', ks: still(lid) }, lidSkin(eye, coach)]),
    ],
    transform: {
      ...stillTransform(),
      p: still([centerX, top, 0]),
      a: still([centerX, top, 0]),
      s: vectorTrack(scale, easeOut),
    },
  });
}

export const blinkAnimation = (rig: CoachRig, coach: number): Animation =>
  animation({
    name: `coach ${coach} blink`,
    layers: SIDES.map(side => blinkLayer(rig, coach, side)),
    end: BLINK_LOOP + 1,
  });

/** The loop, and each blink's frames, for the player to play them one at a time. */
export const blinkMeta = (): BlinkMeta => ({
  loop: BLINK_LOOP,
  fps: FPS,
  at: BLINKS.map(([first, count]) => [first, first + (count - 1) * BLINK_GAP + BLINK_FRAMES]),
});
