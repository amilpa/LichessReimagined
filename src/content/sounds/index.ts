import type { Feature } from '#shared/features.ts';
import { onPageReady, postSounds, type SoundFiles } from '#shared/protocol.ts';
import { loadSounds } from './load.ts';

// The bundled move sounds, handed to the page world, which plays them in place
// of Lichess's own.

// The page script may start before or after the sounds are in: each side
// sends when it's ready.
async function shareSounds(): Promise<void> {
  let loaded: SoundFiles | null = null;
  onPageReady(() => {
    if (loaded) postSounds(loaded);
  });
  loaded = await loadSounds();
  postSounds(loaded);
}

export const sounds: Feature = {
  name: 'sounds',
  start: () => void shareSounds(),
};
