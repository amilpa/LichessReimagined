import type { AnimationItem } from 'lottie-web/build/player/lottie_light';
import type { BlinkMeta, Segment } from './lottie/meta.ts';

// Each blink is played when its time comes, and the animation is paused while
// the eyes stay open. Left running, lottie redrew the face on every frame, and
// Chrome redrew the page with it.

/** The loop's next blink from `frame` on, wrapping round to the first. */
export const nextBlink = (blinks: readonly Segment[], frame: number): Segment | undefined =>
  blinks.find(([first]) => first >= frame) ?? blinks[0];

/** How long until the loop, now at `frame`, reaches `target`. */
export const delayUntil = ({ loop, fps }: BlinkMeta, frame: number, target: number): number =>
  (((target - frame + loop) % loop) / fps) * 1000;

interface BlinkOptions {
  readonly animation: AnimationItem;
  readonly meta: BlinkMeta;
  readonly avatar: HTMLElement;
}

export class Blinks {
  readonly #options: BlinkOptions;
  #timer: number | undefined;
  /** The blink put off while the review panel was gone. */
  #waiting: number | null = null;
  #lastEnd = 0;
  #stopped = false;

  constructor(options: BlinkOptions) {
    this.#options = options;
  }

  /** Starts with the eyes open, at a random point of the loop. */
  start(): void {
    const { animation, meta } = this.#options;
    animation.goToAndStop(0, true);
    animation.addEventListener('complete', () => this.from(this.#lastEnd));
    this.from(Math.random() * meta.loop);
  }

  /** Schedules the next blink from `frame` on. */
  from(frame: number): void {
    const blink = nextBlink(this.#options.meta.at, frame);
    if (!blink) return;
    this.#waiting = null;
    clearTimeout(this.#timer);
    const delay = delayUntil(this.#options.meta, frame, blink[0]);
    this.#timer = setTimeout(() => this.#play(blink), delay);
  }

  /** Plays the blink put off while the avatar was out of the page, if any. */
  resume(): void {
    if (this.#waiting !== null) this.from(this.#waiting);
  }

  stop(): void {
    this.#stopped = true;
    clearTimeout(this.#timer);
  }

  #play([first, last]: Segment): void {
    if (this.#stopped) return;
    // Nobody sees the blinks once the review panel is gone: wait for it to come back.
    if (!this.#options.avatar.isConnected) {
      this.#waiting = first;
      return;
    }
    this.#lastEnd = last;
    // A segment stops a frame short of its end: the eye is open at `last`.
    this.#options.animation.playSegments([first, last + 1], true);
  }
}
