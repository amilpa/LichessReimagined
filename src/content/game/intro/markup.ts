import { html, type SafeHtml } from '#shared/html.ts';
import { BOARDS } from '#content/boards/catalog.ts';
import type { IntroPlayer } from './players.ts';

// The intro's cards over the board (styles/game/intro.css): the opponent's
// rides down on the other board, the player's waits on their own half.

type Side = 'top' | 'bottom';

function card(player: IntroPlayer, side: Side): SafeHtml {
  const kind = player.computer ? ' cdc-intro__card--computer' : '';
  const title =
    player.title === undefined ? '' : html`<span class="cdc-intro__title">${player.title}</span>`;
  const details = [player.rating, player.flag].filter(part => part !== undefined).join(' ');
  return html`<div class="cdc-intro__card cdc-intro__card--${side}${kind}">
    <span class="cdc-intro__avatar"></span>
    <span class="cdc-intro__who">
      <span class="cdc-intro__name">${title}<span class="cdc-intro__username">${player.name}</span></span>
      ${details === '' ? '' : html`<span class="cdc-intro__details">${details}</span>`}
    </span>
  </div>`;
}

export interface IntroPlayers {
  readonly top: IntroPlayer;
  readonly bottom: IntroPlayer;
}

export const introMarkup = ({ top, bottom }: IntroPlayers): SafeHtml =>
  html`<div class="cdc-intro__drop">${card(top, 'top')}</div>
    <div class="cdc-intro__stay">${card(bottom, 'bottom')}</div>
    <span class="cdc-intro__vs">VS</span>`;

/** A board other than the one shown (`current`, the stored pick), picked with `random` in [0, 1). */
export function pickIntroBoard(current: string | undefined, random: () => number): string {
  const others = BOARDS.filter(board => board.id !== current);
  const index = Math.min(others.length - 1, Math.floor(random() * others.length));
  return others[index]?.id ?? BOARDS[0].id;
}
