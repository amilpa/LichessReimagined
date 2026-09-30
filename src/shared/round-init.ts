import { z } from 'zod/mini';
import { parseJson } from './json.ts';

// The game page's init data, as far as telling a game that has just begun:
// the start sound (page/sounds) and the players' intro (content/game/intro)
// both mark it.

const RoundInitSchema = z.object({
  data: z.object({
    game: z.object({
      id: z.string().check(z.minLength(1)),
      status: z.object({ name: z.enum(['created', 'started']) }),
      turns: z.optional(z.number()),
    }),
    player: z.object({ spectator: z.optional(z.boolean()) }),
  }),
});

/** The id of the game the page opens, if the player is in it and it has just begun. */
export function freshGameId(initData: string | null): string | null {
  const round = parseJson(initData, RoundInitSchema);
  if (!round) return null;
  const { game, player } = round.data;
  // At most one move in: Black may open the game after White's first.
  return !player.spectator && (game.turns ?? 0) <= 1 ? game.id : null;
}
