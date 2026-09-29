import { afterEach, describe, expect, it } from 'vitest';
import { refresh, setDeep } from '#page/review/game/work.ts';
import { fakeGame, newSession } from '#page/review/fixtures/unit-review.ts';
import type { Session } from '#page/review/session.ts';
import { openingOf } from './verdict.ts';

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
});

/** A session whose game, `name`, is judged at full depth, its opening from the export. */
function judgedGame(name: string): Session {
  const { fixture, facade } = fakeGame(name);
  const session = newSession();
  session.work.nodes = facade.mainline;
  session.work.bookPly = fixture.bookPly;
  session.view.openingName = fixture.opening;
  for (const [i, record] of fixture.records.entries()) setDeep(session, i, record);
  refresh(session, facade);
  return session;
}

describe('a book move of the game', () => {
  it('names the export’s opening only on the move that reaches it', () => {
    const session = judgedGame('opera');
    const book = (session.view.review?.moves ?? []).filter(move => move?.moveClass === 'book');
    expect(book.map(move => move?.ply)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const named = book.map(move => (move ? openingOf(session, move) : null));
    expect(named).toEqual([
      ...Array.from({ length: 8 }, () => ''),
      'Sicilian Defense: Najdorf Variation',
    ]);
  });

  it('keeps the name a move played off the game carries', () => {
    const session = judgedGame('opera');
    const first = session.view.review?.moves[0];
    if (!first) throw new Error('the first move is not judged');
    expect(openingOf(session, { ...first, opening: 'King’s Pawn Game' })).toBe('King’s Pawn Game');
  });
});
