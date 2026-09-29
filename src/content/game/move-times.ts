import { queryOne, setData, setStyleProperty } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { nonEmpty } from '#shared/text.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import {
  formatSpent,
  GameExportSchema,
  spentTimes,
  type Clock,
  type GameExport,
} from './clock-times.ts';
import { gameIdFrom } from './game-id.ts';

// Move times, once a game is over: the time spent on each move, with a bar
// scaled to the longest think (styles/game/game-over.css). The move list is
// snabbdom's: we only add attributes, and put them back whenever it re-renders.

// Right after the game ends, the export can fail or lag the last move: we
// try again, a second apart.
const MAX_TRIES = 5;
const RETRY_MS = 1000;

export interface FinishedGame {
  readonly id: string;
  readonly clock: Clock;
}

export interface MoveTimes {
  readonly sync: () => void;
  /** The game shown, once its export came back with a clock. */
  readonly finishedGame: () => FinishedGame | null;
}

async function fetchExport(id: string): Promise<GameExport | null> {
  try {
    const url = `/game/export/${id}?moves=false&clocks=true&evals=false&opening=false`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    const result = GameExportSchema.safeParse(body);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

// TV shows its games at /tv/<channel>, so the path has no game id. Once a game
// is over, the analysis button links to the game.
function currentGameId(): string | null {
  const link = document.querySelector('main.round :is(i5d, rm6) a.analysis')?.getAttribute('href');
  return gameIdFrom(nonEmpty(link) ?? location.pathname);
}

// The list starts with a move number, and the moves use the other tag.
function moveElements(list: HTMLElement, result: HTMLElement): HTMLElement[] {
  const indexTag = list.firstElementChild?.tagName;
  return [...list.children].filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement &&
      child.tagName !== indexTag &&
      child !== result &&
      !child.classList.contains('empty'),
  );
}

function showTimes(moves: readonly HTMLElement[], spent: readonly number[]): void {
  const longest = Math.max(...spent) || 1;
  for (const [i, move] of moves.entries()) {
    const time = spent[i];
    if (time === undefined) continue;
    setData(move, 'cdcTime', formatSpent(time));
    setStyleProperty(move, '--cdc-time', (time / longest).toFixed(3));
  }
}

interface GameTimes {
  readonly id: string;
  spent: number[] | null;
  clock: Clock | null;
  tries: number;
  /** When the last request ended. */
  at: number;
}

const newGameTimes = (id: string): GameTimes => ({ id, spent: null, clock: null, tries: 0, at: 0 });

export function createMoveTimes(): MoveTimes {
  let game = newGameTimes('');
  let loading = false;

  async function load(id: string): Promise<void> {
    loading = true;
    const data = await fetchExport(id);
    if (data && game.id === id) {
      game.clock = data.clock ?? null;
      game.spent = spentTimes(data);
    }
    loading = false;
    game.at = Date.now();
  }

  function sync(): void {
    const result = queryOne(document, 'main.round .result-wrap', HTMLElement);
    const list = result?.parentElement;
    const id = list ? currentGameId() : null;
    if (!result || !list || id === null) return;
    if (game.id !== id) game = newGameTimes(id);
    const moves = moveElements(list, result);
    // A game without a clock has no times: nothing to wait for.
    const missing = !game.spent || (game.clock !== null && game.spent.length < moves.length);
    if (missing && !loading && game.tries < MAX_TRIES && Date.now() - game.at > RETRY_MS) {
      game.tries++;
      void load(id);
    }
    if (!game.spent || game.spent.length === 0) return;
    showTimes(moves, game.spent);
    setData(list, 'cdcTimes', '');
  }

  const finishedGame = (): FinishedGame | null =>
    game.clock ? { id: game.id, clock: game.clock } : null;

  return { sync, finishedGame };
}

const tracker = createMoveTimes();

/** The game shown, once its export came back with a clock (for the New game button). */
export const finishedGame = (): FinishedGame | null => tracker.finishedGame();

export const moveTimes: Feature = {
  name: 'move times',
  start: () => onEveryTick('move times', tracker.sync),
};
