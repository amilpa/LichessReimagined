import type { Analysis } from '#page/lichess/analysis.ts';
import { toRecord } from '#page/review/engine/record.ts';
import { FULL_SEARCH, QUICK_SEARCH } from '#page/review/engine/settings.ts';
import type { Stockfish } from '#page/review/engine/stockfish.ts';
import { engineFor } from '#page/review/engine-pool.ts';
import type { GameWork, Mode, Session } from '#page/review/session.ts';
import { cacheRecords, readCachedRecords } from './cache.ts';
import { lookUpCloud } from './cloud-lookup.ts';
import { fetchExport } from './export.ts';
import { refresh, seedBooks, setDeep } from './work.ts';

// The game's analysis: the cache or the cloud where they can, the engine for
// the rest, the move on the board first so the review can start at once.

export interface Job {
  readonly index: number;
  readonly deep: boolean;
}

interface JobInput {
  readonly work: GameWork;
  readonly mode: Mode;
  readonly analysis: Analysis;
}

// The cloud looks up the opening one position at a time. The engine skips the
// position it's looking up and the next few, which it will reach soon.
const CLOUD_AHEAD = 3;

/**
 * The next position for the engine. First those the move on the board is
 * judged from (its position, the one before, the one before that for a
 * miss) and the next move's; then a quick pass over the game for the graph;
 * then the rest at full depth, from the start.
 */
export function nextJob({ work, mode, analysis }: JobInput): Job | null {
  const { nodes, deep, rough, cloudAt } = work;
  if (mode === 'moves') {
    const urgent = analysis.nodeList
      .slice(-3)
      // A node's ply is its index in the game (the review's own convention).
      .filter(node => nodes[node.ply] === node)
      .map(node => node.ply)
      .toReversed();
    if (analysis.onMainline) urgent.push(analysis.node.ply + 1);
    const index = urgent.find(i => i >= 0 && i < nodes.length && !deep[i]);
    if (index !== undefined) return { index, deep: true };
  }
  const cloudSoon = (i: number): boolean => i >= cloudAt && i <= cloudAt + CLOUD_AHEAD;
  for (let i = 0; i < nodes.length; i++)
    if (!deep[i] && !rough[i] && !cloudSoon(i)) return { index: i, deep: false };
  for (let i = 0; i < nodes.length; i++)
    if (!deep[i] && !cloudSoon(i)) return { index: i, deep: true };
  return null;
}

const pause = (milliseconds: number): Promise<void> =>
  new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });

async function runEngine(session: Session, analysis: Analysis, engine: Stockfish): Promise<void> {
  const { work, view } = session;
  for (;;) {
    const job = nextJob({ work, mode: view.mode, analysis });
    if (!job) {
      if (view.review?.complete) return;
      // Nothing left for the engine: the cloud is still looking up the rest.
      await pause(100);
      continue;
    }
    const fen = work.nodes[job.index]?.fen ?? '';
    const result = await engine.analyse(fen, job.deep ? FULL_SEARCH : QUICK_SEARCH);
    const record = toRecord(fen, result);
    if (job.deep) setDeep(session, job.index, record);
    else work.rough[job.index] = record;
    refresh(session, analysis);
  }
}

async function applyExport(session: Session, analysis: Analysis): Promise<void> {
  const { work, view } = session;
  try {
    const found = await fetchExport(analysis.gameId, work.nodes.length);
    if (!found) return;
    work.bookPly = found.bookPly;
    view.openingName = found.openingName;
    for (const [i, record] of found.rough.entries()) if (record) work.rough[i] = record;
  } catch {
    // Offline, or no such game: the engine does it all.
  }
}

export async function analyseGame(session: Session, analysis: Analysis): Promise<void> {
  const { work, view } = session;
  const gameId = analysis.gameId;
  work.nodes = analysis.mainline;
  const positions = work.nodes.length;
  await applyExport(session, analysis);
  seedBooks(session, analysis);
  for (const [i, record] of (readCachedRecords(gameId, positions) ?? []).entries())
    setDeep(session, i, record);
  refresh(session, analysis);
  if (view.review?.complete) return;
  if (!analysis.chess960) void lookUpCloud(session, analysis);
  let engine: Stockfish;
  try {
    engine = await engineFor(session, analysis);
  } catch (error) {
    console.error('[LichessDotCom] engine boot failed', error);
    view.error = session.language.ui.engineError;
    session.redraw(true);
    return;
  }
  await runEngine(session, analysis, engine);
  cacheRecords(gameId, positions, work.deep);
}
