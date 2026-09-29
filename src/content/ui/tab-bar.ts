import { setData, setStyleProperty } from '#shared/dom.ts';
import { oncePerFrame } from '#shared/frame.ts';
import { sameOffset, tabOffset, type TabBarKind, type TabOffset } from './tab-bars.ts';

// One tab bar. Its active tab's highlight is the bar's ::before, placed in
// `--cdc-tab-{x,y,w,h}`; the bar is only marked once it's placed, so until
// then (and with no active tab) the tab keeps its own highlight.

export class TabBar {
  readonly element: HTMLElement;
  readonly kind: TabBarKind;
  /** A tab link just followed: shown picked while the next page loads. */
  leaving: Element | null = null;
  /** Places the highlight on the next frame. */
  readonly queue: () => void;
  readonly #sizes: ResizeObserver;
  readonly #changes: MutationObserver;
  readonly #onDetach: () => void;
  #item: HTMLElement | null = null;
  #offset: TabOffset | null = null;

  constructor(element: HTMLElement, kind: TabBarKind, onDetach: () => void) {
    this.element = element;
    this.kind = kind;
    this.#onDetach = onDetach;
    this.queue = oncePerFrame(() => this.place());
    this.#sizes = new ResizeObserver(this.queue);
    this.#sizes.observe(element);
    this.#changes = new MutationObserver(this.queue);
    this.#changes.observe(element, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  place(): void {
    if (!this.element.isConnected) {
      this.#sizes.disconnect();
      this.#changes.disconnect();
      this.#onDetach();
      return;
    }
    const tabs = [...this.element.children].filter(child => child.matches(this.kind.tab));
    for (const tab of tabs) this.#sizes.observe(tab);
    const item = this.leaving?.isConnected
      ? this.leaving
      : tabs.find(tab => tab.matches(this.kind.active));
    if (!item) {
      setData(this.element, 'cdcTabs', null);
      this.#item = null;
      return;
    }
    // The tab is hidden: place the highlight once it shows.
    if (!(item instanceof HTMLElement) || item.offsetWidth === 0) return;
    const bar = this.element.getBoundingClientRect();
    const offset = tabOffset(bar, item.getBoundingClientRect(), this.element);
    if (item === this.#item && sameOffset(offset, this.#offset)) return;
    this.#draw(item, offset);
  }

  #draw(item: HTMLElement, offset: TabOffset): void {
    const [x, y, width, height] = offset;
    // Picking another tab slides; the same tab moved or resized jumps there.
    const slides = this.#item !== null && item !== this.#item;
    setData(this.element, 'cdcTabsStill', slides ? null : '');
    setStyleProperty(this.element, '--cdc-tab-x', `${x}px`);
    setStyleProperty(this.element, '--cdc-tab-y', `${y}px`);
    setStyleProperty(this.element, '--cdc-tab-w', `${width}px`);
    setStyleProperty(this.element, '--cdc-tab-h', `${height}px`);
    setData(this.element, 'cdcTabs', this.kind.look);
    this.#item = item;
    this.#offset = offset;
  }
}
