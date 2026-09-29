import type { Analysis } from '#page/lichess/analysis.ts';
import { lastNodeId, parentPath, pathPrefixes } from '#page/lichess/tree.ts';
import { formatEval } from '#page/review/evaluation/format.ts';
import { judge } from '#page/review/judge/judge.ts';
import { isPlayed } from '#page/review/judge/types.ts';
import type { BookEntry, LiveState, JudgedMove } from '#page/review/session.ts';

// The free board's tree grows as the user plays: every position is analyzed
// once, by FEN, and every move judged from its two positions once they're in.

/** Deeper than this, no move is "book". */
export const BOOK_PLIES = 30;
/** Master games a position needs to be "book". */
export const BOOK_GAMES = 10;

/**
 * Whether the move to `path` is a book move: every move up to it is played
 * in master games. Undefined while that's still being looked up.
 */
export function bookAt(live: LiveState, analysis: Analysis, path: string): boolean | undefined {
  let book: boolean | undefined = true;
  for (const prefix of pathPrefixes(path)) {
    const node = analysis.nodeAtPath(prefix);
    if (live.noBook || node.ply > BOOK_PLIES) return false;
    book = live.books.get(node.fen)?.book;
    if (book !== true) break;
  }
  return book;
}

/** The last named opening along `path`: a move out of the book keeps the line's name. */
export function openingAt(live: LiveState, analysis: Analysis, path: string): BookEntry | null {
  for (let at = path; at; at = parentPath(at)) {
    const entry = live.books.get(analysis.nodeAtPath(at).fen);
    if (entry?.name) return entry;
  }
  return null;
}

function judgeNode(live: LiveState, analysis: Analysis, path: string): JudgedMove | null {
  const node = analysis.nodeAtPath(path);
  const up = parentPath(path);
  const previous = analysis.nodeAtPath(up);
  const before = live.evals.get(previous.fen);
  const after = live.evals.get(node.fen);
  const book = bookAt(live, analysis, path);
  if (!before || !after || book === undefined || !isPlayed(node)) return null;
  const move = judge({
    previousPosition: previous,
    position: node,
    before,
    after,
    previousMove: judgeAt(live, analysis, up),
    book,
    chess960: analysis.chess960,
  });
  return { ...move, opening: openingAt(live, analysis, path)?.name ?? '' };
}

/** The move to `path`, judged, or null until its positions are analyzed. */
export function judgeAt(live: LiveState, analysis: Analysis, path: string): JudgedMove | null {
  if (!path) return null;
  const node = analysis.nodeAtPath(path);
  // A stale path, which Lichess answers with the deepest node it found.
  if (node.id !== lastNodeId(path)) return null;
  const hit = live.judged.get(path);
  if (hit?.node === node) return hit.move;
  const move = judgeNode(live, analysis, path);
  live.judged.set(path, { node, move });
  return move;
}

/** What the coach's bubble shows of a move, to draw it again only when that changes. */
export function liveDigest(move: JudgedMove | null): string {
  if (!move) return '';
  return [
    move.moveClass,
    formatEval(move.after),
    move.after.best ?? '',
    move.best ?? '',
    move.opening ?? '',
    move.previousMove?.moveClass ?? '',
  ].join(',');
}
