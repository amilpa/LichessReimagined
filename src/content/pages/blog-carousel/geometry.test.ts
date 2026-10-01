import { describe, expect, it } from 'vitest';
import { easeOut, loopedShift, nextClicks, stepsOnRelease } from './geometry.ts';

const SLOT = 200;
const COUNT = 6;
const positions = (offset: number): number[] =>
  Array.from(
    { length: COUNT },
    (_, index) => index * SLOT + loopedShift(index, offset, SLOT, COUNT),
  );

describe('blog carousel geometry', () => {
  it('moves every card by the offset while none wraps', () => {
    expect(positions(-150)).toEqual([-150, 50, 250, 450, 650, 850]);
  });

  it('brings the last card round to the left when dragged right', () => {
    expect(positions(80)).toEqual([80, 280, 480, 680, 880, -120]);
  });

  it('wraps a card past the left edge round to the end', () => {
    expect(positions(-260)).toEqual([940, -60, 140, 340, 540, 740]);
  });

  it('keeps one slot per card, however far the drag goes', () => {
    const sorted = positions(-2930).toSorted((left, right) => left - right);
    expect(sorted).toEqual([-130, 70, 270, 470, 670, 870]);
  });

  it('steps to the nearest card on a slow release', () => {
    expect(stepsOnRelease(-90, 0, SLOT)).toBe(0);
    expect(stepsOnRelease(-110, 0, SLOT)).toBe(1);
    expect(stepsOnRelease(-430, 0, SLOT)).toBe(2);
    expect(stepsOnRelease(120, 0, SLOT)).toBe(-1);
    expect(Object.is(stepsOnRelease(10, 0, SLOT), 0)).toBe(true);
  });

  it('carries a flick on to the next card', () => {
    expect(stepsOnRelease(-40, -0.5, SLOT)).toBe(1);
    expect(stepsOnRelease(40, 0.5, SLOT)).toBe(-1);
  });

  it('carries a hard flick one card on at most', () => {
    expect(stepsOnRelease(-40, -10, SLOT)).toBe(1);
    expect(stepsOnRelease(-200, -10, SLOT)).toBe(1);
    expect(stepsOnRelease(-210, -10, SLOT)).toBe(2);
  });

  it('turns steps back into "next" clicks round the loop', () => {
    expect(nextClicks(2, COUNT)).toBe(2);
    expect(nextClicks(-1, COUNT)).toBe(5);
    expect(nextClicks(COUNT, COUNT)).toBe(0);
  });

  it('eases out from 0 to 1', () => {
    expect(easeOut(0)).toBe(0);
    expect(easeOut(0.5)).toBe(0.875);
    expect(easeOut(1)).toBe(1);
  });
});
