import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { en } from '#page/review/i18n/en.ts';
import type { Outcome } from './outcome.ts';
import { gameOverTexts } from './texts.ts';
import { mountGameOver, type GameOverInput } from './view.ts';

// The game page once the game is over, seen from White, and the follow-up.
const ROUND =
  '<main class="round"><div class="round__app">' +
  '<div class="round__app__board main-board"><div class="cg-wrap orientation-white"><cg-container><cg-board>' +
  '<piece class="white king"></piece><piece class="black king"></piece><piece class="black king ghost"></piece>' +
  '</cg-board></cg-container></div></div>' +
  '<div class="rcontrols"><div class="follow-up"><button class="fbt rematch white"><span>Rematch</span></button>' +
  '<a class="fbt" href="/abcd1234/white#9">Analysis board</a></div></div>' +
  '</div></main>';

const WIN: Outcome = { result: 'win', reason: 'resign', winner: 'white' };

function mount(outcome: Outcome): ReturnType<typeof mountGameOver> {
  const main = queryOne(document, 'main.round', HTMLElement);
  if (!main) throw new Error('no game page');
  const input: GameOverInput = {
    main,
    outcome,
    texts: gameOverTexts(),
    language: en,
    coachId: 2,
    reviewHref: '/abcd1234/white',
  };
  return mountGameOver(input);
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = ROUND;
  // Chessground keeps each piece's square in an expando.
  const [white, black] = queryAll(document, 'piece', HTMLElement);
  Object.assign(white ?? {}, { cgKey: 'e1' });
  Object.assign(black ?? {}, { cgKey: 'g8' });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('the game over', () => {
  it('badges each king on its square, over Lichess’s own badges', () => {
    mount(WIN);
    const main = queryOne(document, 'main.round', HTMLElement);
    expect(main?.dataset.cdcEnd).toBe('');
    const kings = queryAll(document, 'main.round > .cdc-end .cdc-end__king', HTMLElement);
    expect(kings.map(king => [king.className, king.getAttribute('style')])).toEqual([
      ['cdc-end__king cdc-end__king--win', '--column:4;--row:7'],
      ['cdc-end__king cdc-end__king--loss cdc-end__king--below', '--column:6;--row:0'],
    ]);
  });

  it('follows the kings when the board turns round', () => {
    mount(WIN);
    document.querySelector('.cg-wrap')?.classList.replace('orientation-white', 'orientation-black');
    vi.advanceTimersByTime(250);
    const white = document.querySelector('.cdc-end__king--win');
    expect(white?.getAttribute('style')).toBe('--column:3;--row:0');
  });

  it('throws confetti for the winner only', () => {
    mount(WIN);
    expect(document.querySelectorAll('.cdc-confetti__piece').length).toBeGreaterThan(0);
    vi.advanceTimersByTime(5000);
    expect(document.querySelector('.cdc-confetti')).toBeNull();
    document.body.innerHTML = ROUND;
    mount({ result: 'loss', reason: 'mate', winner: 'black' });
    expect(document.querySelector('.cdc-confetti')).toBeNull();
  });

  it('has the coach look at the moves, then give the counts and a word', () => {
    const posted = vi.spyOn(window, 'postMessage');
    const view = mount(WIN);
    view.analysing();
    const bubble = document.querySelector('.cdc-end__bubble');
    expect(bubble?.textContent).toBe('Going through your moves…');
    view.verdict({ accuracy: 91.24, counts: { best: 12, mistake: 1 } });
    expect(bubble?.textContent).toBe('Well played! You played with 91.2% accuracy.');
    const counts = queryAll(document, '.cdc-end__count b', HTMLElement).map(
      count => count.textContent,
    );
    expect(counts).toEqual(['12', '1', '0']);
    expect(posted.mock.calls.at(-1)?.[0]).toMatchObject({ coach: 2, mood: 'happy', talking: true });
    vi.advanceTimersByTime(1800);
    expect(posted.mock.calls.at(-1)?.[0]).toMatchObject({ mood: 'happy', talking: false });
  });

  it('drops the counts when it couldn’t look', () => {
    const view = mount(WIN);
    view.failed();
    expect(document.querySelector('.cdc-end__counts')).toBeNull();
    expect(document.querySelector('.cdc-end__bubble')?.textContent).toBe(gameOverTexts().failed);
  });

  it('leads to the review and presses Lichess’s buttons', () => {
    mount(WIN);
    const review = document.querySelector('.cdc-end__review');
    expect(review?.getAttribute('href')).toBe('/abcd1234/white#9');
    const rematch = vi.fn<() => void>();
    document.querySelector('.follow-up .rematch')?.addEventListener('click', rematch);
    queryOne(document, '.cdc-end__btn[data-cdc-end="rematch"]', HTMLElement)?.click();
    expect(rematch).toHaveBeenCalledOnce();
  });

  it('closes the card and keeps the badges', () => {
    mount(WIN);
    queryOne(document, '.cdc-end__close', HTMLElement)?.click();
    expect(document.querySelector('.cdc-end__card')).toBeNull();
    expect(document.querySelectorAll('.cdc-end__king')).toHaveLength(2);
  });
});
