import { closestTo, onDomReady, queryAll, queryOne } from '#shared/dom.ts';
import { LICHESS } from './catalog.ts';
import { dressPanel, markPanel, viewOf, type View } from './panel.ts';
import type { Picker } from './pickers.ts';

// The user menu (#dasher_app) and its Board and Piece set panels.

interface PanelState {
  readonly picker: Picker;
  open: boolean;
  view: View;
}

function choose(picker: Picker, id: string): void {
  picker.choose(id);
  for (const panel of queryAll(document, `#dasher_app .sub.${picker.kind}`, HTMLElement))
    markPanel(panel, picker);
}

// Only in 2D: our boards and pieces are flat, so in 3D the panel is Lichess's.
function syncPanels(states: readonly PanelState[]): void {
  const app = document.getElementById('dasher_app');
  for (const state of states) {
    const panel = app && queryOne(app, `.sub.${state.picker.kind}`, HTMLElement);
    if (!panel) {
      state.open = false;
      continue;
    }
    // A panel opens on the tab of what the board shows. Snabbdom draws a new
    // panel when 3D goes back to 2D (its class changes), and that one keeps the tab.
    if (!state.open) state.view = viewOf(state.picker.current());
    state.open = true;
    if (panel.matches('.d2') && !panel.querySelector(':scope > .cdc-src-tabs')) {
      dressPanel(panel, state.picker, {
        view: state.view,
        onTab: view => {
          state.view = view;
        },
        onPick: id => choose(state.picker, id),
      });
    }
  }
}

// A board or a set picked in Lichess's own list (not its 2D / 3D switch or
// its sliders) hands the choice back to Lichess.
function onLichessPick(states: readonly PanelState[], target: EventTarget | null): void {
  for (const { picker } of states) {
    const selector = `#dasher_app .sub.${picker.kind}.d2 .list > button`;
    if (closestTo(target, selector, Element) && picker.current() !== LICHESS)
      choose(picker, LICHESS);
  }
}

/**
 * The menu is drawn when first opened, then again on every click in it. It's
 * watched rather than polled, so a panel never shows without its tabs.
 */
export function watchDasher(pickers: readonly Picker[]): void {
  const states: PanelState[] = pickers.map(picker => ({ picker, open: false, view: 'cdc' }));
  document.addEventListener('click', event => onLichessPick(states, event.target));
  onDomReady(() => {
    const parent = document.getElementById('dasher_app')?.parentElement;
    if (!parent) return;
    new MutationObserver(() => syncPanels(states)).observe(parent, {
      childList: true,
      subtree: true,
    });
    syncPanels(states);
  });
}
