import { readFile } from 'node:fs/promises';
import path from 'node:path';

// The stylesheets are split into short files joined by `@import`s. The
// browser gets them as one file, in the same order: each import line is
// replaced by the file it names, byte for byte, and nothing else changes.

const IMPORT = /^@import\s+['"](\.{1,2}\/[^'"]+\.css)['"];\s*$/;

export async function bundleCss(
  entry: string,
  seen: ReadonlySet<string> = new Set(),
): Promise<string> {
  if (seen.has(entry)) throw new Error(`circular @import of ${entry}`);
  const inside = new Set([...seen, entry]);
  const source = await readFile(entry, 'utf8');
  const parts: string[] = [];
  for (const line of source.split(/(?<=\n)/)) {
    const target = IMPORT.exec(line)?.[1];
    if (target === undefined) {
      if (/^\s*@import\b/.test(line))
        throw new Error(`${entry}: unsupported @import: ${line.trim()}`);
      parts.push(line);
      continue;
    }
    parts.push(await bundleCss(path.resolve(path.dirname(entry), target), inside));
  }
  return parts.join('');
}
