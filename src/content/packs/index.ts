import type { Feature } from '#shared/features.ts';
import { onPageReady, postSounds, type SoundFiles } from '#shared/protocol.ts';
import { setLoading, showPacks, soundFiles } from './apply.ts';
import { watchDasher } from './dasher.ts';
import { createLibrary, LICHESS, storedPick, type Library, type Shown } from './library.ts';
import type { Pack } from './pack.ts';
import { deletePack, readPacks, writePack } from './store.ts';

// Lichess's own board, pieces and sounds, unless the user picked a pack they
// imported from GitHub (docs/packs.md) for one of them. Started first, from
// document_start: a picked board or set is hidden until it's read, so the
// page never shows Lichess's first.

async function loadPacks(): Promise<Pack[]> {
  try {
    return await readPacks();
  } catch (error) {
    console.error('[LichessDotCom] the imported packs could not be read', error);
    return [];
  }
}

// The page script may start before or after the packs are read: each side
// sends when it's ready, and every new sound pick is sent again.
function createSoundSender(): (shown: Shown) => void {
  let files: SoundFiles = {};
  let sentId: string | null = null;
  onPageReady(() => postSounds(files));
  return ({ sound }) => {
    const id = sound?.id ?? LICHESS;
    if (id === sentId) return;
    sentId = id;
    files = soundFiles(sound);
    postSounds(files);
  };
}

async function start(): Promise<Library> {
  setLoading([
    ...(storedPick('board') === LICHESS ? [] : ['board']),
    ...(storedPick('piece') === LICHESS ? [] : ['pieces']),
  ]);
  const sendSounds = createSoundSender();
  try {
    return createLibrary({
      packs: await loadPacks(),
      save: writePack,
      erase: deletePack,
      show: shown => {
        showPacks({ board: shown.board, pieces: shown.piece });
        sendSounds(shown);
      },
    });
  } finally {
    setLoading([]);
  }
}

export const packs: Feature = {
  name: 'packs',
  start: () => {
    void start().then(watchDasher);
  },
};
