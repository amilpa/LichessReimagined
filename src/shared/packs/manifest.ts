import { z } from 'zod/mini';
import { SoundNameSchema } from '#shared/sounds.ts';
import { HexColorSchema } from './pack.ts';

// A pack's pack.json, as its author writes it (docs/packs.md). Every path is
// relative to the pack's folder, and may not leave it.

/** Stands for each piece's name (wK, wQ … bP) in the pieces' path. */
export const PIECE_TOKEN = '{piece}';

const isInFolder = (path: string): boolean =>
  !path.startsWith('/') &&
  path
    .split('/')
    .every(part => part !== '' && part !== '.' && part !== '..' && !/[\\?#]/.test(part));

const PathSchema = z.string().check(z.maxLength(200), z.refine(isInFolder));

export const ManifestSchema = z
  .object({
    name: z.string().check(z.minLength(1), z.maxLength(40)),
    pieces: z.optional(PathSchema.check(z.refine(path => path.includes(PIECE_TOKEN)))),
    board: z.optional(
      z.object({
        image: PathSchema,
        light: z.optional(HexColorSchema),
        dark: z.optional(HexColorSchema),
      }),
    ),
    sounds: z.optional(
      z
        .partialRecord(SoundNameSchema, PathSchema)
        .check(z.refine(sounds => Object.keys(sounds).length > 0)),
    ),
  })
  .check(
    z.refine(
      manifest =>
        manifest.pieces !== undefined ||
        manifest.board !== undefined ||
        manifest.sounds !== undefined,
    ),
  );

export type Manifest = z.infer<typeof ManifestSchema>;

/** Where the first problem is, for the user: `pieces`, `sounds.capture`… or '' for the whole file. */
export function firstIssuePath(manifest: unknown): string | null {
  const result = ManifestSchema.safeParse(manifest);
  if (result.success) return null;
  return result.error.issues[0]?.path.join('.') ?? '';
}
