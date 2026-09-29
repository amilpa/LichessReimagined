import type { PositionRecord } from '#page/review/evaluation/score.ts';
import { fnv } from './fnv.ts';

// Test support: the inputs the game analysis's functions were recorded on,
// in the original script and in the port.

const range = (from: number, to: number): number[] =>
  Array.from({ length: Math.max(0, to - from) }, (_, i) => from + i);

/** A quick pass's record: the full depth's, a little off, without its second line or best move. */
export function roughOf(record: PositionRecord, index: number): PositionRecord {
  const rough = { secondLineWinChance: null, best: null };
  if ('mate' in record)
    return { mate: record.mate, whiteWinChance: record.whiteWinChance, ...rough };
  const cp = record.cp + ((index * 37) % 90) - 45;
  const whiteWinChance = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
  return { cp, whiteWinChance, ...rough };
}

interface BuildStep {
  readonly deep: readonly number[];
  readonly rough: readonly number[];
}

interface Graph {
  readonly ply: number;
  readonly width: number;
  readonly height: number;
}

interface BuildCase {
  readonly game: string;
  readonly speed: string;
  readonly players: readonly [Record<string, unknown>, Record<string, unknown>];
  readonly steps: readonly BuildStep[];
  readonly graphs: readonly Graph[];
}

interface JobCase {
  readonly game: string;
  readonly mode: 'summary' | 'moves';
  readonly ply: number;
  readonly deep: readonly number[];
  readonly rough: readonly number[];
  readonly cloudAt?: number;
}

const GRAPHS: readonly Graph[] = [
  { ply: 0, width: 316, height: 88 },
  { ply: 5, width: 100, height: 40 },
  { ply: 30, width: 250, height: 61 },
];

const RATED: readonly [Record<string, unknown>, Record<string, unknown>] = [
  { color: 'white', user: { username: 'Alice' }, rating: 1650 },
  { color: 'black', user: { username: 'Bob' }, rating: 2100 },
];
const UNRATED: readonly [Record<string, unknown>, Record<string, unknown>] = [
  { color: 'black', ai: 3 },
  { color: 'white' },
];

const BUILDS: readonly BuildCase[] = [
  {
    game: 'opera',
    speed: 'blitz',
    players: RATED,
    steps: [{ deep: range(0, 34), rough: [] }],
    graphs: GRAPHS,
  },
  {
    game: 'evergreen',
    speed: 'rapid',
    players: RATED,
    steps: [
      { deep: range(0, 12), rough: range(12, 48) },
      { deep: range(12, 21), rough: [] },
    ],
    graphs: GRAPHS,
  },
  {
    game: 'passant',
    speed: 'bullet',
    players: UNRATED,
    steps: [
      { deep: range(0, 25).filter(i => i % 2 === 0), rough: range(0, 25).filter(i => i % 2 === 1) },
    ],
    graphs: GRAPHS,
  },
  {
    game: 'chess960-0',
    speed: 'classical',
    players: UNRATED,
    steps: [
      { deep: range(0, 60), rough: [] },
      { deep: [60], rough: [] },
    ],
    graphs: GRAPHS,
  },
  {
    game: 'random-5',
    speed: 'correspondence',
    players: RATED,
    steps: [{ deep: range(0, 61), rough: [] }],
    graphs: [],
  },
  {
    game: 'immortal',
    speed: 'blitz',
    players: RATED,
    steps: [{ deep: [], rough: [3, 4, 5, 9, 10] }],
    graphs: GRAPHS,
  },
];

const JOBS: readonly JobCase[] = [
  { game: 'opera', mode: 'moves', ply: 10, deep: [], rough: [] },
  { game: 'opera', mode: 'moves', ply: 10, deep: [8, 9, 10], rough: [] },
  { game: 'opera', mode: 'moves', ply: 10, deep: [8, 9, 10, 11], rough: [] },
  { game: 'opera', mode: 'moves', ply: 0, deep: [], rough: [] },
  { game: 'opera', mode: 'moves', ply: 33, deep: range(0, 34), rough: [] },
  { game: 'opera', mode: 'summary', ply: 10, deep: [], rough: [] },
  { game: 'opera', mode: 'summary', ply: 0, deep: [], rough: [], cloudAt: 0 },
  { game: 'opera', mode: 'summary', ply: 0, deep: [0, 1], rough: range(2, 34), cloudAt: 2 },
  { game: 'opera', mode: 'summary', ply: 0, deep: range(0, 30), rough: range(0, 34), cloudAt: 30 },
  { game: 'opera', mode: 'summary', ply: 0, deep: range(0, 31), rough: range(0, 34), cloudAt: 30 },
];

// A record in the original's format, as it was given the score chips.
const record = (
  fields: Partial<Record<'cp' | 'mate' | 'wp', number>>,
): Record<string, unknown> => ({
  wp: 50,
  wp2: null,
  best: null,
  ...fields,
});

export const UNIT_CASES = {
  builds: BUILDS,
  jobs: JOBS,
  chips: [
    record({ cp: 30, wp: 52 }),
    record({ cp: -5, wp: 49 }),
    record({ cp: 0 }),
    record({ mate: 0, wp: 0 }),
    record({ mate: 0, wp: 100 }),
    record({ mate: -3, wp: 0 }),
    record({ mate: 2, wp: 100 }),
    null,
  ],
  players: [
    { user: { username: 'Alice' }, name: 'A' },
    { name: 'Bee' },
    { ai: 3 },
    {},
    null,
    { user: { username: '' }, name: 'Cee' },
    { ai: 0 },
    { user: {} },
  ],
  headers: [
    ['Game Review', 'normal'],
    ['Bilan <&>', ''],
    ['Game Review', 'summary'],
  ],
};

/** A free board's tree: a line, and a variation from its second move. */
export const LIVE_TREE = {
  line: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'a7a6'],
  /** Played from the position after the line's first `from` moves. */
  variation: { from: 2, moves: ['f1c4', 'f8c5', 'd2d3'] },
  /** Fullmoves the masters play (the rest they don't), and the named ones. */
  bookMoves: 2,
  named: { 1: "King's Pawn Game", 2: 'Open Game: Kings Knight' },
  /** Positions left unanalyzed, by their index in the list of all of them. */
  unknown: [6, 9],
  /** Where the board is when the queue is asked what's next. */
  boards: [0, 3, 6],
};

/** A record for a position, from its FEN alone. */
export function recordFor(fen: string, best: string | null): PositionRecord {
  const cp = (fnv(fen) % 600) - 300;
  const whiteWinChance = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
  return { cp, whiteWinChance, secondLineWinChance: whiteWinChance - 10, best };
}
