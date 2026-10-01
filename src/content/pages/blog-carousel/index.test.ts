import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closestTo, queryAll, queryOne } from '#shared/dom.ts';
import { fakeLayout } from '#shared/testing/layout.ts';
import { blogCarousel } from './index.ts';

// Lichess's carousel as lobby.js builds it: 192px cards with an 8px gap, five
// shown, and arrows that reorder the cards and drop any slide.
const SLOT = 200;
const SHOWN = 5;

let frames: FrameRequestCallback[] = [];
let autoplay = true;

function buildCarousel(count: number): HTMLElement {
  const markup = Array.from(
    { length: count },
    (_, i) => `<a class="ublog-post-card" href="/${i}">${i}</a>`,
  );
  document.body.innerHTML = `<main class="lobby"><div class="lobby__blog carousel">
    <div class="carousel__track">${markup.join('')}</div>
    <div class="carousel__controls"><button class="carousel__prev"></button><button class="carousel__next"></button></div>
  </div></main>`;
  const carousel = queryOne(document, '.carousel', HTMLElement);
  const track = queryOne(document, '.carousel__track', HTMLElement);
  if (!carousel || !track) throw new Error('no carousel');
  carousel.addEventListener('click', event => {
    const prev = closestTo(event.target, '.carousel__prev', HTMLElement);
    const next = closestTo(event.target, '.carousel__next', HTMLElement);
    const [first] = track.children;
    const last = track.lastElementChild;
    if (prev && last) track.prepend(last);
    else if (next && first) track.append(first);
    else return;
    for (const card of cards(carousel)) card.style.transform = '';
    autoplay = false;
  });
  return carousel;
}

const cards = (root: ParentNode = document): HTMLElement[] =>
  queryAll(root, '.ublog-post-card', HTMLElement);
const order = (): string[] => cards().map(card => card.textContent);
const shifts = (): string[] => cards().map(card => card.style.transform);
const dragging = (): boolean =>
  queryOne(document, '.carousel', HTMLElement)?.dataset.cdcDragging !== undefined;

interface At {
  readonly x: number;
  readonly y?: number;
  readonly time: number;
}

function pointer(target: Element, type: string, { x, y = 0, time }: At): void {
  const init = { bubbles: true, isPrimary: true, pointerId: 1, clientX: x, clientY: y };
  const event = new PointerEvent(type, init);
  Object.defineProperty(event, 'timeStamp', { value: time });
  target.dispatchEvent(event);
}

// A user's click, which the browser marks as trusted (happy-dom doesn't).
function userClick(target: Element): boolean {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'isTrusted', { value: true });
  return target.dispatchEvent(event);
}

function runFrames(): void {
  for (const time of [0, 100, 400]) {
    const pending = frames;
    frames = [];
    for (const frame of pending) frame(time);
  }
}

function drag(target: Element, moves: readonly (readonly [number, number])[]): void {
  pointer(target, 'pointerdown', { x: 500, time: 0 });
  for (const [x, time] of moves) pointer(target, 'pointermove', { x, time });
  const [, lastTime = 0] = moves.at(-1) ?? [];
  pointer(target, 'pointerup', { x: moves.at(-1)?.[0] ?? 500, time: lastTime + 200 });
}

beforeEach(() => {
  frames = [];
  autoplay = true;
  vi.stubGlobal('requestAnimationFrame', (frame: FrameRequestCallback) => frames.push(frame));
  fakeLayout((element, metric) => {
    if (element.classList.contains('carousel'))
      return metric === 'clientWidth' ? SHOWN * SLOT - 8 : 0;
    const index = element.parentElement ? [...element.parentElement.children].indexOf(element) : 0;
    if (metric === 'offsetLeft') return index * SLOT;
    return metric === 'offsetWidth' ? SLOT - 8 : 0;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

function startOn(count: number): HTMLElement {
  buildCarousel(count);
  blogCarousel.start();
  const [card] = cards();
  if (!card) throw new Error('no card');
  return card;
}

describe('blog carousel', () => {
  it('moves the cards with the pointer, looping the last one round', () => {
    const card = startOn(6);
    pointer(card, 'pointerdown', { x: 500, time: 0 });
    pointer(card, 'pointermove', { x: 580, time: 50 });
    expect(shifts()).toEqual([...Array<string>(5).fill('translateX(80px)'), 'translateX(-1120px)']);
    expect(dragging()).toBe(true);
    expect(autoplay).toBe(false);
    expect(order()).toEqual(['0', '1', '2', '3', '4', '5']);
  });

  it('commits a drag through the arrows once the cards settle', () => {
    const card = startOn(6);
    drag(card, [
      [450, 50],
      [270, 100],
    ]);
    expect(order()).toEqual(['0', '1', '2', '3', '4', '5']);
    runFrames();
    expect(order()).toEqual(['1', '2', '3', '4', '5', '0']);
    expect(shifts()).toEqual(Array(6).fill(''));
    expect(dragging()).toBe(false);
  });

  it('steps back when dragged right', () => {
    const card = startOn(6);
    drag(card, [[640, 100]]);
    runFrames();
    expect(order()).toEqual(['5', '0', '1', '2', '3', '4']);
  });

  it('carries a flick on to the next card', () => {
    const card = startOn(6);
    pointer(card, 'pointerdown', { x: 500, time: 0 });
    pointer(card, 'pointermove', { x: 490, time: 10 });
    pointer(card, 'pointermove', { x: 470, time: 30 });
    pointer(card, 'pointerup', { x: 470, time: 40 });
    runFrames();
    expect(order()).toEqual(['1', '2', '3', '4', '5', '0']);
  });

  it('swallows the click that ends a drag, not a plain click', () => {
    const card = startOn(6);
    drag(card, [[420, 100]]);
    expect(userClick(card)).toBe(false);
    runFrames();
    pointer(card, 'pointerdown', { x: 500, time: 1000 });
    pointer(card, 'pointerup', { x: 500, time: 1100 });
    expect(userClick(card)).toBe(true);
  });

  it('leaves a vertical swipe and a carousel that shows every card alone', () => {
    const card = startOn(6);
    pointer(card, 'pointerdown', { x: 500, time: 0 });
    pointer(card, 'pointermove', { x: 505, y: 40, time: 50 });
    pointer(card, 'pointermove', { x: 400, y: 40, time: 100 });
    expect(shifts()).toEqual(Array(6).fill(''));
    const lone = startOn(SHOWN);
    drag(lone, [[300, 100]]);
    expect(shifts()).toEqual(Array(SHOWN).fill(''));
    expect(autoplay).toBe(true);
  });
});
