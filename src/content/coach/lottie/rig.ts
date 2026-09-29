import { z } from 'zod/mini';

// public/img/coaches/rig.json: the features tools/coach-rig/extract.py traced
// out of each coach's portrait, in the portrait's pixels, by coach number. Only
// what the animations use is read.

const HexColorSchema = z.string().check(z.regex(/^#[0-9a-f]{6}$/i));
const PairSchema = z.tuple([z.number(), z.number()]);
const SamplesSchema = z.array(z.number()).check(z.minLength(2));

const sameLength = (lists: readonly (readonly number[])[]): boolean =>
  lists.every(list => list.length === lists[0]?.length);

// Corner to corner: the upper lip's top, the opening's top and bottom, the
// lower lip's bottom. rig.json keeps extract.py's short keys.
const MouthCurvesSchema = z.pipe(
  z
    .object({ up: SamplesSchema, ot: SamplesSchema, ob: SamplesSchema, lo: SamplesSchema })
    .check(z.refine(({ up, ot, ob, lo }) => sameLength([up, ot, ob, lo]))),
  z.transform(({ up, ot, ob, lo }) => ({
    upperTop: up,
    openingTop: ot,
    openingBottom: ob,
    lowerBottom: lo,
  })),
);

const MouthSchema = z.object({
  // The corners' x, then their y.
  x: PairSchema,
  y: PairSchema,
  curves: MouthCurvesSchema,
  // Null where the portrait doesn't show them.
  colors: z.object({ teeth: z.nullable(HexColorSchema), line: z.nullable(HexColorSchema) }),
  // Each lip's shading, top to bottom.
  shade: z.object({
    upper: z.tuple([HexColorSchema, HexColorSchema, HexColorSchema]),
    lower: z.tuple([
      HexColorSchema,
      HexColorSchema,
      HexColorSchema,
      HexColorSchema,
      HexColorSchema,
    ]),
  }),
});

/** A brow sprite: its box, the point it turns about, and the PNG, drawn at 2x. */
const BrowSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  center: PairSchema,
  png: z.string(),
});

/** An eye, corner to corner: the top of the eye and its lower lid, and the lid's skin. */
const EyeSchema = z
  .object({
    x: SamplesSchema,
    top: SamplesSchema,
    bottom: SamplesSchema,
    skin: z.tuple([HexColorSchema, HexColorSchema]),
  })
  .check(z.refine(({ x, top, bottom }) => sameLength([x, top, bottom])));

/** Each pair is the portrait's left, then its right. */
const CoachRigSchema = z.object({
  mouth: MouthSchema,
  brows: z.tuple([BrowSchema, BrowSchema]),
  eyes: z.tuple([EyeSchema, EyeSchema]),
});

export const RigFileSchema = z.record(z.string(), CoachRigSchema);

export type CoachRig = z.infer<typeof CoachRigSchema>;
export type RigMouth = CoachRig['mouth'];
export type RigEye = CoachRig['eyes'][number];
export type RigFile = z.infer<typeof RigFileSchema>;

/** The portrait's left, then its right. */
export type Side = 0 | 1;
export const SIDES: readonly Side[] = [0, 1];
