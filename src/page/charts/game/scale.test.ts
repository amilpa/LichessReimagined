import { describe, expect, it } from 'vitest';
import { plyNear, plyScale } from './scale.ts';

describe('plyScale', () => {
  it('spreads the game from its start to its last move across the width', () => {
    const scale = plyScale(10, 112);
    expect(scale.x(0)).toBe(6);
    expect(scale.x(10)).toBe(106);
    expect(scale.step).toBe(10);
  });
});

describe('plyNear', () => {
  it('finds the drawn ply nearest the pointer', () => {
    const scale = plyScale(10, 112);
    expect(plyNear([1, 2, 3, 8], scale, 30)).toBe(2);
    expect(plyNear([1, 2, 3, 8], scale, 45)).toBe(3);
    expect(plyNear([1, 2, 3, 8], scale, 70)).toBe(8);
    expect(plyNear([1, 2, 3, 8], scale, 500)).toBe(8);
    expect(plyNear([], scale, 30)).toBeNull();
  });
});
