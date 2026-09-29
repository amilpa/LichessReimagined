// Helpers only the scripts' tests import.

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll } from 'vitest';

/** A maker of fresh temporary folders, all removed once the test file is done. */
export function tempDirs(prefix: string): () => Promise<string> {
  const dirs: string[] = [];
  afterAll(async () => {
    await Promise.all(dirs.map(dir => rm(dir, { recursive: true, force: true })));
  });
  return async () => {
    const dir = await mkdtemp(path.join(tmpdir(), prefix));
    dirs.push(dir);
    return dir;
  };
}

/** Writes each file at its path below `dir`, with the folders it needs. */
export async function writeFiles(
  dir: string,
  files: Readonly<Record<string, string>>,
): Promise<void> {
  for (const [name, text] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(dir, name)), { recursive: true });
    await writeFile(path.join(dir, name), text);
  }
}
