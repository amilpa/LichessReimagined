import type { SoundFiles } from '#shared/protocol.ts';
import { SOUND_NAMES, type SoundName } from '#shared/sounds.ts';
import { extensionUrl } from '#content/platform/runtime.ts';

// Lichess's CSP only lets audio play from its own domains, blob: and data:,
// not from the extension. So the bundled sounds are read here, where the
// extension's files are in reach, and the page world plays their bytes as blob: URLs.

type Loaded = readonly [SoundName, ArrayBuffer] | null;

async function loadSound(name: SoundName): Promise<Loaded> {
  try {
    const response = await fetch(extensionUrl(`sounds/${name}.mp3`));
    return [name, await response.arrayBuffer()];
  } catch {
    return null;
  }
}

/** Every sound that could be read, by name. */
export async function loadSounds(): Promise<SoundFiles> {
  const sounds: SoundFiles = {};
  for (const loaded of await Promise.all(SOUND_NAMES.map(loadSound))) {
    if (loaded) sounds[loaded[0]] = loaded[1];
  }
  return sounds;
}
