import { queryOne, setStyleProperty } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// The right-hand panel stacks the moves, the controls and the chat in fixed
// grid rows (styles/game/layout.css, styles/analysis/layout.css), so the
// controls' row needs a definite height: `--cdc-controls-h`.

export function syncControlsHeight(): void {
  const main = queryOne(document, 'main.round, main.analyse', HTMLElement);
  if (!main) return;
  const controls = main.querySelector('.rcontrols, .analyse__controls');
  const height = controls ? Math.ceil(controls.getBoundingClientRect().height) : 0;
  setStyleProperty(main, '--cdc-controls-h', `${height}px`);
}

export const controlsHeight: Feature = {
  name: 'controls height',
  start: () => onEveryTick('controls height', syncControlsHeight),
};
