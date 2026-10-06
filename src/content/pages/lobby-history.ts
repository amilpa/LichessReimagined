import { z } from 'zod/mini';
import { createElement, onDomReady, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { pageLang } from '#shared/lang.ts';

// The homepage's lobby panel as the signed-in user's recent games, instead of
// the seek tabs (correspondence goes with them). Lichess's panel stays in the
// DOM, hidden by styles/home/history.css once ours is ready, so its socket app
// never notices.

const PlayerSchema = z.object({
  user: z.optional(z.object({ name: z.string() })),
  rating: z.optional(z.number()),
  ratingDiff: z.optional(z.number()),
  aiLevel: z.optional(z.number()),
});

const GameSchema = z.object({
  id: z.string(),
  speed: z.string(),
  winner: z.optional(z.string()),
  createdAt: z.number(),
  players: z.object({ white: PlayerSchema, black: PlayerSchema }),
});

type Game = z.infer<typeof GameSchema>;
type Result = 'win' | 'loss' | 'draw';

interface Row {
  readonly id: string;
  readonly result: Result;
  readonly opponent: string;
  readonly detail: string;
  readonly diff: number | null;
  readonly when: string;
}

function parseGames(text: string): Game[] {
  const games: Game[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const game = parseJsonLine(line);
    if (game) games.push(game);
  }
  return games;
}

function parseJsonLine(line: string): Game | null {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return null;
  }
  const result = GameSchema.safeParse(value);
  return result.success ? result.data : null;
}

function resultOf(game: Game, white: boolean): Result {
  if (game.winner === undefined) return 'draw';
  return game.winner === (white ? 'white' : 'black') ? 'win' : 'loss';
}

function toRow(game: Game, name: string, lang: string): Row {
  const white = game.players.white.user?.name?.toLowerCase() === name.toLowerCase();
  const mine = white ? game.players.white : game.players.black;
  const theirs = white ? game.players.black : game.players.white;
  const result = resultOf(game, white);
  const opponent =
    theirs.user?.name ??
    (theirs.aiLevel === undefined ? 'Anonymous' : `Computer ${theirs.aiLevel}`);
  const rating = theirs.rating === undefined ? '' : ` (${theirs.rating})`;
  const when = new Date(game.createdAt).toLocaleDateString(lang, {
    day: 'numeric',
    month: 'short',
  });
  return {
    id: game.id,
    result,
    opponent: `${opponent}${rating}`,
    detail: game.speed,
    diff: mine.ratingDiff ?? null,
    when,
  };
}

const BADGE: Readonly<Record<Result, string>> = { win: 'W', loss: 'L', draw: 'D' };

function trendOf(diff: number): string {
  if (diff > 0) return 'up';
  if (diff < 0) return 'down';
  return 'same';
}

function buildRow(row: Row): HTMLAnchorElement {
  const link = createElement('a', {
    className: `cdc-history__game cdc-history__game--${row.result}`,
    attrs: { href: `/${row.id}` },
  });
  link.append(
    createElement('span', { className: 'cdc-history__badge', text: BADGE[row.result] }),
    createElement('span', { className: 'cdc-history__main', text: row.opponent }),
    createElement('span', { className: 'cdc-history__detail', text: row.detail }),
  );
  if (row.diff !== null) {
    const sign = row.diff > 0 ? '+' : '';
    link.append(
      createElement('span', {
        className: `cdc-history__diff cdc-history__diff--${trendOf(row.diff)}`,
        text: `${sign}${row.diff}`,
      }),
    );
  }
  link.append(createElement('time', { className: 'cdc-history__when', text: row.when }));
  return link;
}

function buildSection(): HTMLElement {
  const section = createElement('section', { className: 'cdc-history' });
  section.append(createElement('h2', { className: 'cdc-history__title', text: 'Recent games' }));
  section.append(createElement('p', { className: 'cdc-history__empty', text: 'Loading…' }));
  return section;
}

async function loadGames(name: string): Promise<Game[] | null> {
  try {
    // NDJSON, not the default PGN: ask twice, header and parameter.
    const response = await fetch(
      `/api/games/user/${encodeURIComponent(name)}?max=12&moves=false&pgnInJson=true`,
      { headers: { Accept: 'application/x-ndjson' } },
    );
    if (!response.ok) return null;
    return parseGames(await response.text());
  } catch {
    return null;
  }
}

async function mount(main: HTMLElement, name: string): Promise<void> {
  // Desktop only: below 1020px the history stylesheet stays out.
  if (!matchMedia('(min-width: 1020px)').matches) return;
  const app = queryOne(main, '.lobby__app', HTMLElement);
  if (!app) return;
  // Mount first, fill after: the lobby hides at once, no flash of seeks.
  const section = buildSection();
  app.after(section);
  setData(main, 'cdcHistory', '');
  const games = await loadGames(name);
  // No history to show: hand the panel back to Lichess.
  if (!games) {
    section.remove();
    setData(main, 'cdcHistory', null);
    return;
  }
  section.querySelector('.cdc-history__empty')?.remove();
  if (games.length === 0) {
    section.append(
      createElement('p', { className: 'cdc-history__empty', text: 'No games yet.' }),
    );
    return;
  }
  const lang = pageLang();
  for (const game of games) section.append(buildRow(toRow(game, name, lang)));
}

export const lobbyHistory: Feature = {
  name: 'lobby history',
  start: () => {
    onDomReady(() => {
      const main = queryOne(document, 'main.lobby', HTMLElement);
      const name = document.body.dataset.user;
      if (main && name) void mount(main, name);
    });
  },
};
