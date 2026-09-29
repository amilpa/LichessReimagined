import type {
  BezierPath,
  Easing,
  Keyframe,
  NumberProperty,
  PathProperty,
  Property,
  Vector,
  VectorProperty,
} from './types.ts';

// Properties built from [frame, value] keys. Every object is made fresh:
// lottie-web rewrites the data it's given, and breaks on shared objects.

export type Key<T> = readonly [frame: number, value: T];

export type EasingFactory = () => Easing;

const easeInOut: EasingFactory = () => ({
  o: { x: [0.42], y: [0] },
  i: { x: [0.58], y: [1] },
});

export const easeOut: EasingFactory = () => ({
  o: { x: [0.2], y: [0.6] },
  i: { x: [0.4], y: [1] },
});

export const still = <T>(value: T): { readonly a: 0; readonly k: T } => ({ a: 0, k: value });

/**
 * Keys sorted by frame (rounded to a hundredth), one per frame, where the last
 * one written wins. A property that never changes is written as still.
 */
function track<Value, KeyframeValue>(
  keys: readonly Key<Value>[],
  keyframeValue: (value: Value) => KeyframeValue,
  easing: EasingFactory,
): Property<Value, KeyframeValue> {
  const byFrame = new Map<number, Value>();
  for (const [frame, value] of keys) byFrame.set(Math.round(frame * 100) / 100, value);
  const sorted = [...byFrame].toSorted(([first], [second]) => first - second);
  const [head] = sorted;
  if (head === undefined) throw new RangeError('a track needs a key');
  if (new Set(sorted.map(([, value]) => JSON.stringify(value))).size === 1) return still(head[1]);
  const last = sorted.length - 1;
  return {
    a: 1,
    k: sorted.map(([frame, value], index): Keyframe<KeyframeValue> => {
      if (index === last) return { t: frame, s: keyframeValue(value) };
      const handles = easing();
      return { t: frame, s: keyframeValue(value), o: handles.o, i: handles.i };
    }),
  };
}

export const numberTrack = (
  keys: readonly Key<number>[],
  easing: EasingFactory = easeInOut,
): NumberProperty => track(keys, value => [value], easing);

export const vectorTrack = (
  keys: readonly Key<Vector>[],
  easing: EasingFactory = easeInOut,
): VectorProperty => track(keys, value => [...value], easing);

export const pathTrack = (
  keys: readonly Key<BezierPath>[],
  easing: EasingFactory = easeInOut,
): PathProperty => track(keys, value => [value], easing);

/** Keys for several properties of one kind, by name, in the order written. */
export class KeyLists<Name extends string, Value> {
  readonly #lists = new Map<Name, Key<Value>[]>();

  add(name: Name, frame: number, value: Value): void {
    const list = this.#lists.get(name);
    if (list) list.push([frame, value]);
    else this.#lists.set(name, [[frame, value]]);
  }

  get(name: Name): readonly Key<Value>[] {
    return this.#lists.get(name) ?? [];
  }
}
