import { fnv } from './fnv.ts';

// Test support: what the Game Review shows, read off the page after a step
// of the script. The class icons and their data URLs, the same everywhere,
// are cut down to their color and a hash.

const shortHash = (text: string): string => fnv(text).toString(36);

/** A short hash, for what's too long to keep whole; null stays null. */
export const hashOf = (text: string | null): string | null =>
  text === null ? null : shortHash(text);

const ICON = /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 20 20">[\s\S]*?<\/svg>/g;
const ICON_URL = /url\((?:&quot;|")?data:image\/svg\+xml,.*?%3C%2Fsvg%3E(?:&quot;|")?\)/g;

// The names the port gave the `cdc` prefix, back to the original's, as the
// recordings have them.
const RENAMED: readonly (readonly [string, string])[] = [
  ['--cdc-class-color:', '--c:'],
  ['--cdc-class-icon:', '--i:'],
  ['data-cdc-version=', 'data-v='],
  ['data-cdc-opening=', 'data-key='],
  ['data-cdc-coach-id=', 'data-coach='],
  ['data-cdc-mood=', 'data-mood='],
];

// What the port added, which the original didn't have: the summary's counts
// as buttons that go to their moves, where it wrote the bare number.
const COUNT_BUTTON = /<button class="cdc-t-jump"[^>]*>(\d+)<\/button>/g;

export function compact(markup: string): string {
  return RENAMED.reduce((text, [port, original]) => text.replaceAll(port, original), markup)
    .replace(COUNT_BUTTON, '$1')
    .replace(
      ICON,
      icon => `[icon ${/fill="(#[0-9a-f]+)"/.exec(icon)?.[1] ?? ''} ${shortHash(icon)}]`,
    )
    .replace(ICON_URL, url => `url(icon ${shortHash(url)})`);
}

const outer = (selector: string): string | null => {
  const found = document.querySelector(selector);
  return found ? compact(found.outerHTML) : null;
};

const inner = (selector: string): string | null => {
  const found = document.querySelector(selector);
  return found ? compact(found.innerHTML) : null;
};

/** Where each of the review's elements sits, by its parent's class or tag. */
function placement(): string {
  return [
    '#cdc-review',
    '#cdc-review-graph',
    '#cdc-review-controls',
    '#cdc-evalbar',
    '#cdc-board-overlay',
    '#cdc-opening',
    '#cdc-tip',
  ]
    .map(selector => {
      const parent = document.querySelector(selector)?.parentElement;
      return `${selector}:${parent ? parent.className || parent.tagName : '-'}`;
    })
    .join(' ');
}

export interface ReviewSnapshot {
  readonly [part: string]: unknown;
}

export interface SnapshotExtras {
  readonly arrows: unknown;
  readonly coach: unknown;
  readonly cache: string | null;
}

export function snapshotReview(extras: SnapshotExtras): ReviewSnapshot {
  const root = document.documentElement;
  return {
    html: [...root.classList].filter(name => name.startsWith('cdc')).join(' '),
    cls: root.dataset.cdcCls ?? null,
    placement: placement(),
    panel: inner('#cdc-review'),
    graph: outer('#cdc-review-graph'),
    controls: inner('#cdc-review-controls'),
    bar: outer('#cdc-evalbar'),
    overlay: inner('#cdc-board-overlay'),
    opening: outer('#cdc-opening'),
    tip: outer('#cdc-tip'),
    moves: inner('.tview2'),
    ...extras,
  };
}
