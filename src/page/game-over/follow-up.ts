import { queryOne } from '#shared/dom.ts';
import { nonEmpty } from '#shared/text.ts';
import type { FollowUp } from './card.ts';

// Lichess's buttons after a game (`.rcontrols > .follow-up`): the card's own
// buttons take their labels and press them, so rematch offers, their state and
// the new game's seek stay Lichess's (and content/game/new-game.ts's).

const FOLLOW_UP = 'main.round .rcontrols .follow-up';

export type FollowUpAction = 'new-game' | 'rematch';

const SELECTORS: Readonly<Record<FollowUpAction, string>> = {
  // Lichess's "New opponent", or ours where it has none; both labelled with the time control.
  'new-game': '.new-opponent, .cdc-new-game',
  rematch: '.rematch',
};

function button(action: FollowUpAction): HTMLElement | null {
  const root = document.querySelector(FOLLOW_UP);
  return root ? queryOne(root, SELECTORS[action], HTMLElement) : null;
}

const labelOf = (element: HTMLElement | null): string | null =>
  element
    ? (nonEmpty(element.dataset.cdcLabel) ?? nonEmpty(element.textContent.trim()) ?? null)
    : null;

/** The follow-up's buttons; `fallbackHref` leads to the review while Lichess's link isn't there. */
export function readFollowUp(fallbackHref: string): FollowUp {
  // The analysis link is always the last button.
  const link = document.querySelector(`${FOLLOW_UP} > a[href]:last-child`);
  return {
    reviewHref: nonEmpty(link?.getAttribute('href')) ?? fallbackHref,
    newGame: labelOf(button('new-game')),
    rematch: labelOf(button('rematch')),
  };
}

export const pressFollowUp = (action: FollowUpAction): void => button(action)?.click();

export const isFollowUpAction = (value: string | undefined): value is FollowUpAction =>
  value === 'new-game' || value === 'rematch';
