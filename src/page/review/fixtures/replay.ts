import { z } from 'zod/mini';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import { StoredRecordCodec } from '#page/review/evaluation/stored.ts';
import { judge } from '#page/review/judge/judge.ts';
import type { GamePosition, MoveVerdict, PlayedPosition } from '#page/review/judge/types.ts';
import judged from '#page/review/judge/fixtures/legacy.json' with { type: 'json' };
import games from './games.json' with { type: 'json' };

// The games the original script's fixtures were recorded on, replayed through
// the port: each move judged from the records the original computed.

const PositionSchema = z.object({
  ply: z.number(),
  fen: z.string(),
  uci: z.optional(z.string()),
  san: z.optional(z.string()),
});

const GameSchema = z.object({
  id: z.string(),
  name: z.string(),
  chess960: z.boolean(),
  bookPly: z.number(),
  coach: z.number(),
  opening: z.string(),
  nodes: z.array(PositionSchema),
});

const RecordsSchema = z.array(z.object({ records: z.array(StoredRecordCodec) }));

export interface FixtureGame extends z.infer<typeof GameSchema> {
  readonly records: readonly PositionRecord[];
}

export function fixtureGames(): FixtureGame[] {
  const records = RecordsSchema.parse(judged);
  return z
    .array(GameSchema)
    .parse(games)
    .map((game, i) => Object.assign(game, { records: records[i]?.records ?? [] }));
}

function played(position: GamePosition): PlayedPosition {
  const { uci, san } = position;
  if (uci === undefined || san === undefined) throw new Error(`no move at ply ${position.ply}`);
  return { ...position, uci, san };
}

/** Every move of a game, judged in order as the review does. */
export function replay(game: FixtureGame): MoveVerdict[] {
  const moves: MoveVerdict[] = [];
  for (let i = 1; i < game.nodes.length; i++) {
    const previousPosition = game.nodes[i - 1];
    const position = game.nodes[i];
    const before = game.records[i - 1];
    const after = game.records[i];
    if (!previousPosition || !position || !before || !after) throw new Error(`ply ${i} missing`);
    moves.push(
      judge({
        previousPosition,
        position: played(position),
        before,
        after,
        previousMove: moves[i - 2],
        book: i <= game.bookPly,
        chess960: game.chess960,
      }),
    );
  }
  return moves;
}

/** The original's color letters. */
export const legacyColor = (color: 'white' | 'black'): string => (color === 'white' ? 'w' : 'b');
