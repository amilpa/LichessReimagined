// The blog carousel's drag, in pixels along its track: a slot is a card and
// the gap after it, an offset how far the cards are dragged (negative leftward).

// How far a release's speed carries the cards on, up to under half a card: a
// flick steps at most one card past where the pointer let go.
const FLICK_MS = 200;
const FLICK_REACH = 0.45;

const modulo = (value: number, divisor: number): number => ((value % divisor) + divisor) % divisor;

/**
 * How far the card at `index` moves for `offset`, looping round so the track
 * never runs out: a card wraps one slot left of the track, out of sight on both
 * sides as long as some card is hidden.
 */
export function loopedShift(index: number, offset: number, slot: number, count: number): number {
  const home = index * slot;
  return modulo(home + offset + slot, slot * count) - slot - home;
}

/** How many cards a release steps by, from its offset and speed (px/ms): positive goes to the next. */
export function stepsOnRelease(offset: number, velocity: number, slot: number): number {
  const reach = FLICK_REACH * slot;
  const flick = Math.min(Math.max(velocity * FLICK_MS, -reach), reach);
  return Math.round(-(offset + flick) / slot) || 0;
}

/** Lichess's "next" clicks that land on `steps`, backward steps going round the loop. */
export const nextClicks = (steps: number, count: number): number => modulo(steps, count);

export const easeOut = (progress: number): number => 1 - (1 - progress) ** 3;
