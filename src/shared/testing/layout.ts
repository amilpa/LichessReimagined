import { vi } from 'vitest';

// happy-dom lays nothing out: every size reads 0, getBoundingClientRect is
// empty, and a ResizeObserver is never called back.

interface Corner {
  readonly top: number;
  readonly left: number;
  readonly width?: number;
  readonly height?: number;
}

/** A DOMRect from its top left corner and its size (0 if left out), to stub getBoundingClientRect. */
export const rectAt = ({ top, left, width = 0, height = 0 }: Corner): DOMRect =>
  new DOMRect(left, top, width, height);

interface Edges {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

/** A DOMRect from its four edges. */
export const rectBetween = ({ top, right, bottom, left }: Edges): DOMRect =>
  new DOMRect(left, top, right - left, bottom - top);

const METRICS = [
  'clientWidth',
  'clientHeight',
  'offsetWidth',
  'offsetHeight',
  'offsetLeft',
  'offsetTop',
] satisfies (keyof HTMLElement)[];

export type Metric = (typeof METRICS)[number];

export interface FakeLayout {
  /** Calls every ResizeObserver back, as a browser would after a resize. */
  readonly resize: () => void;
}

/** Sizes every element with `measure`, until the test ends. */
export function fakeLayout(measure: (element: HTMLElement, metric: Metric) => number): FakeLayout {
  const observers: FakeResizeObserver[] = [];
  class FakeResizeObserver implements ResizeObserver {
    readonly callback: ResizeObserverCallback;
    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
      observers.push(this);
    }
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  for (const metric of METRICS) {
    vi.spyOn(HTMLElement.prototype, metric, 'get').mockImplementation(function (this: HTMLElement) {
      return measure(this, metric);
    });
  }
  return {
    resize: () => {
      for (const observer of observers) observer.callback([], observer);
    },
  };
}
