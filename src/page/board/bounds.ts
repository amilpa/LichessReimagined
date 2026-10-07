import type { Feature } from '#shared/features.ts';

// Chessground measures the board once and caches it (`s.dom.bounds()`),
// re-measuring only when its wrap resizes, the page scrolls or the window
// does. Our analysis grid parks the eval bar (and the review's) in a column
// beside the board: showing or hiding one shifts the board sideways without
// resizing its wrap, so the cached rect goes stale and a dragged piece hangs
// off the cursor instead of sitting under it. Nudge chessground to measure
// again whenever such a bar appears, leaves or resizes.

const BARS = '.eval-gauge, #cdc-evalbar';

/** Tell chessground the layout moved, so it re-measures on the next drag. */
function nudge(): void {
  window.dispatchEvent(new Event('resize'));
}

function collectBars(node: Node, into: Element[]): void {
  if (!(node instanceof Element)) return;
  if (node.matches(BARS)) into.push(node);
  for (const bar of node.querySelectorAll(BARS)) into.push(bar);
}

function start(): void {
  const seen = new WeakSet<Element>();
  // A bar going from hidden to shown (or back) changes size, even when
  // Lichess toggles it through `display` rather than adding nodes.
  const sizes = new ResizeObserver(() => nudge());
  const watch = (bar: Element): void => {
    if (seen.has(bar)) return;
    seen.add(bar);
    sizes.observe(bar);
  };
  for (const bar of document.querySelectorAll(BARS)) watch(bar);
  new MutationObserver(records => {
    const added: Element[] = [];
    let moved = false;
    for (const record of records) {
      for (const node of record.removedNodes) {
        const gone: Element[] = [];
        collectBars(node, gone);
        if (gone.length > 0) moved = true;
      }
      for (const node of record.addedNodes) collectBars(node, added);
    }
    for (const bar of added) watch(bar);
    if (moved || added.length > 0) nudge();
  }).observe(document, { childList: true, subtree: true });
}

export const boardBounds: Feature = { name: 'board bounds', start };
