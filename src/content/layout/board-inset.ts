import { queryOne, setStyleProperty } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import type { Box } from '#shared/geometry.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// Chessground shrinks the board to whole pixels per square and leaves the rest
// as an inset inside its wrapper. `--cdc-inset-{t,r,b,l}` let the player bars
// and the eval bar line up with the squares rather than the wrapper.

type Edges = Pick<Box, 'top' | 'right' | 'bottom' | 'left'>;

export type Inset = Readonly<Record<'t' | 'r' | 'b' | 'l', number>>;

const wholePixels = (gap: number): number => Math.max(0, Math.round(gap));

/** How far inside the wrapper the squares sit, per side. */
export function squaresInset(squares: Edges, wrapper: Edges): Inset {
  return {
    t: wholePixels(squares.top - wrapper.top),
    r: wholePixels(wrapper.right - squares.right),
    b: wholePixels(wrapper.bottom - squares.bottom),
    l: wholePixels(squares.left - wrapper.left),
  };
}

export function syncBoardInset(): void {
  const main = queryOne(document, 'main.round, main.analyse', HTMLElement);
  const container = main?.querySelector('.main-board cg-container');
  const wrapper = container?.closest('.cg-wrap');
  if (!main || !container || !wrapper) return;
  const inset = squaresInset(container.getBoundingClientRect(), wrapper.getBoundingClientRect());
  for (const [side, pixels] of Object.entries(inset))
    setStyleProperty(main, `--cdc-inset-${side}`, `${pixels}px`);
}

export const boardInset: Feature = {
  name: 'board inset',
  start: () => onEveryTick('board inset', syncBoardInset),
};
