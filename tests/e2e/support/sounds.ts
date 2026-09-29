import type { Page } from '@playwright/test';
import { z } from 'zod/mini';
import { readPageGlobal } from './lichess.ts';

// Our sounds, registered in Lichess's sound player (`site.sound`) under cdc- names.

export const OUR_SOUND_PREFIX = 'cdc-';

// The player's paths: a Map from each sound's name to its URL.
const PathsSchema = z.array(z.tuple([z.string(), z.string()]));

/** Our sounds in the page's player, by name: none until the page script has handed them over. */
export async function ourSounds(page: Page): Promise<Map<string, string>> {
  const paths = await readPageGlobal(page, ['site', 'sound', 'paths']);
  // Lichess sets its player up as the page loads.
  if (paths === undefined) return new Map();
  const entries = PathsSchema.parse(paths);
  return new Map(entries.filter(([name]) => name.startsWith(OUR_SOUND_PREFIX)));
}
