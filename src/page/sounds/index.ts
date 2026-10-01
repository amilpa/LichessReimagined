import type { Feature } from '#shared/features.ts';
import { onSounds, postPageReady } from '#shared/protocol.ts';
import type { SoundName } from '#shared/sounds.ts';
import type { SoundPlayer } from '#page/lichess/sound.ts';
import { watchMoveAttempts } from './attempts.ts';
import { watchGameStart } from './game-start.ts';
import { replaceSounds, whenSoundPlayerReady } from './install.ts';
import { hookSoundPlayer, setSoundPaths } from './player.ts';
import { createSession } from './session.ts';

// The sounds of the pack the user picked, in place of Lichess's. The content
// script reads the pack and posts its sounds here, where Lichess's sound
// player lives, and posts again on every pick. Premoves, refused moves and
// game starts get a sound Lichess has none for. With no pack, Lichess's
// player is left alone.

function start(): void {
  const session = createSession();
  watchMoveAttempts(session);
  const gameStart = watchGameStart(session);
  const urls = new Map<SoundName, string>();
  let player: SoundPlayer | null = null;
  let waiting = false;
  onSounds(files => {
    replaceSounds(urls, files);
    if (player) setSoundPaths(player, urls);
    if (player || waiting || urls.size === 0) return;
    waiting = true;
    whenSoundPlayerReady(sound => {
      player = sound;
      if (hookSoundPlayer(sound, urls, session)) gameStart.play();
    });
  });
  postPageReady();
}

export const sounds: Feature = { name: 'sounds', start };
