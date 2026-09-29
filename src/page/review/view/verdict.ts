import { html, type SafeHtml } from '#shared/html.ts';
import { classIcon } from '#page/review/classes/icon-svg.ts';
import type { CoachContext } from '#page/review/coach/context.ts';
import { explanation } from '#page/review/coach/explanation.ts';
import { type CommentPart, commentMarkup, streamFor } from '#page/review/comment/markup.ts';
import { verdictTitle } from '#page/review/comment/title.ts';
import type { JudgedMove, Session } from '#page/review/session.ts';
import { evalChip } from './markup.ts';

// The bubble for a judged move: its icon, the verdict and the score, then
// the coach's comment, typed out.

/** The extension's base URL, set on <html> by the content script at document_start. */
const assetsUrl = (): string => document.documentElement.dataset.cdcAssets ?? '';

const coachContext = (session: Session, gameId: string): CoachContext => ({
  gameId,
  coach: session.coach.id,
  language: session.language,
});

/**
 * A book move's opening: its own, or else the game's, named on the move that
 * reaches it. The export names only the game's last book position.
 */
export const openingOf = (session: Session, move: JudgedMove): string =>
  move.opening ?? (move.ply === session.work.bookPly ? session.view.openingName : '');

export interface VerdictInput {
  readonly move: JudgedMove;
  readonly gameId: string;
  /** Explain's sentences, in place of the comment; none for the comment. */
  readonly hint: readonly CommentPart[];
}

/** A judged move, and what the coach says of it. */
export interface CoachComment {
  readonly move: JudgedMove;
  readonly parts: readonly CommentPart[];
}

/** The coach's comment on a move, or Explain's hint in its place. */
export function commentOn(session: Session, { move, gameId, hint }: VerdictInput): CoachComment {
  const parts =
    hint.length > 0
      ? hint
      : explanation(move, coachContext(session, gameId), openingOf(session, move));
  return { move, parts };
}

/** Keeps the typing going through the renders of one comment; a new comment starts it over. */
export function followComment(session: Session, { parts }: CoachComment): void {
  session.stream.state = streamFor(session.stream.state, parts);
}

/** The verdict's bubble, its comment typed out as far as the typing has got. */
export function verdictMarkup(session: Session, { move, parts }: CoachComment): SafeHtml {
  const { language, stream } = session;
  const comment = commentMarkup(parts, { stream: stream.state, assets: assetsUrl(), language });
  return html`<div class="cdc-bubble__row">${classIcon(move.moveClass)}
      <p class="cdc-bubble__title">${verdictTitle(move.moveClass, move.san, language)}</p>
      ${evalChip(move.after)}</div>
    <p class="cdc-bubble__sub">${comment}</p>`;
}
