import { pickCoach } from '#shared/coach.ts';
import { isParsing, queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { readPageInitData } from '#shared/page-init-data.ts';
import { playedGame, type PlayedGame } from '#shared/round-init.ts';
import { fetchExport } from '#page/review/game/export.ts';
import { pageLanguage } from '#page/review/i18n/language.ts';
import { REVIEWED_VARIANTS } from '#page/review/variants.ts';
import { fetchFinishedGame, type FinishedGame } from './game-data.ts';
import { readOutcome } from './outcome.ts';
import { bootQuickEngine, quickReview } from './quick-review.ts';
import { gameOverTexts } from './texts.ts';
import { mountGameOver, type GameOverView } from './view.ts';

// The end of a game the player watches end: the kings' badges, confetti for
// the winner, and a card where the coach counts the player's best moves and
// errors before sending them to Game Review. Only for a game that ends while
// the page is open: a finished game's page opens on its review instead.

const WATCH_MS = 250;
// Our layout's: below, the board isn't in the grid the game over is placed in.
const DESKTOP = '(min-width: 1020px)';

async function bookPly(gameId: string, positions: number): Promise<number> {
  try {
    return (await fetchExport(gameId, positions))?.bookPly ?? 0;
  } catch {
    return 0;
  }
}

async function countMoves(
  view: GameOverView,
  game: PlayedGame,
  finished: FinishedGame,
): Promise<void> {
  const positions = finished.treeParts;
  const variant = finished.game.variant.key;
  if (!REVIEWED_VARIANTS.has(variant) || positions.length < 2) {
    view.verdict(null);
    return;
  }
  view.analysing();
  const chess960 = variant === 'chess960';
  try {
    const [analyse, book] = await Promise.all([
      bootQuickEngine(chess960),
      bookPly(game.gameId, positions.length),
    ]);
    view.verdict(
      await quickReview({ positions, color: game.color, bookPly: book, chess960, analyse }),
    );
  } catch (error) {
    console.warn('[LichessDotCom] game over analysis', error);
    view.failed();
  }
}

async function onGameEnd(game: PlayedGame, main: HTMLElement): Promise<void> {
  const outcomeOf = (finished: FinishedGame): ReturnType<typeof readOutcome> =>
    readOutcome({
      status: finished.game.status.name,
      winner: finished.game.winner,
      player: game.color,
    });
  const finished = await fetchFinishedGame(game.gameId, data => outcomeOf(data) !== null);
  const outcome = finished && outcomeOf(finished);
  if (!finished || !outcome || !main.isConnected) return;
  const view = mountGameOver({
    main,
    outcome,
    texts: gameOverTexts(),
    language: pageLanguage(),
    coachId: pickCoach(),
    reviewHref: `/${game.gameId}/${game.color}`,
  });
  await countMoves(view, game, finished);
}

/** Waits for the game's result to show, then plays its end once. */
function watchEnd(game: PlayedGame): void {
  const timer = setInterval(() => {
    const main = queryOne(document, 'main.round', HTMLElement);
    if (!main?.querySelector('.result-wrap')) return;
    clearInterval(timer);
    if (window.matchMedia(DESKTOP).matches) void onGameEnd(game, main);
  }, WATCH_MS);
}

export const gameOver: Feature = {
  name: 'game over',
  start: () => {
    // Lichess removes its init data once read: only a script running while
    // the page parses sees it.
    if (!isParsing()) return;
    readPageInitData(text => {
      const game = playedGame(text);
      if (game) watchEnd(game);
    });
  },
};
