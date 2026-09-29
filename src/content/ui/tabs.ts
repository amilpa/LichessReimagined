import { queryAll } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { TabBar } from './tab-bar.ts';
import { leavesPage, TAB_BARS } from './tab-bars.ts';

// Sliding tabs: every tab bar's highlight is one piece that slides from the
// tab left to the tab picked, as the rating chart's range pills do.

export interface TabBars {
  readonly sync: () => void;
  readonly onClick: (event: MouseEvent) => void;
  readonly onPageShow: (event: PageTransitionEvent) => void;
}

export function createTabBars(): TabBars {
  const bars = new Map<Element, TabBar>();

  function sync(): void {
    for (const kind of TAB_BARS) {
      for (const element of queryAll(document, kind.bar, HTMLElement)) {
        if (bars.has(element)) continue;
        bars.set(element, new TabBar(element, kind, () => bars.delete(element)));
      }
    }
    // Catches what moves a tab without resizing it or the bar.
    for (const bar of bars.values()) bar.place();
  }

  function clickedTab(target: EventTarget | null): { tab: Element; bar: TabBar } | null {
    for (let tab = target instanceof Element ? target : null; tab; tab = tab.parentElement) {
      const bar = tab.parentElement ? bars.get(tab.parentElement) : undefined;
      if (bar) return { tab, bar };
    }
    return null;
  }

  // On the document, after Lichess's own handlers: an uncancelled click on a
  // link that gets this far means a page is about to load.
  function onClick(event: MouseEvent): void {
    const clicked = clickedTab(event.target);
    if (!clicked?.tab.matches(clicked.bar.kind.tab) || !leavesPage(event, clicked.tab)) return;
    clicked.bar.leaving = clicked.tab;
    clicked.bar.queue();
  }

  // Back on this page from the history cache: the followed link must not stay picked.
  function onPageShow(event: PageTransitionEvent): void {
    if (!event.persisted) return;
    for (const bar of bars.values()) {
      bar.leaving = null;
      bar.queue();
    }
  }

  return { sync, onClick, onPageShow };
}

export const tabs: Feature = {
  name: 'sliding tabs',
  start: () => {
    const bars = createTabBars();
    onEveryTick('sliding tabs', bars.sync);
    document.addEventListener('click', bars.onClick);
    window.addEventListener('pageshow', bars.onPageShow);
  },
};
