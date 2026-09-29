import { describe, expect, it } from 'vitest';
import { z } from 'zod/mini';
import { isAttacked } from '#shared/chess/attacks.ts';
import { parsePlacement } from '#shared/chess/fen.ts';
import { SquareSchema } from '#shared/chess/square-schema.ts';
import { boardOrientation, mainBoardWrap, readBoard } from './board-reader.ts';
import {
  castled,
  fallbackSound,
  soundForLichessEvent,
  soundFromBoard,
  soundFromSan,
} from './choose.ts';
import { ColorSchema, renderBoard } from './fixtures/boards.ts';
// What the original script chose for each case.
import legacy from './fixtures/legacy-choices.json' with { type: 'json' };

const FixtureSchema = z.object({
  board: z.array(
    z.object({
      name: z.string(),
      before: z.nullable(z.string()),
      after: z.string(),
      lastMove: z.array(SquareSchema),
      lichessName: z.optional(z.string()),
      orientation: ColorSchema,
      sound: z.string(),
    }),
  ),
  san: z.array(
    z.object({
      san: z.string(),
      ply: z.nullable(z.number()),
      orientation: ColorSchema,
      sound: z.string(),
    }),
  ),
  attacks: z.array(
    z.object({
      placement: z.string(),
      target: SquareSchema,
      by: ColorSchema,
      attacked: z.boolean(),
    }),
  ),
  read: z.object({
    pieces: z.array(z.tuple([SquareSchema, ColorSchema, z.string()])),
    lastMove: z.array(SquareSchema),
  }),
});

const fixture = FixtureSchema.parse(legacy);

describe('soundFromBoard', () => {
  it.each(fixture.board)('picks what the original picked: $name', entry => {
    renderBoard({
      placement: entry.after,
      orientation: entry.orientation,
      lastMove: entry.lastMove,
    });
    const state = readBoard(mainBoardWrap());
    expect(state?.pieces).toEqual(parsePlacement(entry.after));
    const sound = soundFromBoard({
      before: entry.before === null ? null : parsePlacement(entry.before),
      pieces: state?.pieces ?? new Map(),
      lastMove: state?.lastMove ?? [],
      lichessName: entry.lichessName,
      orientation: boardOrientation(),
    });
    expect(sound).toBe(entry.sound);
  });

  it('falls back on the sound Lichess asked for', () => {
    expect(fallbackSound('capture')).toBe('capture');
    expect(fallbackSound('move')).toBe('move-self');
    expect(fallbackSound(undefined)).toBe('move-self');
  });
});

describe('castled', () => {
  const before = parsePlacement('r3k2r/8/8/8/8/8/8/R3K2R');

  it('needs the king and one rook, and nothing else, to move along the back rank', () => {
    expect(castled(before, parsePlacement('r3k2r/8/8/8/8/8/8/R4RK1'))).toBe(true);
    expect(castled(before, parsePlacement('2kr3r/8/8/8/8/8/8/R3K2R'))).toBe(true);
    expect(castled(before, parsePlacement('r3k2r/8/8/8/8/8/8/R3K1R1'))).toBe(false);
    expect(castled(before, parsePlacement('r3k2r/8/8/8/8/8/4K3/R6R'))).toBe(false);
    expect(castled(null, parsePlacement('r3k2r/8/8/8/8/8/8/R4RK1'))).toBe(false);
  });
});

describe('soundFromSan', () => {
  it.each(fixture.san)('picks what the original picked: $san at ply $ply', entry => {
    expect(soundFromSan(entry.san, entry.ply ?? undefined, entry.orientation)).toBe(entry.sound);
  });
});

describe('soundForLichessEvent', () => {
  it('maps the events we have a sound for, and only those', () => {
    expect(soundForLichessEvent('victory')).toBe('game-end');
    expect(soundForLichessEvent('lowTime')).toBe('tenseconds');
    expect(soundForLichessEvent('berserk')).toBeUndefined();
    expect(soundForLichessEvent('constructor')).toBeUndefined();
  });
});

describe('isAttacked', () => {
  it.each(fixture.attacks)('agrees with the original: $target by $by in $placement', entry => {
    expect(isAttacked(parsePlacement(entry.placement), entry.target, entry.by)).toBe(
      entry.attacked,
    );
  });
});

describe('readBoard', () => {
  it('reads the pieces and highlights as the original did, skipping ghosts and fading pieces', () => {
    renderBoard({
      placement: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR',
      orientation: 'white',
      lastMove: ['e2', 'e4'],
    });
    const state = readBoard(mainBoardWrap());
    const pieces = [...(state?.pieces ?? [])].map(([square, { color, role }]) => [
      square,
      color,
      role,
    ]);
    expect(pieces).toEqual(fixture.read.pieces);
    expect(state?.lastMove).toEqual(fixture.read.lastMove);
  });

  it('ignores elements chessground did not key, and a page with no board', () => {
    const board = renderBoard({ placement: '8/8/8/8/8/8/8/K7', orientation: 'black' });
    board.append(Object.assign(document.createElement('piece'), { className: 'white pawn' }));
    board.append(
      Object.assign(document.createElement('piece'), { className: 'white pawn', cgKey: 'a0' }),
    );
    expect([...(readBoard(mainBoardWrap())?.pieces.keys() ?? [])]).toEqual(['a1']);
    expect(boardOrientation()).toBe('black');
    document.body.replaceChildren();
    expect(readBoard(mainBoardWrap())).toBeNull();
    expect(boardOrientation()).toBe('white');
  });
});
