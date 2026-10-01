import type { CoachMood } from '#shared/coach.ts';

// The verdicts a move can get, in the summary's order.

export type MoveClass =
  | 'brilliant'
  | 'great'
  | 'book'
  | 'best'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'miss'
  | 'blunder';

export const MOVE_CLASSES: readonly MoveClass[] = [
  'brilliant',
  'great',
  'book',
  'best',
  'excellent',
  'good',
  'inaccuracy',
  'mistake',
  'miss',
  'blunder',
];

export const CLASS_COLORS: Readonly<Record<MoveClass, string>> = {
  brilliant: '#1cb3c8',
  great: '#5288d6',
  book: '#b08a63',
  best: '#4caa48',
  excellent: '#4caa48',
  good: '#8aab5e',
  inaccuracy: '#eeb422',
  mistake: '#f2862f',
  miss: '#e8576a',
  blunder: '#d4322a',
};

/** From best to worst: a mate verdict only ever makes a move's class worse. Book has no rank. */
export const RANK: readonly MoveClass[] = [
  'brilliant',
  'great',
  'best',
  'excellent',
  'good',
  'inaccuracy',
  'mistake',
  'miss',
  'blunder',
];

/** The counts shown over the Game Review button. */
export type CountedClass = 'brilliant' | 'great' | 'best';
export const COUNTED: readonly CountedClass[] = ['brilliant', 'great', 'best'];

/** The summary's rows before its chevron is opened; a brilliant move joins them when there is one. */
export const SUMMARY_ROWS: ReadonlySet<MoveClass> = new Set<MoveClass>([
  'great',
  'best',
  'excellent',
  'mistake',
  'miss',
  'blunder',
]);

/** The classes marked on the evaluation graph. */
export const GRAPH_DOTS: ReadonlySet<MoveClass> = new Set<MoveClass>([
  'brilliant',
  'great',
  'inaccuracy',
  'mistake',
  'miss',
  'blunder',
]);

/** Move list badges; book only shows on the last book move. */
export const LIST_BADGES: ReadonlySet<MoveClass> = new Set<MoveClass>([...GRAPH_DOTS, 'book']);

/** Moves that need no correction: no best-move arrow or button. */
export const GOOD: ReadonlySet<MoveClass> = new Set<MoveClass>([
  'brilliant',
  'great',
  'best',
  'book',
]);

/** The moves the coach corrects: everything below good. */
export const isError = (moveClass: MoveClass): boolean =>
  !GOOD.has(moveClass) && moveClass !== 'excellent' && moveClass !== 'good';

const MOODS: Partial<Record<MoveClass, CoachMood>> = {
  brilliant: 'delight',
  great: 'delight',
  best: 'happy',
  excellent: 'happy',
  inaccuracy: 'doubt',
  mistake: 'worry',
  miss: 'worry',
  blunder: 'shock',
};

/** How the coach's face reacts to a verdict; null keeps it neutral. */
export const classMood = (moveClass: MoveClass): CoachMood | null => MOODS[moveClass] ?? null;
