import { z } from 'zod/mini';
import { readPageInitData } from '#shared/page-init-data.ts';
import { freshGameId } from '#shared/round-init.ts';
import { readStored, SessionKey, writeStored } from '#shared/storage.ts';
import type { SoundSession } from './session.ts';

// Lichess has no game start sound. We play one, once per game, when a player
// opens a game that has just begun: at most one move in.

const StartedSchema = z.string().check(z.minLength(1));

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
