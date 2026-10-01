import { pickCoach } from '#shared/coach.ts';
import { isParsing, queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { readPageInitData } from '#shared/page-init-data.ts';
import { playedGame, type PlayedGame } from '#shared/round-init.ts';
import type { Stockfish } from '#page/review/engine/stockfish.ts';
import { bootEngine } from '#page/review/engine-pool.ts';
import { fetchExport } from '#page/review/game/export.ts';
import { opponentName } from './board.ts';
import { fetchFinishedGame, type FinishedGame } from './game-data.ts';
import { readOutcome } from './outcome.ts';
import { precomputeReview, worthReviewing } from './precompute.ts';
import { quickReview, quickSearch, summarize } from './quick-review.ts';
import { gameOverTexts } from './texts.ts';
import { mountGameOver, type GameOverView } from './view.ts';

// The end of a game the player watches end: the kings' badges, confetti for
// the winner, and a card where the coach counts the player's best moves and
// errors before sending them to Game Review, whose analysis then runs here,
// so the review is ready when opened, and its figures replace the count's.
// Only for a game that ends while the page is open: a finished game's page
// opens on its review instead.

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

/** The coach's count; the engine it ran on, or null when none ran or it failed. */
async function countMoves(
  view: GameOverView,
  game: PlayedGame,
  finished: FinishedGame,
): Promise<Stockfish | null> {
  const positions = finished.treeParts;
  const variant = finished.game.variant.key;
  if (!worthReviewing(variant, positions.length)) {
    view.verdict(null);
    return null;
  }
  view.analysing();
  const chess960 = variant === 'chess960';
  try {
    const [engine, book] = await Promise.all([
      bootEngine(chess960),
      bookPly(game.gameId, positions.length),
    ]);
    const analyse = quickSearch(engine);
    view.verdict(
      await quickReview({ positions, color: game.color, bookPly: book, chess960, analyse }),
    );
    return engine;
  } catch (error) {
    console.warn('[LichessDotCom] game over analysis', error);
    view.failed();
    return null;
  }
}

/** The game's page still shows it over: not another game, nor the same page gone. */
const showsOver = (main: HTMLElement, gameId: string): boolean =>
  main.isConnected &&
  main.querySelector('.result-wrap') !== null &&
  location.pathname.startsWith(`/${gameId}`);

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
  const texts = gameOverTexts();
  const view = mountGameOver({
    main,
    outcome,
    texts,
    coachId: pickCoach(),
    opponent: opponentName(main, game.color, texts.anonymous),
    reviewHref: `/${game.gameId}/${game.color}`,
  });
  const engine = await countMoves(view, game, finished);
  if (!engine) return;
  // Then Game Review's own analysis, for when the player opens it; the card
  // takes its figures, so both say the same.
  const positions = finished.treeParts;
  const variant = finished.game.variant.key;
  const records = await precomputeReview({
    gameId: game.gameId,
    positions,
    variant,
    engine,
    stillOver: () => showsOver(main, game.gameId),
  });
  if (!records) return;
  // Asked again: right after the game, the export may not know its opening yet.
  const book = await bookPly(game.gameId, positions.length);
  view.refine(
    summarize({
      positions,
      records,
      color: game.color,
      bookPly: book,
      chess960: variant === 'chess960',
    }),
  );
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
