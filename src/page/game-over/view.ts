import type { CoachMood } from '#shared/coach.ts';
import { closestTo, createElement, queryOne, setData } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import { postCoachState } from '#shared/protocol.ts';
import { wrapOrientation } from '#shared/chessground.ts';
import { cgKey } from '#page/lichess/chessground.ts';
import type { ReviewLanguage } from '#page/review/i18n/types.ts';
import { badgesMarkup, cellOf, kingBadges, type BoardCell } from './badges.ts';
import { actionsMarkup, cardMarkup, countsMarkup } from './card.ts';
import { CONFETTI_COUNT, confettiEndMs, confettiMarkup, confettiPieces } from './confetti.ts';
import { isFollowUpAction, pressFollowUp, readFollowUp } from './follow-up.ts';
import type { Outcome } from './outcome.ts';
import type { PlayerSummary } from './quick-review.ts';
import { formatAccuracy, type GameOverTexts } from './texts.ts';

// The game over on the board (styles/game/game-end.css): the kings' badges,
// the winner's confetti and the card, in one layer over the board that lets
// clicks through but on the card. The badges follow the kings as the player
// steps through the moves or flips the board.

const SYNC_MS = 250;
// The coach's mouth moves for about as long as the words take to read.
const TALK_MS = 1800;

export interface GameOverInput {
  readonly main: HTMLElement;
  readonly outcome: Outcome;
  readonly texts: GameOverTexts;
  readonly language: ReviewLanguage;
  readonly coachId: number;
  readonly reviewHref: string;
}

export interface GameOverView {
  readonly analysing: () => void;
  /** The coach's verdict; without a summary, the counts go. */
  readonly verdict: (summary: PlayerSummary | null) => void;
  readonly failed: () => void;
}

function kingCells(main: HTMLElement): Partial<Record<'white' | 'black', BoardCell>> {
  const wrap = queryOne(main, '.round__app__board .cg-wrap', HTMLElement);
  const cells: Partial<Record<'white' | 'black', BoardCell>> = {};
  if (!wrap) return cells;
  const bottom = wrapOrientation(wrap);
  for (const piece of wrap.querySelectorAll('cg-board piece.king:not(.ghost, .fading)')) {
    const square = cgKey(piece);
    const color = piece.classList.contains('white') ? 'white' : 'black';
    if (square) cells[color] = cellOf(square, bottom);
  }
  return cells;
}

function addConfetti(layer: HTMLElement): void {
  const pieces = confettiPieces(CONFETTI_COUNT, Math.random);
  layer.insertAdjacentHTML('beforeend', confettiMarkup(pieces).value);
  const confetti = layer.lastElementChild;
  setTimeout(() => confetti?.remove(), confettiEndMs(pieces));
}

interface Layer {
  readonly root: HTMLElement;
  readonly kings: HTMLElement;
  readonly card: HTMLElement | null;
  readonly bubble: HTMLElement | null;
  readonly counts: HTMLElement | null;
  readonly actions: HTMLElement | null;
}

function buildLayer({ outcome, texts, coachId }: GameOverInput): Layer {
  const root = createElement('div', { className: 'cdc-end' });
  const kings = createElement('div', { className: 'cdc-end__kings' });
  root.append(kings);
  if (outcome.result === 'win') addConfetti(root);
  root.insertAdjacentHTML('beforeend', cardMarkup({ outcome, texts, coachId }).value);
  const card = queryOne(root, '.cdc-end__card', HTMLElement);
  const part = (name: string): HTMLElement | null =>
    card ? queryOne(card, `.cdc-end__${name}`, HTMLElement) : null;
  return {
    root,
    kings,
    card,
    bubble: part('bubble'),
    counts: part('counts'),
    actions: part('actions'),
  };
}

/** Redraws the badges and the buttons when the kings or Lichess's buttons change. */
function followBoard(layer: Layer, input: GameOverInput): void {
  const badges = kingBadges(input.outcome, input.texts);
  let kingsKey = '';
  let actionsKey = '';
  const sync = (): void => {
    const cells = kingCells(input.main);
    const key = JSON.stringify(cells);
    if (key !== kingsKey) setHtml(layer.kings, badgesMarkup(badges, cells));
    kingsKey = key;
    const followUp = readFollowUp(input.reviewHref);
    const next = JSON.stringify(followUp);
    if (layer.actions && next !== actionsKey)
      setHtml(layer.actions, actionsMarkup(followUp, input.texts));
    actionsKey = next;
  };
  sync();
  const timer = setInterval(() => {
    if (layer.root.isConnected) sync();
    else clearInterval(timer);
  }, SYNC_MS);
}

/** Puts words in the coach's bubble, its mouth moving for a moment. */
function coachVoice(layer: Layer, coachId: number): (text: string, mood: CoachMood) => void {
  let quiet = 0;
  return (text, mood) => {
    if (!layer.bubble || !layer.card?.isConnected) return;
    layer.bubble.textContent = text;
    postCoachState({ coach: coachId, mood, talking: true });
    clearTimeout(quiet);
    quiet = window.setTimeout(
      () => postCoachState({ coach: coachId, mood, talking: false }),
      TALK_MS,
    );
  };
}

export function mountGameOver(input: GameOverInput): GameOverView {
  const { main, outcome, texts, language, coachId } = input;
  const layer = buildLayer(input);
  const { card, counts } = layer;
  setData(main, 'cdcEnd', '');
  main.append(layer.root);
  followBoard(layer, input);
  layer.root.addEventListener('click', event => {
    if (closestTo(event.target, '.cdc-end__close', HTMLElement)) card?.remove();
    const action = closestTo(event.target, '[data-cdc-end]', HTMLElement)?.dataset.cdcEnd;
    if (isFollowUpAction(action)) pressFollowUp(action);
  });
  const say = coachVoice(layer, coachId);
  return {
    analysing: () => {
      if (counts) setHtml(counts, countsMarkup(null, language));
      say(texts.analysing, 'neutral');
    },
    verdict: summary => {
      if (summary && counts) setHtml(counts, countsMarkup(summary, language));
      else counts?.remove();
      const accuracy = summary?.accuracy ?? null;
      const formatted = accuracy === null ? null : formatAccuracy(accuracy);
      say(texts.verdict(outcome.result, formatted), outcome.result === 'win' ? 'happy' : 'neutral');
    },
    failed: () => {
      counts?.remove();
      say(texts.failed, 'neutral');
    },
  };
}
