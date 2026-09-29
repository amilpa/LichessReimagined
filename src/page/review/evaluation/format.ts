import type { Score } from './score.ts';

/** "+1.25", "-0.40", "+M3", "#" (mated). */
export function formatEval(score: Score | null | undefined): string {
  if (!score) return '';
  if ('mate' in score) {
    if (score.mate === 0) return '#';
    return (score.mate > 0 ? '+M' : '-M') + Math.abs(score.mate);
  }
  const pawns = score.cp / 100;
  return (pawns > 0 ? '+' : '') + pawns.toFixed(2);
}

/** The eval bar's label: "1.3", "M3", nothing once mated. */
export function barLabel(score: Score | null | undefined): string {
  if (!score) return '';
  if ('mate' in score) return score.mate === 0 ? '' : `M${Math.abs(score.mate)}`;
  return Math.abs(score.cp / 100).toFixed(1);
}
