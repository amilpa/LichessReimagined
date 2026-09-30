import { describe, expect, it } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import { BOARDS } from '#content/boards/catalog.ts';
import { introMarkup, pickIntroBoard } from './markup.ts';
import type { IntroPlayer } from './players.ts';

const player = (name: string, extra: Partial<IntroPlayer> = {}): IntroPlayer => ({
  name,
  title: undefined,
  rating: undefined,
  flag: undefined,
  computer: false,
  ...extra,
});

function render(top: IntroPlayer, bottom: IntroPlayer): HTMLElement {
  const root = document.createElement('div');
  setHtml(root, introMarkup({ top, bottom }));
  return root;
}

describe('introMarkup', () => {
  it('puts the top player’s card on the dropped board and the bottom one’s on the board', () => {
    const root = render(
      player('Stockfish level 1', { rating: '~400', computer: true }),
      player('alice', { title: 'IM', rating: '2400', flag: '🇫🇷' }),
    );
    const top = queryOne(root, '.cdc-intro__drop > .cdc-intro__card--top', HTMLElement);
    const bottom = queryOne(root, '.cdc-intro__stay > .cdc-intro__card--bottom', HTMLElement);
    expect(top?.classList.contains('cdc-intro__card--computer')).toBe(true);
    expect(top?.querySelector('.cdc-intro__details')?.textContent).toBe('~400');
    expect(bottom?.classList.contains('cdc-intro__card--computer')).toBe(false);
    expect(bottom?.querySelector('.cdc-intro__title')?.textContent).toBe('IM');
    expect(bottom?.querySelector('.cdc-intro__username')?.textContent).toBe('alice');
    expect(bottom?.querySelector('.cdc-intro__details')?.textContent).toBe('2400 🇫🇷');
    expect(
      root.querySelector('.cdc-intro__vs > .cdc-intro__swords + .cdc-intro__versus')?.textContent,
    ).toBe('VS');
  });

  it('leaves out what a player lacks, and escapes names', () => {
    const root = render(player('<b>x</b>'), player('Anonymous'));
    expect(queryAll(root, '.cdc-intro__title, .cdc-intro__details', HTMLElement)).toEqual([]);
    expect(root.querySelector('b')).toBeNull();
    expect(root.querySelector('.cdc-intro__username')?.textContent).toBe('<b>x</b>');
  });
});

describe('pickIntroBoard', () => {
  const [first, second] = BOARDS;

  it('never picks the board shown', () => {
    expect(pickIntroBoard(first.id, () => 0)).toBe(second?.id);
    expect(pickIntroBoard(second?.id, () => 0)).toBe(first.id);
  });

  it('may pick any board when Lichess draws its own', () => {
    expect(pickIntroBoard('lichess', () => 0)).toBe(first.id);
    expect(pickIntroBoard('lichess', () => 0.999_999)).toBe(BOARDS.at(-1)?.id);
  });
});
