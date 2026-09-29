import { describe, expect, it } from 'vitest';
import {
  BOARDS,
  boardPath,
  boardTilePath,
  CatalogSchema,
  LICHESS,
  PIECE_CODES,
  PIECE_SETS,
  piecePath,
  validPick,
} from './catalog.ts';
import catalogJson from './catalog.json' with { type: 'json' };
// The lists as the original script held them: [id, name, light, dark, host?].
import legacy from './fixtures/legacy.json' with { type: 'json' };

describe('the catalog', () => {
  it('holds the original lists, in their order', () => {
    const boards = BOARDS.map(({ id, name, light, dark, format }) =>
      format === undefined ? [id, name, light, dark] : [id, name, light, dark, format],
    );
    const pieceSets = PIECE_SETS.map(({ id, name, host }) =>
      host === undefined ? [id, name] : [id, name, 'png'],
    );
    expect(boards).toEqual(legacy.lists.boards);
    expect(pieceSets).toEqual(legacy.lists.pieceSets);
  });

  it('starts with the defaults, and has no id twice', () => {
    expect(BOARDS[0].id).toBe('green');
    expect(PIECE_SETS[0].id).toBe('neo');
    for (const list of [BOARDS, PIECE_SETS]) {
      const ids = list.map(({ id }) => id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).not.toContain(LICHESS);
    }
  });

  it('puts every newer image on the themes host, and only those have a format', () => {
    for (const board of BOARDS) expect(board.format !== undefined).toBe(board.host === 'themes');
  });

  it('refuses an empty list or a board without its colors', () => {
    expect(CatalogSchema.safeParse({ ...catalogJson, boards: [] }).success).toBe(false);
    const colorless = { id: BOARDS[0].id, name: BOARDS[0].name };
    expect(CatalogSchema.safeParse({ ...catalogJson, boards: [colorless] }).success).toBe(false);
  });
});

describe('paths', () => {
  it('names the bundled files', () => {
    expect(boardPath('glass')).toBe('img/boards/glass.webp');
    expect(boardTilePath('glass')).toBe('img/boards/glass-tile.webp');
    expect(piecePath('neo', 'wn')).toBe('img/pieces/neo/wn.webp');
    expect(PIECE_CODES).toEqual([
      'wp',
      'wn',
      'wb',
      'wr',
      'wq',
      'wk',
      'bp',
      'bn',
      'bb',
      'br',
      'bq',
      'bk',
    ]);
  });
});

describe('validPick', () => {
  it.each([
    [null, 'green'],
    ['', 'green'],
    ['Glass', 'green'],
    ['glass', 'glass'],
    [LICHESS, LICHESS],
  ])('reads %j as %j', (stored, expected) => {
    expect(validPick(stored, BOARDS)).toBe(expected);
  });
});
