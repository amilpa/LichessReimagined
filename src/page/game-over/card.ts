import { html, type SafeHtml } from '#shared/html.ts';
import type { MoveClass } from '#page/review/classes/classes.ts';
import { classIcon } from '#page/review/classes/icon-svg.ts';
import type { ReviewLanguage } from '#page/review/i18n/types.ts';
import { LOSS_ICONS } from './badges.ts';
import { ICONS, type IconName } from './icons.ts';
import type { Outcome } from './outcome.ts';
import type { PlayerSummary } from './quick-review.ts';
import type { GameOverTexts } from './texts.ts';

// The game over's card over the board: the result, the coach's word on the
// player's moves, and what to do next. Drawn once; the coach's words, the
// counts and the buttons are filled in apart, so the coach's face, which the
// content script animates, stays the same element.

/** The player's classes counted on the card, from best to worst. */
export const CARD_CLASSES: readonly MoveClass[] = ['best', 'mistake', 'blunder'];

// The loser's card shows how they lost, as their king does.
function headIcon({ result, reason }: Outcome): IconName {
  if (result === 'win') return 'trophy';
  return result === 'draw' ? 'half' : LOSS_ICONS[reason];
}

export interface CardInput {
  readonly outcome: Outcome;
  readonly texts: GameOverTexts;
  readonly coachId: number;
}

export function cardMarkup({ outcome, texts, coachId }: CardInput): SafeHtml {
  const reason = texts.reasons[outcome.reason];
  const icon = headIcon(outcome);
  return html`<section class="cdc-end__card cdc-end__card--${outcome.result}" role="dialog" aria-labelledby="cdc-end-title">
    <header class="cdc-end__head">
      <span class="cdc-end__badge">${ICONS[icon]}</span>
      <div class="cdc-end__titles">
        <h2 class="cdc-end__title" id="cdc-end-title">${texts.titles[outcome.result]}</h2>
        ${reason === '' ? '' : html`<p class="cdc-end__reason">${reason}</p>`}
      </div>
      <button class="cdc-end__close" type="button" aria-label="${texts.close}" data-cdc-tip="${texts.close}">${ICONS.cross}</button>
    </header>
    <div class="cdc-end__coach">
      <span class="cdc-coach__avatar" data-cdc-coach-id="${coachId}" data-cdc-mood="neutral"><span class="cdc-coach__face"></span></span>
      <p class="cdc-end__bubble"></p>
    </div>
    <div class="cdc-end__counts"></div>
    <div class="cdc-end__actions"></div>
  </section>`;
}

/** The player's counts; blank while the moves are being looked at. */
export function countsMarkup(summary: PlayerSummary | null, language: ReviewLanguage): SafeHtml {
  const chips = CARD_CLASSES.map(moveClass => {
    const label = language.classLabels[moveClass];
    const count = summary ? String(summary.counts[moveClass] ?? 0) : '';
    return html`<span class="cdc-end__count" data-cdc-tip="${label}" aria-label="${label}">${classIcon(moveClass)}<b>${count}</b></span>`;
  });
  return html`${chips}`;
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
