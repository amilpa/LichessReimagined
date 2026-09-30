import { describe, expect, it } from 'vitest';
import { readOutcome } from './outcome.ts';

describe('readOutcome', () => {
  it('tells the player they won or lost, and how', () => {
    expect(readOutcome({ status: 'resign', winner: 'black', player: 'black' })).toEqual({
      result: 'win',
      reason: 'resign',
      winner: 'black',
    });
    expect(readOutcome({ status: 'outoftime', winner: 'black', player: 'white' })).toEqual({
      result: 'loss',
      reason: 'time',
      winner: 'black',
    });
    expect(readOutcome({ status: 'timeout', winner: 'white', player: 'white' })?.reason).toBe(
      'left',
    );
    expect(readOutcome({ status: 'mate', winner: 'white', player: 'black' })?.reason).toBe('mate');
  });

  it('reads a game without a winner as a draw', () => {
    expect(readOutcome({ status: 'stalemate', winner: undefined, player: 'white' })).toEqual({
      result: 'draw',
      reason: 'stalemate',
      winner: null,
    });
    expect(readOutcome({ status: 'draw', winner: undefined, player: 'black' })?.reason).toBe(
      'draw',
    );
    // Out of time against a lone king.
    expect(readOutcome({ status: 'outoftime', winner: undefined, player: 'black' })).toEqual({
      result: 'draw',
      reason: 'time',
      winner: null,
    });
  });

  it('names the statuses it has no words for', () => {
    expect(readOutcome({ status: 'variantEnd', winner: 'white', player: 'white' })?.reason).toBe(
      'other',
    );
  });

  it('has nothing to say about a game that isn’t over or never started', () => {
    for (const status of ['created', 'started', 'aborted', 'noStart'])
      expect(readOutcome({ status, winner: undefined, player: 'white' })).toBeNull();
  });
});
