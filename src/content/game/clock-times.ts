import { z } from 'zod/mini';

// A finished game's clock history, from Lichess's game export
// (/game/export/<id>?clocks=true): the round data has none.

const ClockSchema = z.object({ initial: z.number(), increment: z.number() });

/** A game's time control, in seconds. */
export type Clock = z.infer<typeof ClockSchema>;

export const GameExportSchema = z.object({
  clock: z.optional(ClockSchema),
  // Centiseconds left after each move. A game without a clock has none.
  clocks: z.optional(z.array(z.number())),
});

export type GameExport = z.infer<typeof GameExportSchema>;

/** The centiseconds spent on each move. */
export function spentTimes({ clock, clocks = [] }: GameExport): number[] {
  const initial = (clock?.initial ?? 0) * 100;
  const increment = (clock?.increment ?? 0) * 100;
  // Lichess's clock only starts after each side's first move.
  return clocks.map((left, i) =>
    Math.max(0, i < 2 ? initial - left : (clocks[i - 2] ?? 0) + increment - left),
  );
}

/** "4.2s" under a minute, "1:05" from there. */
export function formatSpent(centiseconds: number): string {
  const seconds = centiseconds / 100;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
