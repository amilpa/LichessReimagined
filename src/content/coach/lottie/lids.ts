import type { CoachMood } from '#shared/coach.ts';
import { LASH_COLOR, LASH_WIDTH, LIDS_STEP } from './constants.ts';
import { lidShapes, lidSkin } from './lid.ts';
import { poseFrames, transitions, type LidsMeta } from './meta.ts';
import { LID_POSES } from './poses.ts';
import { animation, group, shapeLayer, stroke } from './primitives.ts';
import { SIDES, type CoachRig } from './rig.ts';
import { easeOut, numberTrack, pathTrack, type Key } from './track.ts';
import type { Animation, BezierPath } from './types.ts';

// The upper lids: where they rest in each mood, with their outline morphed
// between moods. A blunder gets a double take, a mistake a slow blink.

interface LidKeys {
  readonly lid: Key<BezierPath>[];
  readonly edge: Key<BezierPath>[];
  readonly lash: Key<number>[];
}

type LidPair = readonly [number, number];

function circuitKeys(rig: CoachRig, circuit: readonly CoachMood[]): readonly [LidKeys, LidKeys] {
  const keys: readonly [LidKeys, LidKeys] = [
    { lid: [], edge: [], lash: [] },
    { lid: [], edge: [], lash: [] },
  ];
  const write = (frame: number, closed: LidPair): void => {
    for (const side of SIDES) {
      const { lid, edge } = lidShapes(rig.eyes[side], closed[side]);
      keys[side].lid.push([frame, lid]);
      keys[side].edge.push([frame, edge]);
      // The lash line shows as the lid comes down.
      keys[side].lash.push([frame, Math.min(1, closed[side] / 0.22) * 100]);
    }
  };
  for (const [k, mood] of circuit.entries()) {
    const frame = k * LIDS_STEP;
    if (k > 0 && mood === 'shock') {
      write(frame - LIDS_STEP * 0.6, [1, 1]);
      write(frame - LIDS_STEP * 0.3, LID_POSES[mood]);
    } else if (k > 0 && mood === 'worry') {
      write(frame - LIDS_STEP * 0.5, [0.9, 0.9]);
    }
    write(frame, LID_POSES[mood]);
  }
  return keys;
}

export function lidsAnimation(
  rig: CoachRig,
  coach: number,
  circuit: readonly CoachMood[],
): { readonly animation: Animation; readonly meta: LidsMeta } {
  const keys = circuitKeys(rig, circuit);
  const end = circuit.length * LIDS_STEP + 1;
  const layers = SIDES.map(side => {
    const { lid, edge, lash } = keys[side];
    const lashLine = stroke({
      color: LASH_COLOR,
      width: LASH_WIDTH,
      opacity: numberTrack(lash, easeOut),
    });
    return shapeLayer({
      name: `lid ${side}`,
      index: side + 1,
      end,
      shapes: [
        group([{ ty: 'sh', ks: pathTrack(edge, easeOut) }, lashLine]),
        group([{ ty: 'sh', ks: pathTrack(lid, easeOut) }, lidSkin(rig.eyes[side], coach)]),
      ],
    });
  });
  return {
    animation: animation({ name: `coach ${coach} lids`, layers, end }),
    meta: {
      pose: poseFrames(circuit, LIDS_STEP),
      transitions: transitions(circuit, LIDS_STEP),
    },
  };
}
