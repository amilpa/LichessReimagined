import type { Color } from '#shared/chess/index.ts';
import type { MoveClass } from '#page/review/classes/classes.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';

/** A position of the game or of a variation, as Lichess's tree node has it. */
export interface GamePosition {
  readonly ply: number;
  readonly fen: string;
  /** The move that led here, in Lichess's notation (castling as king takes rook). */
  readonly uci?: string | undefined;
  readonly san?: string | undefined;
}

/** A position reached by a move. */
export interface PlayedPosition extends GamePosition {
  readonly uci: string;
  readonly san: string;
}

/** A position reached by a move: every one but the start. */
export const isPlayed = <T extends GamePosition>(position: T): position is T & PlayedPosition =>
  position.uci !== undefined && position.san !== undefined;

/** A judged move: its verdict, and what the coach explains it from. */
export interface MoveVerdict {
  readonly ply: number;
  readonly san: string;
  readonly uci: string;
  readonly color: Color;
  readonly moveClass: MoveClass;
  /** Win probability the mover gave away, 0 to 100. */
  readonly loss: number;
  /** The verdict came from mate distances: a mate slowed down, or let in sooner. */
  readonly slower: boolean;
  readonly accuracy: number;
  /** The engine's move from the position before, in its own notation. */
  readonly best: string | null;
  readonly bestSan: string;
  readonly before: PositionRecord;
  readonly after: PositionRecord;
  readonly position: PlayedPosition;
  readonly previousPosition: GamePosition;
  /** The opponent's move just before: a miss fails to punish it. */
  readonly previousMove: MoveVerdict | null;
}

export interface JudgeInput {
  readonly previousPosition: GamePosition;
  readonly position: PlayedPosition;
  /** The engine's records of the two positions. */
  readonly before: PositionRecord;
  readonly after: PositionRecord;
  readonly previousMove?: MoveVerdict | null | undefined;
  /** Every move up to this one is theory. */
  readonly book: boolean;
  readonly chess960: boolean;
}
