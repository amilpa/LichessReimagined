import { z } from 'zod/mini';
import { parseJson } from '#shared/json.ts';
import { readPageInitData } from '#shared/page-init-data.ts';
import { readStored, SessionKey, writeStored } from '#shared/storage.ts';
import type { SoundSession } from './session.ts';

// Lichess has no game start sound. We play one, once per game, when a player
// opens a game that has just begun: at most one move in.

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

const StartedSchema = z.string().check(z.minLength(1));

/** The id of the game the page opens, if the player is in it and it has just begun. */
export function freshGameId(initData: string | null): string | null {
  const round = parseJson(initData, RoundInitSchema);
  if (!round) return null;
  const { game, player } = round.data;
  return !player.spectator && (game.turns ?? 0) <= 1 ? game.id : null;
}

export interface GameStart {
  /** Plays the sound if the game is read and our sounds are in, whichever came last. */
  readonly play: () => void;
}

export function watchGameStart(session: SoundSession): GameStart {
  let gameId: string | null = null;
  const play = (): void => {
    if (gameId === null || !session.playOurs) return;
    const key = SessionKey.gameStarted(gameId);
    gameId = null;
    if (readStored(key, StartedSchema, 'session') !== null) return;
    writeStored(key, '1', 'session');
    session.playOurs('game-start');
  };
  readPageInitData(text => {
    gameId = freshGameId(text);
    play();
  });
  return { play };
}
