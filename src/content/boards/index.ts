import { setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { extensionUrl } from '#content/platform/runtime.ts';
import { watchDasher } from './dasher.ts';
import { createPickers } from './pickers.ts';

// Which board and pieces the page shows: Chess.com's green board and Neo
// pieces unless the user picks others in the user menu, one of ours or
// Lichess's own. Set on <html> from document_start, so the board never shows
// another one first.

export const boards: Feature = {
  name: 'boards',
  start: () => {
    // The page world can't ask where the extension's files are, and the
    // review draws Neo pieces in the coach's comments.
    setData(document.documentElement, 'cdcAssets', extensionUrl(''));
    watchDasher(createPickers());
  },
};
