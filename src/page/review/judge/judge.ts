import { fenTurn } from '#shared/chess/index.ts';
import { isSacrifice } from '#page/review/chess/material.ts';
import { normalizeUci, uciToSan } from '#page/review/chess/notation.ts';
import { type MoveClass, RANK } from '#page/review/classes/classes.ts';
import { forColor, moveAccuracy } from '#page/review/evaluation/score.ts';
import { mateVerdict, SURE_MATE } from './mate.ts';
import type { JudgeInput, MoveVerdict } from './types.ts';

interface Standing {
  readonly before: number;
  readonly after: number;
  readonly loss: number;
  /** The engine's second line, from the mover's view. */
  readonly second: number | null;
}

function lossClass(loss: number): MoveClass {
  if (loss < 2) return 'excellent';
  if (loss < 5) return 'good';
  if (loss < 10) return 'inaccuracy';
  return loss < 20 ? 'mistake' : 'blunder';
}

function topClass(input: JudgeInput, { before, after, loss, second }: Standing): MoveClass {
  const { previousPosition, position } = input;
  if (
    after >= 50 &&
    before < 95 &&
    loss < 2 &&
    isSacrifice(previousPosition.fen, position.fen, position.uci)
  )
    return 'brilliant';
  // The only good move: the second best was far worse.
  if (second !== null && before - second >= 15 && before < 97 && after > 25) return 'great';
  return 'best';
}

function longMate({ before, previousPosition }: JudgeInput): boolean {
  if (!('mate' in before)) return false;
  const own = fenTurn(previousPosition.fen) === 'white' ? before.mate : -before.mate;
  return own > SURE_MATE;
}

function baseClass(input: JudgeInput, standing: Standing, isBest: boolean): MoveClass {
  if (input.book) return 'book';
  // Another way to a mate too long to judge by distance loses no win
  // probability, but it isn't the engine's move.
  if (!isBest && standing.loss < 0.5 && longMate(input)) return 'excellent';
  if (isBest || standing.loss < 0.5) return topClass(input, standing);
  const moveClass = lossClass(standing.loss);
  // An error right after the opponent's own is a missed punishment.
  const punishable = (input.previousMove?.loss ?? 0) >= 10 && standing.before >= 60;
  return (moveClass === 'mistake' || moveClass === 'blunder') && punishable ? 'miss' : moveClass;
}

/** Judges one move from the engine's records of the positions before and after it. */
export function judge(input: JudgeInput): MoveVerdict {
  const { previousPosition, position, before: recordBefore, after: recordAfter } = input;
  const color = fenTurn(previousPosition.fen);
  const before = forColor(recordBefore.whiteWinChance, color);
  const after = forColor(recordAfter.whiteWinChance, color);
  const loss = Math.max(0, before - after);
  const second =
    recordBefore.secondLineWinChance === null
      ? null
      : forColor(recordBefore.secondLineWinChance, color);
  const isBest = normalizeUci(position.uci, input.chess960) === recordBefore.best;
  let moveClass = baseClass(input, { before, after, loss, second }, isBest);
  const mated = isBest || input.book ? null : mateVerdict(recordBefore, recordAfter, color);
  if (mated && RANK.indexOf(moveClass) < RANK.indexOf(mated)) moveClass = mated;
  return {
    ply: position.ply,
    san: position.san,
    uci: position.uci,
    color,
    moveClass,
    loss,
    slower: mated !== null && moveClass === mated,
    accuracy: moveClass === 'book' ? 100 : moveAccuracy(loss),
    best: recordBefore.best,
    bestSan: uciToSan(previousPosition.fen, recordBefore.best),
    before: recordBefore,
    after: recordAfter,
    position,
    previousPosition,
    previousMove: input.previousMove ?? null,
  };
}
