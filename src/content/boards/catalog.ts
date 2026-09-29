import { z } from 'zod/mini';
import { colorLetter, ROLE_LETTERS } from '#shared/chess/pieces.ts';
import { COLORS, ROLES } from '#shared/chess/types.ts';
import catalogJson from './catalog.json' with { type: 'json' };

// The bundled boards and piece sets, in public/img. The first of each list is
// the default. tools/boards/fetch.py reads the same JSON to download them.

/** Hands the board or the pieces back to Lichess and its own pref. */
export const LICHESS = 'lichess';

// `host` and `format` only tell fetch.py where Chess.com serves the images:
// the newer ones on another CDN, one board as a JPEG.
const HostSchema = z.optional(z.enum(['files', 'themes']));

const BoardSchema = z.object({
  id: z.string(),
  name: z.string(),
  // Sampled from the board, for the coordinates drawn inside it.
  light: z.string(),
  dark: z.string(),
  host: HostSchema,
  format: z.optional(z.enum(['png', 'jpg'])),
});

const PieceSetSchema = z.object({ id: z.string(), name: z.string(), host: HostSchema });

export const CatalogSchema = z.object({
  boards: z.tuple([BoardSchema], BoardSchema),
  pieceSets: z.tuple([PieceSetSchema], PieceSetSchema),
});

/** What the picker lists: a board or a piece set. */
export interface Choice {
  readonly id: string;
  readonly name: string;
}

export const { boards: BOARDS, pieceSets: PIECE_SETS } = CatalogSchema.parse(catalogJson);

/** Each piece as its images are named: wp, wn… bk. */
export const PIECE_CODES: readonly string[] = COLORS.flatMap(color =>
  ROLES.map(role => `${colorLetter(color)}${ROLE_LETTERS[role]}`),
);

// A board image is 1200px, and its tile in the menu shows its two top-left
// squares. A piece image is 300px.
export const boardPath = (id: string): string => `img/boards/${id}.webp`;
export const boardTilePath = (id: string): string => `img/boards/${id}-tile.webp`;
export const piecePath = (setId: string, code: string): string =>
  `img/pieces/${setId}/${code}.webp`;

/** The stored pick if it's still on offer (or Lichess's), else the default. */
export function validPick(stored: string | null, choices: readonly [Choice, ...Choice[]]): string {
  const onOffer = stored === LICHESS || choices.some(choice => choice.id === stored);
  return stored !== null && onOffer ? stored : choices[0].id;
}
