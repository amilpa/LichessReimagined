import type { FakeController, FakeNode } from './fake-lichess.ts';

// Test support: the analysis page's markup around a fake controller, and its
// move list drawn the way Lichess's column view lays it out.

const escapeAttribute = (text: string): string =>
  text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

function moveMarkup(node: FakeNode, path: string, activePath: string): string {
  const active = path === activePath ? ' class="active"' : '';
  return `<move p="${escapeAttribute(path)}"${active}><san>${node.san ?? ''}</san></move>`;
}

function lineMarkup(start: FakeNode, from: string, activePath: string): string {
  let out = '';
  let path = from;
  for (let node: FakeNode | undefined = start; node; node = node.children[0]) {
    path += node.id;
    out += moveMarkup(node, path, activePath);
  }
  return `<line>${out}</line>`;
}

/** The move list: indexes, moves, and each move's alternatives in an interrupt. */
function moveListMarkup(ctrl: FakeController): string {
  let out = '';
  let path = '';
  let parent = ctrl.tree.root;
  for (const node of ctrl.mainline.slice(1)) {
    const white = node.ply % 2 === 1;
    const number = Math.ceil(node.ply / 2);
    if (white) out += `<index>${number}</index>`;
    const before = path;
    path += node.id;
    out += moveMarkup(node, path, ctrl.path);
    const others = parent.children.slice(1);
    if (others.length > 0) {
      if (white) out += '<move class="empty">...</move>';
      const lines = others.map(other => lineMarkup(other, before, ctrl.path)).join('');
      out += `<interrupt><lines>${lines}</lines></interrupt>`;
      if (white) out += `<index>${number}</index><move class="empty">...</move>`;
    }
    parent = node;
  }
  return out;
}

const PAGE = `<main class="analyse">
  <div class="analyse__board main-board"><div class="cg-wrap"><cg-container></cg-container></div></div>
  <div class="analyse__tools"><div class="analyse__moves areplay"><div class="tview2 tview2-column"></div></div></div>
  <div class="analyse__controls"></div>
</main>`;

/**
 * Lays the page out, and has the controller's redraw draw the move list. When
 * the tree grew it redraws the whole list, which drops our marks as a new
 * snabbdom node would; otherwise it redraws only the active move.
 */
export function mountFakePage(ctrl: FakeController): void {
  document.body.innerHTML = PAGE;
  const list = document.querySelector('.tview2');
  const draw = (): void => {
    if (!list) return;
    if (ctrl.drawnVersion !== ctrl.treeVersion) {
      ctrl.drawnVersion = ctrl.treeVersion;
      list.innerHTML = moveListMarkup(ctrl);
      return;
    }
    for (const move of list.querySelectorAll('move[p]'))
      move.classList.toggle('active', move.getAttribute('p') === ctrl.path);
  };
  ctrl.redraw = draw;
  draw();
}
