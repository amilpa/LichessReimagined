import { pollUntil } from '#shared/poll.ts';
import type { SoundFiles } from '#shared/protocol.ts';
import { SOUND_NAMES, type SoundName } from '#shared/sounds.ts';
import { soundPlayer, type SoundPlayer } from '#page/lichess/sound.ts';

// Lichess's CSP lets audio load from blob: URLs, not from the extension.
export function toBlobUrls(files: SoundFiles): Map<SoundName, string> {
  const urls = new Map<SoundName, string>();
  for (const name of SOUND_NAMES) {
    const bytes = files[name];
    if (bytes) urls.set(name, URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' })));
  }
  return urls;
}

/** Hands over Lichess's sound player once it's set up, for up to 30 seconds. */
export function whenSoundPlayerReady(callback: (sound: SoundPlayer) => void): void {
  pollUntil(soundPlayer, callback, { intervalMs: 50, giveUpMs: 30_000 });
}
