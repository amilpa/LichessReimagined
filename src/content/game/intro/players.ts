import { queryOne } from '#shared/dom.ts';
import { nonEmpty } from '#shared/text.ts';

// What a player's card shows, read off their bar as Lichess drew it, so the
// names are the page's own ("Anonymous", "Stockfish level 3" in its language).

export interface IntroPlayer {
  readonly name: string;
  readonly title: string | undefined;
  readonly rating: string | undefined;
  readonly flag: string | undefined;
  readonly computer: boolean;
}

// A user's name is a profile link with the title in a span of its own; an
// anonymous player's or the computer's is a bare `name`.
function barName(bar: HTMLElement): string {
  const link = queryOne(bar, 'a.user-link', HTMLElement);
  if (!link) return bar.querySelector('name')?.textContent.trim() ?? '';
  const texts = [...link.childNodes].filter(node => node instanceof Text);
  return texts
    .map(node => node.data)
    .join('')
    .trim();
}

/** The player of a bar; the computer has no rating there, so it comes from its level. */
export function readPlayer(bar: HTMLElement, computerRating: string | undefined): IntroPlayer {
  return {
    name: barName(bar),
    title: nonEmpty(bar.querySelector('.utitle')?.textContent.trim()),
    rating: computerRating ?? nonEmpty(bar.querySelector('rating')?.textContent.trim()),
    flag: nonEmpty(bar.dataset.cdcFlag),
    computer: computerRating !== undefined,
  };
}
