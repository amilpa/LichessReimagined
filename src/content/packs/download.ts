import { firstIssuePath, ManifestSchema, PIECE_TOKEN, type Manifest } from './manifest.ts';
import { PIECE_NAMES, PiecesSchema, SoundsSchema, type Pack } from './pack.ts';
import { audioType, dataUrl, imageType } from './sniff.ts';
import {
  apiFileUrl,
  fileUrl,
  MANIFEST_FILE,
  packId,
  parsePackLink,
  type PackSource,
} from './source.ts';

// Reads a pack from GitHub, every file at once, and checks each one. Any
// failure comes back as a sentence for the user. GitHub's files allow any
// origin, so this needs no host permission. A private repository is read
// through GitHub's API with the user's token, used for this import only.

const KB = 1024;
const MAX_MANIFEST_BYTES = 64 * KB;
const MAX_FILE_BYTES = 2 * KB * KB;
const MAX_PACK_BYTES = 16 * KB * KB;

export type Download = { readonly pack: Pack } | { readonly error: string };

class PackError extends Error {}

const size = (bytes: number): string =>
  bytes >= KB * KB ? `${bytes / KB / KB} MB` : `${bytes / KB} KB`;
const tooBig = (what: string, maxBytes: number): PackError =>
  new PackError(`${what} is over ${size(maxBytes)}.`);

/** Reads one of the pack's files, at most `maxBytes` of it. */
type Read = (path: string, maxBytes: number) => Promise<Uint8Array>;

function request(source: PackSource, path: string, token: string | null): Promise<Response> {
  if (token === null)
    return fetch(fileUrl(source, path), { credentials: 'omit', cache: 'no-store' });
  return fetch(apiFileUrl(source, path), {
    credentials: 'omit',
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.raw+json' },
  });
}

function refusal(status: number, path: string, token: string | null): PackError {
  if (status === 401) return new PackError('GitHub turned the token down.');
  if (status === 404 && token !== null)
    return new PackError(`${path} is not there, or the token can't read it.`);
  if (status === 404 && path === MANIFEST_FILE)
    return new PackError(`There is no ${MANIFEST_FILE} there. A private repository needs a token.`);
  if (status === 404) return new PackError(`${path} is not there.`);
  return new PackError(`GitHub answered ${status} for ${path}.`);
}

function createReader(source: PackSource, token: string | null): Read {
  return async (path, maxBytes) => {
    let response: Response;
    try {
      response = await request(source, path, token);
    } catch {
      throw new PackError('GitHub could not be reached.');
    }
    if (!response.ok) throw refusal(response.status, path, token);
    if (Number(response.headers.get('content-length')) > maxBytes) throw tooBig(path, maxBytes);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > maxBytes) throw tooBig(path, maxBytes);
    return bytes;
  };
}

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

// Lichess decodes every piece before it draws the board, and draws none if
// one fails: an image the browser can't draw is turned down here.
async function decodes(url: string): Promise<boolean> {
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
    return true;
  } catch {
    return false;
  }
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
    const url = dataUrl(type, bytes);
    if (kind === 'image' && !(await decodes(url))) throw new PackError(`${path} can't be drawn.`);
    return url;
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

async function readPack(source: PackSource, link: string, token: string | null): Promise<Pack> {
  const read = createReader(source, token);
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
  try {
    return { pack: await readPack(source, link.trim(), token.trim() === '' ? null : token.trim()) };
  } catch (error) {
    if (error instanceof PackError) return { error: error.message };
    throw error;
  }
}
