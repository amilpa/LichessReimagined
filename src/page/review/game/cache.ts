import { z } from 'zod/mini';
import { readStoredJson, StorageKey, writeStoredJson } from '#shared/storage.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import { StoredRecordCodec } from '#page/review/evaluation/stored.ts';

// Each game's records at full depth, kept once its analysis is complete:
// opening the game again shows its review at once.

/** Bump to drop every cached review, when the records' meaning changes. */
const CACHE_VERSION = 1;

const CachedSchema = z.array(StoredRecordCodec);
// A position without a record is written as null, which never reads back.
const WrittenSchema = z.array(z.optional(StoredRecordCodec));

const cacheKey = (gameId: string, positions: number): string =>
  StorageKey.reviewCache(gameId, positions, CACHE_VERSION);

export function readCachedRecords(gameId: string, positions: number): PositionRecord[] | null {
  const records = readStoredJson(cacheKey(gameId, positions), CachedSchema);
  return records?.length === positions ? records : null;
}

export function cacheRecords(
  gameId: string,
  positions: number,
  records: readonly (PositionRecord | undefined)[],
): void {
  writeStoredJson(cacheKey(gameId, positions), z.encode(WrittenSchema, [...records]));
}
