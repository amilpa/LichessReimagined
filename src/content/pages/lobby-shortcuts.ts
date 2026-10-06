import { closestTo, onDomReady, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// The lobby's second and third start buttons as shortcuts, instead of the
// friend and computer dialogs: puzzle themes and the analysis board.

interface Shortcut {
  readonly selector: string;
  readonly label: string;
  readonly href: string;
}

const SHORTCUTS: readonly Shortcut[] = [
  { selector: '.lobby__start__button--friend', label: 'Puzzles', href: '/training/themes' },
  { selector: '.lobby__start__button--ai', label: 'Analysis', href: '/analysis' },
];

const SELECTORS = SHORTCUTS.map(shortcut => shortcut.selector).join(', ');

function shortcutFor(button: HTMLElement): Shortcut | null {
  return SHORTCUTS.find(shortcut => button.matches(shortcut.selector)) ?? null;
}

function onClick(event: MouseEvent): void {
  // Capture, before Lichess's own listeners open their dialogs.
  if (event.button !== 0 || event.defaultPrevented) return;
  const button = closestTo(event.target, SELECTORS, HTMLElement);
  const shortcut = button ? shortcutFor(button) : null;
  if (!button || !shortcut) return;
  event.preventDefault();
  event.stopPropagation();
  location.assign(shortcut.href);
}

function relabel(): void {
  // The lobby re-renders its buttons after connecting: re-assert ours while
  // they differ, and write nothing otherwise. The flag hands off from the
  // stylesheet's first-paint label (styles/home/quick-play.css).
  for (const { selector, label } of SHORTCUTS) {
    const button = queryOne(document, `main.lobby ${selector}`, HTMLElement);
    if (button && button.textContent !== label) {
      button.textContent = label;
      setData(button, 'cdcLabel', '');
    }
  }
}

export const lobbyShortcuts: Feature = {
  name: 'lobby shortcuts',
  start: () => {
    document.addEventListener('click', onClick, true);
    onDomReady(relabel);
    onEveryTick('lobby shortcuts', relabel);
  },
};
