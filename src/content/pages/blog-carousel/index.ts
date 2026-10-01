import { closestTo, onDomReady, queryAll, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { easeOut, loopedShift, nextClicks, stepsOnRelease } from './geometry.ts';

// Drags the home page's blog cards. Lichess's carousel only moves through its
// arrows, which reorder the cards: the cards follow the pointer, then the
// arrows commit the steps, so Lichess's order stays the truth.

const DRAG_THRESHOLD = 6;
const SETTLE_MS = 350;
// A release this long after the last move is a stop, not a flick.
const STILL_MS = 80;

interface Track {
  readonly carousel: HTMLElement;
  readonly cards: readonly HTMLElement[];
  readonly slot: number;
}

interface Press {
  readonly pointerId: number;
  readonly x: number;
  readonly y: number;
}

interface Drag {
  readonly track: Track;
  readonly startX: number;
  offset: number;
  velocity: number;
  lastX: number;
  lastTime: number;
}

const clickArrow = (carousel: HTMLElement, selector: string): void =>
  queryOne(carousel, selector, HTMLElement)?.click();

// Undefined when every card shows (Lichess doesn't slide them then) or while
// Lichess's own slide runs.
function measureTrack(carousel: HTMLElement): Track | undefined {
  const cards = queryAll(carousel, '.carousel__track > *', HTMLElement);
  const [first, second] = cards;
  if (!first || !second || first.style.transition !== '') return undefined;
  const slot = second.offsetLeft - first.offsetLeft;
  const gap = slot - first.offsetWidth;
  const shown = Math.floor((carousel.clientWidth + gap) / slot);
  return slot > 0 && cards.length > shown ? { carousel, cards, slot } : undefined;
}

function place({ cards, slot }: Track, offset: number): void {
  for (const [index, card] of cards.entries())
    card.style.transform = `translateX(${loopedShift(index, offset, slot, cards.length)}px)`;
}

export class CarouselDrag {
  private readonly carousel: HTMLElement;
  private press: Press | undefined;
  private drag: Drag | undefined;
  private settling = false;
  private dragged = false;

  constructor(carousel: HTMLElement) {
    this.carousel = carousel;
  }

  listen(): void {
    const { carousel } = this;
    carousel.addEventListener('pointerdown', event => this.down(event));
    carousel.addEventListener('pointermove', event => this.move(event));
    carousel.addEventListener('pointerup', event => this.up(event));
    carousel.addEventListener('pointercancel', event => this.up(event));
    // Links and images are draggable, which would cancel the pointer.
    carousel.addEventListener('dragstart', event => event.preventDefault());
    // A drag ends on a card: it mustn't open it. Our own arrow clicks aren't trusted.
    carousel.addEventListener('click', event => this.swallowClick(event), true);
  }

  private down(event: PointerEvent): void {
    this.dragged = false;
    if (this.settling || !event.isPrimary || event.button !== 0) return;
    if (closestTo(event.target, '.carousel__controls', HTMLElement)) return;
    this.press = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  }

  private move(event: PointerEvent): void {
    if (event.pointerId !== this.press?.pointerId) return;
    this.drag ??= this.begin(this.press, event);
    if (this.drag) this.follow(this.drag, event);
  }

  private begin(press: Press, event: PointerEvent): Drag | undefined {
    const dx = event.clientX - press.x;
    const dy = event.clientY - press.y;
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return undefined;
    const track = Math.abs(dx) > Math.abs(dy) ? measureTrack(this.carousel) : undefined;
    if (!track) {
      this.press = undefined;
      return undefined;
    }
    // Lichess's arrows stop its autoplay: one step back and forth leaves the order as it was.
    clickArrow(this.carousel, '.carousel__prev');
    clickArrow(this.carousel, '.carousel__next');
    this.carousel.setPointerCapture(event.pointerId);
    setData(this.carousel, 'cdcDragging', '');
    this.dragged = true;
    const time = event.timeStamp;
    return { track, startX: press.x, offset: 0, velocity: 0, lastX: press.x, lastTime: time };
  }

  private follow(drag: Drag, event: PointerEvent): void {
    const elapsed = event.timeStamp - drag.lastTime;
    if (elapsed > 0) drag.velocity = (event.clientX - drag.lastX) / elapsed;
    drag.lastX = event.clientX;
    drag.lastTime = event.timeStamp;
    drag.offset = event.clientX - drag.startX;
    place(drag.track, drag.offset);
  }

  private up(event: PointerEvent): void {
    if (event.pointerId !== this.press?.pointerId) return;
    const { drag } = this;
    this.press = undefined;
    this.drag = undefined;
    if (!drag) return;
    const still = event.type === 'pointercancel' || event.timeStamp - drag.lastTime > STILL_MS;
    const steps = stepsOnRelease(drag.offset, still ? 0 : drag.velocity, drag.track.slot);
    this.settle(drag, steps);
  }

  private settle({ track, offset }: Drag, steps: number): void {
    this.settling = true;
    const target = -steps * track.slot;
    let start: number | undefined;
    const frame = (now: number): void => {
      start ??= now;
      const progress = Math.min((now - start) / SETTLE_MS, 1);
      place(track, offset + (target - offset) * easeOut(progress));
      if (progress < 1) requestAnimationFrame(frame);
      else this.commit(track, steps);
    };
    requestAnimationFrame(frame);
  }

  // The cards sit where Lichess's reorder puts them: dropping our shifts as it
  // reorders shows no jump.
  private commit({ carousel, cards }: Track, steps: number): void {
    for (const card of cards) card.style.transform = '';
    for (let i = nextClicks(steps, cards.length); i > 0; i--)
      clickArrow(carousel, '.carousel__next');
    setData(carousel, 'cdcDragging', null);
    this.settling = false;
  }

  private swallowClick(event: MouseEvent): void {
    if (!this.dragged || !event.isTrusted) return;
    this.dragged = false;
    event.preventDefault();
    event.stopPropagation();
  }
}

export const blogCarousel: Feature = {
  name: 'blog carousel',
  start: () => {
    onDomReady(() => {
      const carousel = queryOne(document, 'main.lobby .lobby__blog.carousel', HTMLElement);
      if (carousel) new CarouselDrag(carousel).listen();
    });
  },
};
