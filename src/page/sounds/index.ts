import type { Feature } from '#shared/features.ts';
import { onSounds, postPageReady } from '#shared/protocol.ts';
import { watchMoveAttempts } from './attempts.ts';
import { watchGameStart } from './game-start.ts';
import { toBlobUrls, whenSoundPlayerReady } from './install.ts';
import { hookSoundPlayer } from './player.ts';
import { createSession } from './session.ts';

// Chess.com's sounds in place of Lichess's. The content script reads the
// bundled files and posts them here, where Lichess's sound player lives.
// Premoves, refused moves and game starts get a sound Lichess has none for.

function start(): void {
  const session = createSession();
  watchMoveAttempts(session);
  const gameStart = watchGameStart(session);
  // The content script may post twice: once loaded, and once told we're listening.
  const stop = onSounds(files => {
    stop();
    const urls = toBlobUrls(files);
    whenSoundPlayerReady(sound => {
      if (hookSoundPlayer(sound, urls, session)) gameStart.play();
    });
  });
  postPageReady();
}

export const sounds: Feature = { name: 'sounds', start };
