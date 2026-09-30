import { expect, type BrowserContext, type Page } from '@playwright/test';
import { clickMove, orientationOf } from './board.ts';
import { watchExtensionErrors, type ExtensionError } from './errors.ts';
import { launchWithExtension } from './extension.ts';
import { openLichess } from './lichess.ts';

// A real-time game between two visitors of lichess.org, each in their own
// browser with the extension: one challenges a friend, the other joins.

export interface FriendGame {
  readonly white: Page;
  readonly black: Page;
  /** The joining side's browser, which the test's fixture doesn't close. */
  readonly guest: BrowserContext;
  /** What the extension threw or logged on the guest's pages. */
  readonly guestErrors: ExtensionError[];
}

export async function startFriendGame(host: Page): Promise<FriendGame> {
  await openLichess(host, '/?any#friend');
  // Real time rather than unlimited: the game gets a clock, and the follow-up its new game.
  await host.locator('.game-setup button[role=tab]').nth(1).click();
  await host.locator('.game-setup .lobby__start__button--friend').click();
  await host.waitForURL(/lichess\.org\/[A-Za-z0-9]{8}$/);
  const guest = await launchWithExtension({
    baseURL: 'https://lichess.org',
    viewport: host.viewportSize(),
    colorScheme: 'dark',
    reducedMotion: null,
  });
  const guestErrors: ExtensionError[] = [];
  const joiner = guest.pages()[0] ?? (await guest.newPage());
  watchExtensionErrors(joiner, guestErrors);
  await openLichess(joiner, host.url());
  await joiner.locator('form.accept button[type=submit]').click();
  for (const page of [host, joiner])
    await expect(page.locator('main.round cg-board piece').first()).toBeAttached();
  const hostIsWhite = (await orientationOf(host)) === 'white';
  return {
    white: hostIsWhite ? host : joiner,
    black: hostIsWhite ? joiner : host,
    guest,
    guestErrors,
  };
}

/** Whether chessground has a piece on `square` (its square is an expando of the element). */
const hasPieceOn = (page: Page, square: string): Promise<boolean> =>
  page.evaluate(
    target =>
      [...document.querySelectorAll('main.round cg-board piece')].some(
        piece => 'cgKey' in piece && piece.cgKey === target,
      ),
    square,
  );

/** Plays the moves in turn, White's first, each once both boards show the one before. */
export async function playMoves(game: FriendGame, moves: readonly string[]): Promise<void> {
  for (const [i, move] of moves.entries()) {
    const from = move.slice(0, 2);
    const to = move.slice(2, 4);
    await clickMove(i % 2 === 0 ? game.white : game.black, from, to);
    for (const page of [game.white, game.black])
      await expect.poll(() => hasPieceOn(page, to)).toBe(true);
  }
}
