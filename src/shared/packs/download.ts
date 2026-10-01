import { firstIssuePath, ManifestSchema, PIECE_TOKEN, type Manifest } from './manifest.ts';
import { PIECE_NAMES, PiecesSchema, SoundsSchema, type Pack } from './pack.ts';
import { audioType, dataUrl, imageType } from './sniff.ts';
import { createReader, PackError, tooBig, type Read } from './github.ts';
import { MANIFEST_FILE, packId, parsePackLink, type PackSource } from './source.ts';

// Reads a pack from GitHub, every file at once, and checks each one. Any
// failure comes back as a sentence for the user, and stops the other
// downloads. A private repository's token is used for this import only. Run
// by the background worker: Firefox lets a content script fetch nothing the
// page's CSP doesn't, and Lichess's names no GitHub. Whether each image draws
// is checked where there's a DOM (content/packs/import.ts).

const KB = 1024;
const MAX_MANIFEST_BYTES = 64 * KB;
const MAX_FILE_BYTES = 2 * KB * KB;
const MAX_PACK_BYTES = 16 * KB * KB;

export type Download = { readonly pack: Pack } | { readonly error: string };

async function readManifest(read: Read): Promise<Manifest> {
  const bytes = await read(MANIFEST_FILE, MAX_MANIFEST_BYTES);
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new PackError(`${MANIFEST_FILE} is not valid JSON.`);
  }
  const result = ManifestSchema.safeParse(json);
  if (result.success) return result.data;
  const where = firstIssuePath(json);
  throw new PackError(
    where
      ? `${MANIFEST_FILE}: "${where}" is not right.`
      : `${MANIFEST_FILE} has no pieces, board or sounds.`,
  );
}

/** Reads a file into a data: URL, counting it against the pack's size. */
function createFileReader(read: Read): (path: string, kind: 'image' | 'sound') => Promise<string> {
  let used = 0;
  return async (path, kind) => {
    const bytes = await read(path, MAX_FILE_BYTES);
    const type = kind === 'image' ? imageType(bytes) : audioType(bytes);
    if (type === null)
      throw new PackError(`${path} is not ${kind === 'image' ? 'an image' : 'a sound'}.`);
    used += bytes.length;
    if (used > MAX_PACK_BYTES) throw tooBig('The pack', MAX_PACK_BYTES);
    return dataUrl(type, bytes);
  };
}

type ReadFile = ReturnType<typeof createFileReader>;

async function readPieces(
  readFile: ReadFile,
  template: string,
): Promise<NonNullable<Pack['pieces']>> {
  const entries = await Promise.all(
    PIECE_NAMES.map(async name => [
      name,
      await readFile(template.replaceAll(PIECE_TOKEN, name), 'image'),
    ]),
  );
  return PiecesSchema.parse(Object.fromEntries(entries));
}

async function readSounds(
  readFile: ReadFile,
  paths: NonNullable<Manifest['sounds']>,
): Promise<NonNullable<Pack['sounds']>> {
  const entries = await Promise.all(
    Object.entries(paths).map(async ([name, path]) => [name, await readFile(path, 'sound')]),
  );
  return SoundsSchema.parse(Object.fromEntries(entries));
}

async function readPack(
  source: PackSource,
  link: string,
  token: string | null,
  signal: AbortSignal,
): Promise<Pack> {
  const read = createReader(source, token, signal);
  const { name, pieces, board, sounds } = await readManifest(read);
  const readFile = createFileReader(read);
  const [pieceImages, boardImage, soundFiles] = await Promise.all([
    pieces === undefined ? undefined : readPieces(readFile, pieces),
    board === undefined ? undefined : readFile(board.image, 'image'),
    sounds === undefined ? undefined : readSounds(readFile, sounds),
  ]);
  return {
    id: packId(source),
    name,
    link,
    ...(pieceImages && { pieces: pieceImages }),
    ...(board && boardImage && { board: { ...board, image: boardImage } }),
    ...(soundFiles && { sounds: soundFiles }),
  };
}

/** Downloads the pack a link points at, with a token for a private repository ('' for none). */
export async function downloadPack(link: string, token = ''): Promise<Download> {
  const source = parsePackLink(link);
  if (source === null) return { error: 'That is not a link to a folder on GitHub.' };
  const downloads = new AbortController();
  try {
    const secret = token.trim() === '' ? null : token.trim();
    return { pack: await readPack(source, link.trim(), secret, downloads.signal) };
  } catch (error) {
    downloads.abort();
    if (error instanceof PackError) return { error: error.message };
    throw error;
  }
}
