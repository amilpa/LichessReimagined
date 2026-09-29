import type { ReviewLanguage } from '#page/review/i18n/types.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';

/** The game and its coach. Phrase picks hash both, so each coach words a move its own way. */
export interface CoachContext {
  /** Lichess's game id (`synthetic` on the free analysis board). */
  readonly gameId: string;
  /** The coach's number, 1 to COACH_COUNT. */
  readonly coach: number;
  readonly language: ReviewLanguage;
}

/** The seed of a move's picks: stable across redraws. */
export const moveSeed = (move: MoveVerdict, { gameId, coach }: CoachContext): string =>
  `${gameId}:${move.ply}:${move.uci}:${coach}`;
