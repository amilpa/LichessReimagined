import type { SoundPlayer } from '#page/lichess/sound.ts';

// Test support: a stand-in for Lichess's sound player that records every call.

/** A call the player got: `play(name, volume)`, or `move(options)` with null for no options. */
export type PlayerCall = readonly ['play', unknown, unknown] | readonly ['move', unknown];

export interface FakeSoundPlayer {
  readonly sound: SoundPlayer;
  /** The calls, in order. */
  readonly calls: PlayerCall[];
}

export function fakeSoundPlayer(): FakeSoundPlayer {
  const calls: PlayerCall[] = [];
  const sound: SoundPlayer = {
    paths: new Map(),
    theme: 'standard',
    play: (name, volume) => {
      calls.push(['play', name, volume]);
      return Promise.resolve();
    },
    move: options => {
      calls.push(['move', options ?? null]);
      return Promise.resolve();
    },
  };
  return { sound, calls };
}
