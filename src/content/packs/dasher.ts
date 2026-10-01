import { closestTo, onDomReady, queryOne } from '#shared/dom.ts';
import { LICHESS, type Library } from './library.ts';
import { PART_KINDS, type PartKind } from './pack.ts';
import { dressPanel, markPanel, panelSelector, viewOf, type View } from './panel.ts';

// The user menu (#dasher_app) and its Board, Piece set and Sound panels.

interface PanelState {
  readonly kind: PartKind;
  open: boolean;
  view: View;
}

// Lichess's own choices in each panel (not its 2D / 3D switch, sliders or
// volume): a pick there hands the part back to Lichess.
const LICHESS_CHOICES: Readonly<Record<PartKind, string>> = {
  board: `${panelSelector('board')}.d2 .list > button`,
  piece: `${panelSelector('piece')}.d2 .list > button`,
  sound: `${panelSelector('sound')} .selector > button`,
};

// Boards and pieces only in 2D: packs are flat, so in 3D the panel is Lichess's.
const isDressable = (panel: HTMLElement, kind: PartKind): boolean =>
  kind === 'sound' || panel.matches('.d2');

function syncPanels(states: readonly PanelState[], library: Library, redress: boolean): void {
  for (const state of states) {
    const panel = queryOne(document, panelSelector(state.kind), HTMLElement);
    if (!panel) {
      state.open = false;
      continue;
    }
    // A panel opens on the tab of what the page shows. Snabbdom draws a new
    // panel when 3D goes back to 2D (its class changes), and that one keeps the tab.
    if (!state.open) state.view = viewOf(library.current(state.kind));
    state.open = true;
    const dressed = panel.querySelector(':scope > .cdc-src-tabs') !== null;
    if (!isDressable(panel, state.kind) || (dressed && !redress)) continue;
    dressPanel(panel, {
      kind: state.kind,
      library,
      view: state.view,
      onTab: view => {
        state.view = view;
      },
    });
  }
}

function onLichessPick(library: Library, target: EventTarget | null): void {
  for (const kind of PART_KINDS)
    if (closestTo(target, LICHESS_CHOICES[kind], Element) && library.current(kind) !== LICHESS)
      library.choose(kind, LICHESS);
}

/**
 * The menu is drawn when first opened, then again on every click in it. It's
 * watched rather than polled, so a panel never shows without its tabs.
 */
export function watchDasher(library: Library): void {
  const states: PanelState[] = PART_KINDS.map(kind => ({ kind, open: false, view: LICHESS }));
  document.addEventListener('click', event => onLichessPick(library, event.target));
  // A pack added or removed redraws our lists; a pick only moves the ring.
  let listed = library.packs();
  library.onChange(() => {
    const packs = library.packs();
    syncPanels(states, library, packs !== listed);
    listed = packs;
    for (const { kind } of states) {
      const panel = queryOne(document, panelSelector(kind), HTMLElement);
      if (panel) markPanel(panel, kind, library);
    }
  });
  onDomReady(() => {
    const parent = document.getElementById('dasher_app')?.parentElement;
    if (!parent) return;
    new MutationObserver(() => syncPanels(states, library, false)).observe(parent, {
      childList: true,
      subtree: true,
    });
    syncPanels(states, library, false);
  });
}
