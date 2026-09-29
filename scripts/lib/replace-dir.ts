import { existsSync } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';

/**
 * Fills a fresh folder beside `dir`, then swaps it in whole. The browser
 * loads the unpacked extension from `dir`, and its dev reload fires as soon
 * as a file there differs: it must never find a half-written build, and a
 * failed one leaves the last good build in place.
 */
export async function replaceDir(
  dir: string,
  fill: (staging: string) => Promise<void>,
): Promise<void> {
  // The folders are siblings, so the renames stay on one file system. A run cut
  // short leaves them behind, so they're cleared first.
  const next = `${dir}.next`;
  const previous = `${dir}.previous`;
  const clear = async (): Promise<void> => {
    await Promise.all([next, previous].map(folder => rm(folder, { recursive: true, force: true })));
  };
  await clear();
  try {
    await mkdir(next, { recursive: true });
    await fill(next);
    // A folder can't be renamed over a full one: `dir` is missing only
    // between these two renames.
    if (existsSync(dir)) await rename(dir, previous);
    await rename(next, dir);
  } finally {
    await clear();
  }
}
