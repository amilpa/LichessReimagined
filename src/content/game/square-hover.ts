import { closestTo, createElement, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { oncePerFrame } from '#shared/frame.ts';

// Chess.com-style hover: a border on whatever square the pointer is over, even
// one no piece can move to. Chessground only makes `square` elements for
// highlighted squares, so CSS alone can't reach the rest: one of our own divs
// follows the pointer over each board instead (styles/board/pieces.css).

const HOVER = 'cdc-square-hover';

interface Board {
  readonly wrap: HTMLElement;
  readonly container: HTMLElement;
  readonly black: boolean;
}

function findBoard(target: EventTarget | null): Board | null {
  const container = closestTo(target, 'cg-container', HTMLElement);
  const wrap = container ? closestTo(container, '.cg-wrap', HTMLElement) : null;
  if (!container || !wrap) return null;
  return { wrap, container, black: wrap.classList.contains('orientation-black') };
}

const markers = new WeakMap<Element, HTMLElement>();
const shownAt = new WeakMap<Element, string | null>();

function markerFor(container: HTMLElement): HTMLElement {
  const known = markers.get(container);
  if (known?.isConnected) return known;
  // Chessground positions its own layers, not the container itself.
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  const marker = createElement('div', { className: HOVER });
  container.append(marker);
  markers.set(container, marker);
  return marker;
}

/** The hovered square's column and row as shown, or null past the edge. */
function columnRow(rect: DOMRect, x: number, y: number, black: boolean): string | null {
  const across = ((x - rect.left) / rect.width) * 8;
  const down = ((y - rect.top) / rect.height) * 8;
  if (across < 0 || across >= 8 || down < 0 || down >= 8) return null;
  const column = black ? 7 - Math.floor(across) : Math.floor(across);
  const row = black ? 7 - Math.floor(down) : Math.floor(down);
  return `${column},${row}`;
}

function show(marker: HTMLElement, container: HTMLElement, key: string): void {
  if (shownAt.get(container) === key) return;
  const [column, row] = key.split(',').map(Number);
  marker.style.left = `${(column ?? 0) * 12.5}%`;
  marker.style.top = `${(row ?? 0) * 12.5}%`;
  marker.style.display = 'block';
  shownAt.set(container, key);
}

function hide(container: HTMLElement): void {
  if (shownAt.get(container) === null) return;
  const marker = markers.get(container);
  if (marker) marker.style.display = 'none';
  shownAt.set(container, null);
}

let pending: { board: Board; x: number; y: number } | null = null;
let last: HTMLElement | null = null;

function place(): void {
  const job = pending;
  pending = null;
  if (!job || !job.board.container.isConnected) return;
  // The border shows only mid-drag, never on a plain hover.
  if (!dragging || dragging.container !== job.board.container) {
    hide(job.board.container);
    return;
  }
  const key = columnRow(
    job.board.container.getBoundingClientRect(),
    job.x,
    job.y,
    job.board.black,
  );
  if (key === null) hide(job.board.container);
  else show(markerFor(job.board.container), job.board.container, key);
}

const queuePlace = oncePerFrame(place);

function onPointerMove(event: PointerEvent): void {
  const board = findBoard(event.target);
  if (!board) {
    pending = null;
    if (last) hide(last);
    return;
  }
  last = board.container;
  pending = { board, x: event.clientX, y: event.clientY };
  queuePlace();
}

function onMouseOut(event: MouseEvent): void {
  const board = findBoard(event.target);
  const next = event.relatedTarget;
  if (board && (next === null || (next instanceof Node && !board.container.contains(next))))
    hide(board.container);
}

function onPointerDown(event: PointerEvent): void {
  // A drag keeps `selected` on the origin square to the drop: hide its border
  // while pressed, the hover marker above covers the square under the pointer.
  const board = findBoard(event.target);
  if (!board || event.button !== 0) return;
  dragging = board;
  setData(board.wrap, 'cdcDrag', '');
  pending = { board, x: event.clientX, y: event.clientY };
  queuePlace();
}

function onPointerUp(): void {
  if (!dragging) return;
  setData(dragging.wrap, 'cdcDrag', null);
  hide(dragging.container);
  dragging = null;
}

let dragging: Board | null = null;

export const squareHover: Feature = {
  name: 'square hover',
  start: () => {
    document.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('mouseout', onMouseOut);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
  },
};
