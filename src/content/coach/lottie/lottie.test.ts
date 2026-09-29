import { describe, expect, it } from 'vitest';
import { COACH_MOODS } from '#shared/coach.ts';
import type { Point } from '#shared/geometry.ts';
import { canonicalJson, sha256Hex } from '#shared/testing/digest.ts';
import { buildCoachAnimations } from './build.ts';
import { eulerianCircuit } from './circuit.ts';
import { CURLS } from './constants.ts';
import { hexToRgb, openPath, outline, spline } from './geometry.ts';
import { lidShapes } from './lid.ts';
import { mouthShapes } from './mouth.ts';
import { MOUTH_POSES, REST_MOUTH, type MouthPose } from './poses.ts';
import { RigFileSchema, type CoachRig } from './rig.ts';
import { easeOut, numberTrack, pathTrack, vectorTrack } from './track.ts';
// The rig the original builder ran on, what it built from it (a SHA-256 of
// each animation, in canonical JSON, and the timeline in full), and what its
// helpers returned on the inputs below.
import rigFile from './fixtures/rig.json' with { type: 'json' };
import legacy from './fixtures/legacy.json' with { type: 'json' };
import helpers from './fixtures/legacy-helpers.json' with { type: 'json' };

const rigs = RigFileSchema.parse(rigFile);

function rigOf(coach: number): CoachRig {
  const rig = rigs[String(coach)];
  if (!rig) throw new Error(`no rig for coach ${coach}`);
  return rig;
}

/** How many objects are reachable more than once: lottie-web breaks on shared ones. */
function sharedObjects(roots: readonly unknown[]): number {
  const seen = new Set<object>();
  let shared = 0;
  const visit = (value: unknown): void => {
    if (typeof value !== 'object' || value === null) return;
    if (seen.has(value)) {
      shared += 1;
      return;
    }
    seen.add(value);
    for (const child of Object.values(value)) visit(child);
  };
  for (const root of roots) visit(root);
  return shared;
}

const posed = (pose: Partial<MouthPose>): MouthPose => ({ ...REST_MOUTH, ...pose });
const { top, bottom } = helpers.inputs;
const topPoints = top.map(([x = 0, y = 0]): Point => [x, y]);
const bottomPoints = bottom.map(([x = 0, y = 0]): Point => [x, y]);

describe('buildCoachAnimations', () => {
  it.each(Object.entries(legacy.coaches))(
    'builds what the original built for coach %s',
    async (key, expected) => {
      const coach = Number(key);
      const built = buildCoachAnimations(rigOf(coach), coach);
      expect(await sha256Hex(canonicalJson(built.face))).toBe(expected.face);
      expect(await sha256Hex(canonicalJson(built.lids))).toBe(expected.lids);
      expect(await sha256Hex(canonicalJson(built.blink))).toBe(expected.blink);
      const { face, lids, blink } = expected.meta;
      // The original named the transitions `trans`.
      expect(built.meta).toEqual({
        face: { pose: face.pose, transitions: face.trans, talk: face.talk },
        lids: { pose: lids.pose, transitions: lids.trans },
        blink,
      });
      expect(built.face.layers.map(layer => layer.nm)).toEqual(expected.layers.face);
    },
  );

  it('shares no object within or between the animations', () => {
    const { face, lids, blink } = buildCoachAnimations(rigOf(1), 1);
    expect(sharedObjects([face, lids, blink])).toBe(0);
    const reused = { x: [1] };
    expect(sharedObjects([{ a: reused }, [reused]])).toBe(1);
  });
});

describe('RigFileSchema', () => {
  // As extract.py writes it.
  const written = rigFile['1'];

  it('names the mouth curves in full', () => {
    const { curves } = rigOf(1).mouth;
    expect(curves).toEqual({
      upperTop: written.mouth.curves.up,
      openingTop: written.mouth.curves.ot,
      openingBottom: written.mouth.curves.ob,
      lowerBottom: written.mouth.curves.lo,
    });
  });

  it.each([
    [
      'a mouth curve of another length',
      { ...written, mouth: { ...written.mouth, curves: { ...written.mouth.curves, lo: [1, 2] } } },
    ],
    [
      'a color that is not #rrggbb',
      { ...written, mouth: { ...written.mouth, colors: { teeth: 'white', line: null } } },
    ],
    ['a third brow', { ...written, brows: [...written.brows, written.brows[0]] }],
    [
      'an eye without its bottom',
      { ...written, eyes: [{ ...written.eyes[0], bottom: [] }, written.eyes[1]] },
    ],
  ])('refuses %s', (_, broken) => {
    expect(RigFileSchema.safeParse({ 1: written }).success).toBe(true);
    expect(RigFileSchema.safeParse({ 1: broken }).success).toBe(false);
  });
});

describe('eulerianCircuit', () => {
  it('goes through every ordered pair once, as the original did', () => {
    expect(eulerianCircuit(['a', 'b', 'c'])).toEqual(helpers.circuitLetters);
    const circuit = eulerianCircuit(COACH_MOODS);
    expect(circuit).toEqual(helpers.circuitMoods);
    const pairs = circuit.slice(1).map((mood, i) => `${circuit[i]}>${mood}`);
    expect(new Set(pairs).size).toBe(COACH_MOODS.length * (COACH_MOODS.length - 1));
    expect(pairs).toHaveLength(COACH_MOODS.length * (COACH_MOODS.length - 1));
  });

  it('is empty without nodes', () => {
    expect(eulerianCircuit([])).toEqual([]);
  });
});

describe('geometry', () => {
  it('draws the splines and outlines the original drew', () => {
    const { ins, outs } = spline(topPoints);
    expect(canonicalJson([ins, outs])).toBe(canonicalJson(helpers.spline));
    const short = spline([
      [0, 0],
      [3, 4],
    ]);
    expect(canonicalJson([short.ins, short.outs])).toBe(canonicalJson(helpers.spline2));
    expect(canonicalJson(outline(topPoints, bottomPoints))).toBe(canonicalJson(helpers.outline));
    expect(canonicalJson(openPath(topPoints))).toBe(canonicalJson(helpers.openPath));
  });

  it('keeps an open curve sharp at its ends', () => {
    const { ins, outs } = spline(topPoints);
    expect([ins[0], outs[0], ins.at(-1), outs.at(-1)].flat().every(value => value === 0)).toBe(
      true,
    );
  });

  it('reads #rrggbb colors as 0 to 1', () => {
    expect(hexToRgb('#de8664')).toEqual(helpers.rgb);
    expect(hexToRgb('#ff0000')).toEqual([1, 0, 0]);
  });
});

describe('tracks', () => {
  it('keys a property as the original did', () => {
    const numbers = numberTrack([
      [0, 5],
      [10.004, 7],
      [3.456, 1],
      [10.001, 9],
      [20, 5],
    ]);
    expect(canonicalJson(numbers)).toBe(canonicalJson(helpers.trackNumbers));
    expect(
      canonicalJson(
        vectorTrack([
          [0, [1, 2]],
          [5, [1, 2]],
          [9, [1, 2]],
        ]),
      ),
    ).toBe(canonicalJson(helpers.trackSame));
    const vectors = vectorTrack(
      [
        [4, [100, 0, 100]],
        [0, [100, 100, 100]],
      ],
      easeOut,
    );
    expect(canonicalJson(vectors)).toBe(canonicalJson(helpers.trackVectors));
    const paths = pathTrack([
      [0, openPath(topPoints)],
      [6, openPath(bottomPoints)],
    ]);
    expect(canonicalJson(paths)).toBe(canonicalJson(helpers.trackShapes));
  });

  it('keeps one key per hundredth of a frame, the last written', () => {
    expect(
      numberTrack([
        [1, 3],
        [1.001, 4],
        [2, 5],
      ]),
    ).toMatchObject({
      a: 1,
      k: [
        { t: 1, s: [4] },
        { t: 2, s: [5] },
      ],
    });
  });

  it('refuses a property without keys', () => {
    expect(() => numberTrack([])).toThrow(RangeError);
  });
});

const shapesOf = (coach: number, pose: Partial<MouthPose>): Map<string, unknown> =>
  mouthShapes({ mouth: rigOf(coach).mouth, pose: posed(pose), curl: CURLS.get(coach) ?? null });
const shapes = (coach: number, pose: Partial<MouthPose>): string =>
  canonicalJson(Object.fromEntries(shapesOf(coach, pose)));

describe('features in a pose', () => {
  it('shapes the mouth as the original did', () => {
    expect(shapes(1, MOUTH_POSES.shock)).toBe(canonicalJson(helpers.mouthShock1));
    expect(shapes(3, MOUTH_POSES.happy)).toBe(canonicalJson(helpers.mouthHappy3));
    const talking = { ...MOUTH_POSES.doubt, open: 2.1, width: 0.8, close: 0.7, round: 0.15 };
    expect(shapes(3, talking)).toBe(canonicalJson(helpers.mouthDoubt3Talking));
  });

  it('gives the corners hooks on the coaches who have them only', () => {
    expect([...shapesOf(1, {}).keys()]).toEqual([
      'upper',
      'lower',
      'inside',
      'teeth',
      'tongue',
      'curlL',
      'curlR',
    ]);
    expect([...shapesOf(2, {}).keys()]).toEqual(['upper', 'lower', 'inside', 'teeth', 'tongue']);
  });

  it('shapes the lids as the original did', () => {
    const doubt = lidShapes(rigOf(2).eyes[1], 0.42);
    expect(canonicalJson([doubt.lid, doubt.edge])).toBe(canonicalJson(helpers.lidsDoubt2));
    const shut = lidShapes(rigOf(4).eyes[0], 1);
    expect(canonicalJson([shut.lid, shut.edge])).toBe(canonicalJson(helpers.lidsShut4));
  });
});
