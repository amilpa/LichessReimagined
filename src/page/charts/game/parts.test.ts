import { describe, expect, it } from 'vitest';
import { phaseLabels } from './parts.ts';

describe('phaseLabels', () => {
  it('names each phase right of its line when there is room', () => {
    expect(
      phaseLabels([
        { x: 40, name: 'Middle' },
        { x: 200, name: 'End' },
      ]),
    ).toEqual([
      { x: 44, name: 'Middle', anchor: 'start' },
      { x: 204, name: 'End', anchor: 'start' },
    ]);
  });

  it('moves a name left of its line, or leaves it out, rather than cover the next', () => {
    expect(
      phaseLabels([
        { x: 100, name: 'Middle' },
        { x: 110, name: 'End' },
      ])[0],
    ).toEqual({
      x: 96,
      name: 'Middle',
      anchor: 'end',
    });
    expect(
      phaseLabels([
        { x: 20, name: 'Middlegame' },
        { x: 30, name: 'End' },
      ]),
    ).toEqual([{ x: 34, name: 'End', anchor: 'start' }]);
  });
});
