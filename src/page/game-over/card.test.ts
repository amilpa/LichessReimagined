import { describe, expect, it } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { setHtml, type SafeHtml } from '#shared/html.ts';
import { en } from '#page/review/i18n/en.ts';
import { actionsMarkup, cardMarkup, countsMarkup } from './card.ts';
import { gameOverTexts } from './texts.ts';

const texts = gameOverTexts();

function render(markup: SafeHtml): HTMLElement {
  const root = document.createElement('div');
  setHtml(root, markup);
  return root;
}

describe('cardMarkup', () => {
  it('heads the card with the result and how it came', () => {
    const root = render(
      cardMarkup({
        outcome: { result: 'win', reason: 'mate', winner: 'white' },
        texts,
        coachId: 3,
      }),
    );
    expect(root.querySelector('.cdc-end__card--win .cdc-end__title')?.textContent).toBe('You won!');
    expect(root.querySelector('.cdc-end__reason')?.textContent).toBe('by checkmate');
    const avatar = queryOne(root, '.cdc-coach__avatar', HTMLElement);
    expect(avatar?.dataset.cdcCoachId).toBe('3');
    expect(avatar?.querySelector('.cdc-coach__face')).not.toBeNull();
  });

  it('leaves the reason out when the status doesn’t say', () => {
    const root = render(
      cardMarkup({ outcome: { result: 'draw', reason: 'draw', winner: null }, texts, coachId: 1 }),
    );
    expect(root.querySelector('.cdc-end__title')?.textContent).toBe('Draw');
    expect(root.querySelector('.cdc-end__reason')).toBeNull();
  });
});

describe('countsMarkup', () => {
  it('shows the player’s best moves, mistakes and blunders, blank until counted', () => {
    const blank = render(countsMarkup(null, en));
    expect(
      queryAll(blank, '.cdc-end__count', HTMLElement).map(chip => chip.dataset.cdcTip),
    ).toEqual(['Best', 'Mistake', 'Blunder']);
    expect(blank.textContent.trim()).toBe('');
    const counted = render(countsMarkup({ accuracy: 80, counts: { best: 7, blunder: 1 } }, en));
    expect(
      queryAll(counted, '.cdc-end__count b', HTMLElement).map(count => count.textContent),
    ).toEqual(['7', '0', '1']);
  });
});

describe('actionsMarkup', () => {
  it('leads to the review, then offers Lichess’s buttons it found', () => {
    const root = render(
      actionsMarkup(
        { reviewHref: '/abcd1234/white#12', newGame: 'New 5 | 3', rematch: null },
        texts,
      ),
    );
    expect(root.querySelector('a.cdc-end__review')?.getAttribute('href')).toBe(
      '/abcd1234/white#12',
    );
    expect(
      queryAll(root, '.cdc-end__btn', HTMLElement).map(button => button.dataset.cdcEnd),
    ).toEqual(['new-game']);
    const bare = render(actionsMarkup({ reviewHref: '/x', newGame: null, rematch: null }, texts));
    expect(bare.querySelector('.cdc-end__more')).toBeNull();
  });
});
