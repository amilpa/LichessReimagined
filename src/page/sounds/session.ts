import type { Board } from '#shared/chess/types.ts';
import type { SoundName } from '#shared/sounds.ts';

// What the sound hooks, the move attempts and the game start share on a page.
export interface SoundSession {
  /** The pieces as last seen before a move, to tell what a promoted piece was. */
  lastPieces: Board | null;
  /** When a move sound last played: an attempt that got one needs no other. */
  lastMoveSoundAt: number;
  /** Plays one of our sounds; null until they're installed. */
  playOurs: ((name: SoundName) => unknown) | null;
}

export const createSession = (): SoundSession => ({
  lastPieces: null,
  lastMoveSoundAt: 0,
  playOurs: null,
});
