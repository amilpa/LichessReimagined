import type { Color } from '#shared/chess/types.ts';

// How a game ended, for its player: from its status and winner as Lichess
// names them (lila's chess.Status), never from the page's words.

export type Result = 'win' | 'loss' | 'draw';

export type EndReason = 'mate' | 'resign' | 'time' | 'left' | 'stalemate' | 'draw' | 'other';

export interface Outcome {
  readonly result: Result;
  readonly reason: EndReason;
  readonly winner: Color | null;
}

const UNFINISHED: ReadonlySet<string> = new Set(['created', 'started', 'aborted', 'noStart']);

const REASONS: ReadonlyMap<string, EndReason> = new Map([
  ['mate', 'mate'],
  ['resign', 'resign'],
  ['outoftime', 'time'],
  // The opponent left and the player claimed the win.
  ['timeout', 'left'],
  ['stalemate', 'stalemate'],
  // Agreement, repetition, the fifty moves, insufficient material.
  ['draw', 'draw'],
  ['insufficientMaterialClaim', 'draw'],
]);

export interface OutcomeInput {
  readonly status: string;
  readonly winner: Color | undefined;
  readonly player: Color;
}

/** The game's outcome for `player`, or null if it isn't over (or never started). */
export function readOutcome({ status, winner, player }: OutcomeInput): Outcome | null {
  if (UNFINISHED.has(status)) return null;
  const reason = REASONS.get(status) ?? 'other';
  if (winner === undefined) return { result: 'draw', reason, winner: null };
  return { result: winner === player ? 'win' : 'loss', reason, winner };
}
