import { html, trustedHtml, type SafeHtml } from '#shared/html.ts';
import type { MoveClass } from '#page/review/classes/classes.ts';
import { ICONS } from './icons.ts';
import type { Outcome } from './outcome.ts';
import type { GameOverTexts } from './texts.ts';

// The game over's card over the board: the result, the coach's word on the
// player's moves, and what to do next. Drawn once; the coach's words, the
// counts and the buttons are filled in apart, so the coach's face, which the
// content script animates, stays the same element.

// The card counts two good classes, then the worst error the player made; with
// none, their finest moves.
const GOOD: readonly MoveClass[] = ['best', 'excellent'];
const ERRORS: readonly MoveClass[] = ['blunder', 'miss', 'mistake', 'inaccuracy'];
const FINEST: readonly MoveClass[] = ['brilliant', 'great'];

/** The three classes the card counts for the player. */
export function cardClasses(counts: Readonly<Partial<Record<MoveClass, number>>>): MoveClass[] {
  const made = (moveClass: MoveClass): boolean => (counts[moveClass] ?? 0) > 0;
  const third = ERRORS.find(made) ?? FINEST.find(made) ?? 'good';
  return [...GOOD, third];
}

/** How many count chips the card has. */
export const CHIP_COUNT = 3;

export interface CardInput {
  readonly outcome: Outcome;
  readonly texts: GameOverTexts;
  readonly coachId: number;
  readonly opponent: string;
}

const CHIP = trustedHtml(
  '<span class="cdc-end__count"><span class="cdc-end__count-top"><span class="cdc-end__count-icon"></span><b></b></span><span class="cdc-end__count-label"></span></span>',
);

export function cardMarkup({ outcome, texts, coachId, opponent }: CardInput): SafeHtml {
  const reason = texts.reasons[outcome.reason];
  return html`<section class="cdc-end__card cdc-end__card--${outcome.result}" role="dialog" aria-labelledby="cdc-end-title">
    <header class="cdc-end__head">
      <div class="cdc-end__titles">
        <h2 class="cdc-end__title" id="cdc-end-title">${texts.title(outcome.result, opponent)}</h2>
        ${reason === '' ? '' : html`<p class="cdc-end__reason">${reason}</p>`}
      </div>
      <button class="cdc-end__close" type="button" aria-label="${texts.close}" data-cdc-tip="${texts.close}">${ICONS.cross}</button>
    </header>
    <div class="cdc-end__coach">
      <span class="cdc-coach__avatar" data-cdc-coach-id="${coachId}" data-cdc-mood="neutral"><span class="cdc-coach__face"></span></span>
      <p class="cdc-end__bubble"></p>
    </div>
    <div class="cdc-end__counts">${Array.from({ length: CHIP_COUNT }, () => CHIP)}</div>
    <div class="cdc-end__actions"></div>
  </section>`;
}

/** What the game's follow-up offers, read off Lichess's buttons. */
export interface FollowUp {
  readonly reviewHref: string;
  readonly newGame: string | null;
  readonly rematch: string | null;
}

const secondButton = (action: string, label: string | null): SafeHtml | '' =>
  label === null
    ? ''
    : html`<button class="cdc-end__btn" type="button" data-cdc-end="${action}">${label}</button>`;

export function actionsMarkup(followUp: FollowUp, texts: GameOverTexts): SafeHtml {
  const more = [
    secondButton('new-game', followUp.newGame),
    secondButton('rematch', followUp.rematch),
  ];
  return html`<a class="cdc-end__review" href="${followUp.reviewHref}">${texts.review}</a>
    ${more.some(button => button !== '') ? html`<div class="cdc-end__more">${more}</div>` : ''}`;
}
