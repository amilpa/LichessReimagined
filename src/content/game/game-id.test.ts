import { describe, expect, it } from 'vitest';
import { gameIdFrom } from './game-id.ts';

describe('gameIdFrom', () => {
  it('reads the game id a path starts with', () => {
    expect(gameIdFrom('/abcdefgh/black')).toBe('abcdefgh');
    expect(gameIdFrom('/abcdefgh1234')).toBe('abcdefgh');
    expect(gameIdFrom('/tv/blitz')).toBeNull();
  });
});
