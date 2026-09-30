import { queryOne, setStyleProperty } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// On the game page, Lichess's voice bar and the players' crosstable sit over
// the moves, which make room for them (styles/game/moves-extras.css): their
// heights go into `--cdc-voice-h` and `--cdc-crosstable-h`. Both wrap or grow
// with the panel's width and the player's language, so they're measured.

const EXTRAS: readonly (readonly [selector: string, variable: string])[] = [
  ['#voice-bar', '--cdc-voice-h'],
  ['.round__underboard > .crosstable', '--cdc-crosstable-h'],
];

export function syncMovesExtrasHeight(): void {
  const main = queryOne(document, 'main.round', HTMLElement);
  if (!main) return;
  for (const [selector, variable] of EXTRAS) {
    const extra = main.querySelector(selector);
    const height = extra ? `${Math.ceil(extra.getBoundingClientRect().height)}px` : null;
    setStyleProperty(main, variable, height);
  }
}

export const movesExtrasHeight: Feature = {
  name: 'moves extras height',
  start: () => onEveryTick('moves extras height', syncMovesExtrasHeight),
};
