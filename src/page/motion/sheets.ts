import { createElement, queryAll } from '#shared/dom.ts';
import { rewriteRules } from './queries.ts';

// A script can't read a cross-origin sheet's rules, and Lichess's links (to
// lichess1.org) have no `crossorigin`. So each sheet is loaded again with CORS,
// which its server allows (and the file is cached by then), and the copy,
// rewritten, takes over from the original. Setting `crossorigin` on the
// original doesn't make Chrome fetch it again.

const seen = new WeakSet<HTMLLinkElement>();
const copies = new WeakMap<HTMLLinkElement, HTMLLinkElement>();

const isStylesheet = (node: Node): node is HTMLLinkElement =>
  node instanceof HTMLLinkElement && node.relList.contains('stylesheet');

function replaceWithCopy(link: HTMLLinkElement): void {
  if (seen.has(link) || !link.href) return;
  seen.add(link);
  const copy = createElement('link', {
    attrs: {
      rel: 'stylesheet',
      crossorigin: 'anonymous',
      ...(link.media ? { media: link.media } : {}),
      href: link.href,
    },
  });
  seen.add(copy);
  // A sheet with no reduced-motion rule keeps its original.
  copy.addEventListener('load', () => {
    const rules = copy.sheet?.cssRules;
    if (rules && rewriteRules(rules)) link.disabled = true;
    else copy.remove();
  });
  copy.addEventListener('error', () => copy.remove());
  copies.set(link, copy);
  link.after(copy);
}

/** Copies the page's sheets, then those Lichess adds; returns the observer that watches for them. */
export function copyStylesheets(): MutationObserver {
  const observer = new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) if (isStylesheet(node)) replaceWithCopy(node);
      for (const node of record.removedNodes) if (isStylesheet(node)) copies.get(node)?.remove();
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  for (const link of queryAll(document, 'link[rel~="stylesheet"]', HTMLLinkElement)) {
    replaceWithCopy(link);
  }
  return observer;
}
