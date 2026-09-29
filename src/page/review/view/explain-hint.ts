import { lineMoves } from '#page/review/chess/line.ts';
import type { CommentPart } from '#page/review/comment/markup.ts';
import { lineToken, moveToken } from '#page/review/comment/tokens.ts';
import {
  BEST_PLIES,
  bestRequest,
  explainLines,
  PUNISHMENT_PLIES,
} from '#page/review/explain/lines.ts';
import type { JudgedMove, Session } from '#page/review/session.ts';
import { openingOf } from './verdict.ts';

// What Explain says in place of the coach's comment: a book move's opening,
// or the engine's lines around a move that wasn't best.

const say = (text: string, droppable = false): CommentPart => ({ text, droppable });

/** A line written from `fen`, cut to `plies`. */
const written = (fen: string, line: readonly string[], plies: number): string =>
  lineToken(lineMoves(fen, line.slice(0, plies)));

function linesHint(session: Session, move: JudgedMove): CommentPart[] {
  const { ui } = session.language;
  const lines = explainLines(session, move);
  // Until the engine has played the lines out, and when the best is one move long, the move alone.
  const best = lines && lines.best.length > 1 ? lines.best : null;
  const bestPart = best
    ? ui.lines.best(written(move.previousPosition.fen, best, BEST_PLIES))
    : ui.bestWas(moveToken(move.bestSan, move.color));
  const punishment = lines?.punishment;
  if (!punishment) return [say(bestPart)];
  const line = written(move.position.fen, punishment, PUNISHMENT_PLIES);
  return [say(bestPart), say(ui.lines.allows(moveToken(move.san, move.color), line), true)];
}

/** Explain's sentences for `move`, none when it has nothing to add to the comment. */
export function explainHint(session: Session, move: JudgedMove): CommentPart[] {
  if (move.moveClass === 'book') {
    const opening = openingOf(session, move);
    return opening ? [say(opening)] : [];
  }
  return bestRequest(move) && move.bestSan ? linesHint(session, move) : [];
}
