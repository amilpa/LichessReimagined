import { describe, expect, it } from 'vitest';
import { freshGameId } from './round-init.ts';

const roundData = (turns: number, spectator?: boolean): string =>
  JSON.stringify({
    data: {
      game: { id: 'abcd1234', status: { id: 20, name: 'started' }, turns },
      player: { color: 'white', ...(spectator === undefined ? {} : { spectator }) },
    },
  });

describe('freshGameId', () => {
  it('names a game its player opens before the second move', () => {
    expect(freshGameId(roundData(0))).toBe('abcd1234');
    expect(freshGameId(roundData(1))).toBe('abcd1234');
  });

  it('leaves out games under way, spectators and other pages', () => {
    expect(freshGameId(roundData(2))).toBeNull();
    expect(freshGameId(roundData(0, true))).toBeNull();
    expect(freshGameId(JSON.stringify({ data: {} }))).toBeNull();
    expect(freshGameId(null)).toBeNull();
  });
});
