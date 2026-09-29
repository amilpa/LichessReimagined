import type { Color } from '#shared/chess/types.ts';
import { createCustomElement, createElement } from '#shared/dom.ts';
import { createSvgElement } from '#shared/svg.ts';
import type { Frame } from './schema.ts';

// An analysis board with chessground's shapes svg, built the way chessground
// builds it (by script, so `cgHash` keeps its case).

export interface BoardMarkup {
  readonly orientation: Color;
  readonly shapes?: Frame['shapes'];
  readonly viewBox?: string | null | undefined;
}

export function renderBoard({ orientation, shapes = [], viewBox }: BoardMarkup): Element {
  const main = createElement('main', { className: 'analyse' });
  const board = createElement('div', { className: 'analyse__board main-board' });
  const wrap = createElement('div', { className: `cg-wrap orientation-${orientation}` });
  const container = createCustomElement('cg-container');
  main.append(board);
  board.append(wrap);
  wrap.append(container);
  container.append(createCustomElement('cg-board'));
  const svg = createSvgElement('svg', { class: 'cg-shapes' });
  if (viewBox !== null) svg.setAttribute('viewBox', viewBox ?? '-4 -4 8 8');
  const group = createSvgElement('g');
  svg.append(createSvgElement('defs'), group);
  for (const shape of shapes) {
    const holder = createSvgElement('g', { cgHash: shape.hash ?? '800,800,false,e2,e4,green' });
    holder.append(createSvgElement(shape.tag, shape.attrs));
    group.append(holder);
  }
  container.append(svg);
  document.body.replaceChildren(main);
  return container;
}
