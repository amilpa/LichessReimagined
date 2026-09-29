import { queryOne } from '#shared/dom.ts';
import { html, type SafeHtml, setHtml } from '#shared/html.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { GOOD } from '#page/review/classes/classes.ts';
import { classIcon } from '#page/review/classes/icon-svg.ts';
import { verdictTitle } from '#page/review/comment/title.ts';
import { moveToken } from '#page/review/comment/tokens.ts';
import type { JudgedMove, Session } from '#page/review/session.ts';
import type { PanelAction } from './actions.ts';
import { avatarMarkup, takeReaction } from './coach-avatar.ts';
import { movesGraph } from './graph.ts';
import { bubbleTitle, evalChip, header, type IconName, svgIcon } from './markup.ts';
import { bestShown, reviewMove, stepPath } from './navigation.ts';
import {
  type CoachComment,
  commentOn,
  followComment,
  openingOf,
  verdictMarkup,
} from './verdict.ts';

// The move-by-move review: the coach on the move on the board, the Explain /
// Best / Next buttons, the player's controls and the graph.

/** Explain swaps the comment for the opening's name, or the move that was best. */
function explainHint(session: Session, move: JudgedMove): string {
  if (!session.view.explain) return '';
  if (move.moveClass === 'book') return openingOf(session, move);
  if (!GOOD.has(move.moveClass) && move.bestSan)
    return session.language.ui.bestWas(moveToken(move.bestSan, move.color));
  return '';
}

interface BubbleInput {
  /** The move on the board, judged, and the coach's comment on it. */
  readonly comment: CoachComment | null;
  /** The engine's best move, played in place of the move on the board. */
  readonly shown: JudgedMove | null;
}

function bubbleMarkup(
  session: Session,
  analysis: Analysis,
  { comment, shown }: BubbleInput,
): SafeHtml {
  const { view, live, language } = session;
  const { ui } = language;
  if (!view.review) return bubbleTitle(`${ui.analysing} ${Math.round(view.progress * 100)}%`);
  if (shown)
    return html`<div class="cdc-bubble__row">${classIcon('best')}
          <p class="cdc-bubble__title">${verdictTitle('best', analysis.node.san ?? '', language)}</p>
          ${evalChip(shown.before)}</div>`;
  if (!comment) {
    // No verdict yet: the move waits for the engine, as the game's own moves do
    // while the game's analysis runs.
    const error = analysis.onMainline ? view.error : live.error;
    return bubbleTitle(analysis.path ? (error ?? ui.thinking) : ui.intro);
  }
  return verdictMarkup(session, comment);
}

/** What the coach says of the move on the board, when the bubble shows its verdict. */
function movesComment(
  session: Session,
  analysis: Analysis,
  { move, shown }: { readonly move: JudgedMove | null; readonly shown: JudgedMove | null },
): CoachComment | null {
  if (!session.view.review || shown || !move) return null;
  const hint = explainHint(session, move);
  return commentOn(session, { move, gameId: analysis.gameId, hint });
}

/** The player's controls, each drawn with the icon of its name. */
const CONTROLS: readonly (PanelAction & IconName)[] = ['first', 'prev', 'play', 'next', 'last'];

function controlsMarkup(playing: boolean): SafeHtml {
  const buttons = CONTROLS.map(action => {
    const icon: IconName = action === 'play' && playing ? 'pause' : action;
    return html`<button class="cdc-btn" data-cdc="${action}">${svgIcon(icon)}</button>`;
  });
  return html`${buttons}`;
}

// jumpToMain doesn't scroll Lichess's move list: keep the move in view.
function scrollMoveList(): void {
  const box = queryOne(document, 'main.analyse .analyse__moves', HTMLElement);
  const active = box && queryOne(box, 'move.active', HTMLElement);
  if (!box || !active) return;
  const top = active.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
  box.scrollTop = top - box.clientHeight / 2 + active.offsetHeight / 2;
}

export function renderMoves(session: Session, analysis: Analysis): void {
  const { view, language, elements } = session;
  const { ui } = language;
  const move = reviewMove(session, analysis);
  const shown = bestShown(session, analysis);
  const comment = movesComment(session, analysis, { move, shown });
  if (comment) followComment(session, comment);
  const bubble = bubbleMarkup(session, analysis, { comment, shown });
  const atEnd = !stepPath(session, analysis, 1);
  const canBest = shown !== null || (move?.best && !GOOD.has(move.moveClass));
  const moveClass = shown ? null : (move?.moveClass ?? null);
  const avatar = avatarMarkup({
    coachId: session.coach.id,
    moveClass,
    react: takeReaction(session.coach, moveClass, analysis.path),
    label: ui.coach,
  });
  setHtml(
    elements.panel,
    html`${header(ui.review, 'summary', language)}
      <div class="cdc-coach">${avatar}<div class="cdc-bubble">${bubble}</div></div>
      <div class="cdc-review__nav">
        <button class="cdc-btn${view.explain ? ' cdc-btn--on' : ''}" data-cdc="explain">${svgIcon('bulb')}${ui.explain}</button>
        <button class="cdc-btn${shown ? ' cdc-btn--on' : ''}" data-cdc="best" ${canBest ? '' : 'disabled'}>${svgIcon('star')}${ui.best}</button>
        <button class="cdc-btn cdc-btn--green" data-cdc="next" ${atEnd ? 'disabled' : ''}>${svgIcon('arrow')}${ui.next}</button>
      </div>`,
  );
  setHtml(elements.controls, controlsMarkup(view.playing !== null));
  movesGraph(session, analysis, true);
  requestAnimationFrame(scrollMoveList);
}
