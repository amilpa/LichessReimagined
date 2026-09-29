import type { Analysis } from '#page/lichess/analysis.ts';
import { firstChild, parentPath } from '#page/lichess/tree.ts';
import { normalizeUci } from '#page/review/chess/notation.ts';
import { judgeAt } from '#page/review/live/judging.ts';
import type { BestShown, JudgedMove, Session } from '#page/review/session.ts';

// Moving through the game: the review's buttons, its graph and its player.

const PLAY_STEP_MS = 1200;

/** The move on the board: the game's, from the review, or one played off it (judged as it comes). */
export function reviewMove(session: Session, analysis: Analysis): JudgedMove | null {
  const { review } = session.view;
  const { path } = analysis;
  if (!review || !path) return null;
  if (analysis.onMainline) return review.moves[analysis.node.ply - 1] ?? null;
  return judgeAt(session.live, analysis, path);
}

/** The engine's best move, when it's on the board in place of the move played (the Best button). */
export function bestShown(session: Session, analysis: Analysis): JudgedMove | null {
  const shown = session.view.bestOf;
  const { path, node } = analysis;
  if (!shown || path === shown.path || path !== parentPath(shown.path) + node.id) return null;
  return normalizeUci(node.uci, analysis.chess960) === shown.move.best ? shown.move : null;
}

export function jump(analysis: Analysis, ply: number): void {
  analysis.jumpToMain(ply);
  analysis.redraw();
}

export function goTo(analysis: Analysis, path: string): void {
  analysis.userJump(path);
  analysis.redraw();
}

/** Plays the engine's best move as a variation in place of the one played, or goes back to that one. */
export function showBest(session: Session, analysis: Analysis): void {
  const { view } = session;
  if (view.bestOf && bestShown(session, analysis)) {
    goTo(analysis, view.bestOf.path);
    return;
  }
  const move = reviewMove(session, analysis);
  if (!move?.best || !analysis.canPlayUci) return;
  const best: BestShown = { path: analysis.path, move };
  view.bestOf = best;
  goTo(analysis, parentPath(analysis.path));
  analysis.playUci(move.best);
  analysis.redraw();
}

/**
 * Where the arrows lead along the line on the board: from the best move
 * shown, back to the move it stands for, or on to the one after that.
 */
export function stepPath(session: Session, analysis: Analysis, direction: 1 | -1): string | null {
  const { path } = analysis;
  const shown = session.view.bestOf;
  const from = shown && bestShown(session, analysis) ? shown.path : path;
  if (direction < 0) {
    if (from !== path) return from;
    return from ? parentPath(from) : null;
  }
  const next = firstChild(analysis.nodeAtPath(from));
  return next ? from + next.id : null;
}

export function stopPlaying(session: Session): void {
  const { view } = session;
  if (view.playing !== null) clearInterval(view.playing);
  view.playing = null;
}

/** The play button: a move every 1.2 s along the game, until its end or a move off it. */
export function togglePlay(session: Session, analysis: Analysis): void {
  if (session.view.playing !== null) {
    stopPlaying(session);
    return;
  }
  const step = (): void => {
    const last = analysis.mainline.length - 1;
    if (!analysis.onMainline || analysis.node.ply >= last) {
      stopPlaying(session);
      session.redraw(true);
      return;
    }
    jump(analysis, analysis.node.ply + 1);
  };
  session.view.playing = setInterval(step, PLAY_STEP_MS);
  step();
}

/**
 * Closes Lichess's tools for the move-by-move review, which hides their
 * buttons. Left open, their menu would take the review's move list, and
 * "practice with computer" would play moves on its own.
 */
export function closeTools(analysis: Analysis): void {
  analysis.closeActionMenu();
  analysis.stopPractice();
  analysis.redraw();
}
