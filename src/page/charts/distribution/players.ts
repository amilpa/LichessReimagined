import { clamp } from '#shared/math.ts';
import { BIN_SIZE, MIN_RATING } from './scales.ts';
import type { DistributionData } from './schema.ts';

/** The players per column, and what the chart reads off them. */
export interface Players {
  readonly counts: readonly number[];
  readonly total: number;
  /** The share of players rated below each column's end. */
  readonly shares: readonly number[];
  /** The rating where the last column ends, the top of the axis. */
  readonly maxRating: number;
}

export function countPlayers(counts: readonly number[]): Players {
  const total = counts.reduce((sum, count) => sum + count, 0);
  let below = 0;
  const shares = counts.map(count => {
    below += count;
    return below / total;
  });
  return { counts, total, shares, maxRating: MIN_RATING + counts.length * BIN_SIZE };
}

/** The column a rating falls in. */
export const binOf = (rating: number, players: Players): number =>
  clamp(Math.floor((rating - MIN_RATING) / BIN_SIZE), 0, players.counts.length - 1);

/** A rating off the chart is drawn at its edge. */
export const onChart = (rating: number, players: Players): number =>
  clamp(rating, MIN_RATING, players.maxRating);

export interface Marker {
  readonly kind: 'mine' | 'other';
  readonly color: string;
  readonly rating: number;
  readonly label: string;
}

// Neutral colors, because every other color already stands for a rating.
const MINE = '#ffffff';
const OTHER = '#bab9b8';

/** Your rating, then the player you came from. */
export function markersOf(data: DistributionData, yourRating: string): Marker[] {
  const markers: Marker[] = [];
  if (data.myRating !== undefined)
    markers.push({ kind: 'mine', color: MINE, rating: data.myRating, label: yourRating });
  if (data.otherRating !== undefined && data.otherPlayer !== undefined)
    markers.push({
      kind: 'other',
      color: OTHER,
      rating: data.otherRating,
      label: data.otherPlayer,
    });
  return markers;
}
