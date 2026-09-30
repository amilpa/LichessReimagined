import { afterEach, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { pressFollowUp, readFollowUp } from './follow-up.ts';

// The buttons after a lobby game, the new game's labelled by content/game/new-game.ts.
const FOLLOW_UP =
  '<main class="round"><div class="rcontrols"><div class="follow-up">' +
  '<button class="fbt rematch white"><span>Rematch</span></button>' +
  '<a class="fbt new-opponent" href="/?hook_like=abcd1234" data-cdc-label="New 5 | 3">New opponent</a>' +
  '<a class="fbt" href="/abcd1234/black#5">Analysis board</a>' +
  '</div></div></main>';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('the follow-up', () => {
  it('reads Lichess’s buttons, the analysis link last', () => {
    document.body.innerHTML = FOLLOW_UP;
    expect(readFollowUp('/abcd1234/black')).toEqual({
      reviewHref: '/abcd1234/black#5',
      newGame: 'New 5 | 3',
      rematch: 'Rematch',
    });
  });

  it('falls back on the review’s page until the buttons come', () => {
    expect(readFollowUp('/abcd1234/black')).toEqual({
      reviewHref: '/abcd1234/black',
      newGame: null,
      rematch: null,
    });
  });

  it('presses Lichess’s own button', () => {
    document.body.innerHTML = FOLLOW_UP;
    const rematch = queryOne(document, '.rematch', HTMLElement);
    const click = vi.fn<() => void>();
    rematch?.addEventListener('click', click);
    pressFollowUp('rematch');
    expect(click).toHaveBeenCalledOnce();
  });
});
