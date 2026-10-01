import { describe, expect, it } from 'vitest';
import type { TreeNode } from '#page/lichess/tree.ts';
import { advantagePoints, moveName, moveTimes, phasesOf } from './series.ts';

const node = (ply: number, fields: Partial<TreeNode> = {}): TreeNode => ({
  id: String(ply),
  ply,
  fen: '',
  children: [],
  ...fields,
});

describe('advantagePoints', () => {
  it('reads the server analysis’ scores as White’s chances', () => {
    const points = advantagePoints([
      node(0, { eval: { cp: 0 } }),
      node(1, { san: 'e4', eval: { cp: 300, knodes: 300 } }),
      node(2, { san: 'e5' }),
      node(3, { san: 'Qh5', eval: { mate: -2 } }),
      node(4, { san: 'Qxf7#', eval: { mate: 0 } }),
    ]);
    expect(points.map(point => [point.ply, Math.round(point.whiteWin)])).toEqual([
      [0, 50],
      [1, 75],
      [3, 0],
      // White to move is mated.
      [4, 0],
    ]);
  });

  it('skips a score of another shape', () => {
    expect(advantagePoints([node(1, { eval: { cp: 'x' } }), node(2, { eval: 12 })])).toEqual([]);
  });
});

describe('moveTimes', () => {
  it('gives each move its time and the mover’s clock, in seconds', () => {
    const nodes = [node(0), node(1, { san: 'e4', clock: 18003 }), node(2, { san: 'e5' })];
    const course = { game: { moveCentis: [150, 2400, 300] } };
    expect(moveTimes(nodes, course)).toEqual([
      { ply: 1, color: 'white', san: '1. e4', seconds: 1.5, clock: 180.03 },
      { ply: 2, color: 'black', san: '1... e5', seconds: 24, clock: null },
    ]);
  });

  it('has none for a game without move times', () => {
    expect(moveTimes([node(0), node(1, { san: 'e4' })], { game: {} })).toEqual([]);
  });
});

describe('the game’s course', () => {
  it('numbers the moves as Lichess does, and reads its phases', () => {
    expect(moveName(23, 'Nf3')).toBe('12. Nf3');
    expect(moveName(24, 'Nc6')).toBe('12... Nc6');
    expect(phasesOf({ game: { division: { middle: 14 } } })).toEqual({ middle: 14, end: null });
  });
});
