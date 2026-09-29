import { z } from 'zod/mini';
import { readStored, StorageKey, writeStored } from '#shared/storage.ts';
import { extensionUrl } from '#content/platform/runtime.ts';
import { applyBoard, applyPieces } from './appearance.ts';
import { BOARDS, boardTilePath, PIECE_SETS, piecePath, validPick, type Choice } from './catalog.ts';

/** Also the class of Lichess's panel for it in the user menu: `.sub.board`, `.sub.piece`. */
export type PickerKind = 'board' | 'piece';

/** The board or the piece set on show, kept under its storage key. */
export interface Picker {
  readonly kind: PickerKind;
  readonly choices: readonly Choice[];
  /** The URL of a choice's picture in the menu. */
  readonly thumbnail: (id: string) => string;
  readonly current: () => string;
  readonly choose: (id: string) => void;
}

interface PickerOptions {
  readonly kind: PickerKind;
  readonly storageKey: string;
  readonly choices: readonly [Choice, ...Choice[]];
  readonly thumbnail: (id: string) => string;
  readonly apply: (id: string) => void;
}

function createPicker({ kind, storageKey, choices, thumbnail, apply }: PickerOptions): Picker {
  let current = validPick(readStored(storageKey, z.string()), choices);
  apply(current);
  return {
    kind,
    choices,
    thumbnail,
    current: () => current,
    choose: id => {
      current = id;
      apply(id);
      writeStored(storageKey, id);
    },
  };
}

/** Reads both picks and puts them on <html>. */
export function createPickers(): readonly Picker[] {
  return [
    createPicker({
      kind: 'board',
      storageKey: StorageKey.board,
      choices: BOARDS,
      thumbnail: id => extensionUrl(boardTilePath(id)),
      apply: applyBoard,
    }),
    createPicker({
      kind: 'piece',
      storageKey: StorageKey.pieces,
      choices: PIECE_SETS,
      thumbnail: id => extensionUrl(piecePath(id, 'wn')),
      apply: applyPieces,
    }),
  ];
}
