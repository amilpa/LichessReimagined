import type { Analysis } from '#page/lichess/analysis.ts';
import { uciPosition } from '#page/review/engine/position.ts';
import { toRecord } from '#page/review/engine/record.ts';
import { FULL_SEARCH, QUICK_SEARCH } from '#page/review/engine/settings.ts';
import type { EnginePool } from '#page/review/engine/pool.ts';
import { engineCount, engineFor } from '#page/review/engine-pool.ts';
import type { GameWork, Mode, Session } from '#page/review/session.ts';
import { cacheProgress, cacheRecords, readCachedRecords } from './cache.ts';
import { lookUpCloud } from './cloud-lookup.ts';
import { fetchExport } from './export.ts';
import { pause, whenFree } from './wait.ts';
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

// Deep searches between two saves of the analysis's progress.
const PROGRESS_EVERY = 8;

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
  const { nodes, deep, rough, cloudAt, pending } = work;
  if (mode === 'moves') {
    const urgent = analysis.nodeList
      .slice(-3)
      // A node's ply is its index in the game (the review's own convention).
      .filter(node => nodes[node.ply] === node)
      .map(node => node.ply)
      .toReversed();
    if (analysis.onMainline) urgent.push(analysis.node.ply + 1);
    const index = urgent.find(i => i >= 0 && i < nodes.length && !deep[i] && !pending.has(i));
    if (index !== undefined) return { index, deep: true };
  }
  // Another engine's position, or one the cloud will answer soon.
  const taken = (i: number): boolean =>
    pending.has(i) || (i >= cloudAt && i <= cloudAt + CLOUD_AHEAD);
  for (let i = 0; i < nodes.length; i++)
    if (!deep[i] && !rough[i] && !taken(i)) return { index: i, deep: false };
  for (let i = 0; i < nodes.length; i++) if (!deep[i] && !taken(i)) return { index: i, deep: true };
  return null;
}

async function search(session: Session, analysis: Analysis, pool: EnginePool, job: Job) {
  const { work } = session;
  work.pending.add(job.index);
  try {
    const fen = work.nodes[job.index]?.fen ?? '';
    const result = await pool.analyse({
      position: uciPosition(work.nodes.slice(0, job.index + 1), analysis.chess960),
      limits: job.deep ? FULL_SEARCH : QUICK_SEARCH,
    });
    return toRecord(fen, result);
  } finally {
    work.pending.delete(job.index);
  }
}

/** One of the engines' loops: as many run as the pool has engines. */
async function runWorker(session: Session, analysis: Analysis, pool: EnginePool): Promise<void> {
  const { work, view } = session;
  for (;;) {
    await whenFree(analysis);
    const job = nextJob({ work, mode: view.mode, analysis });
    if (!job) {
      if (view.review?.complete) return;
      // Nothing left for this engine: the cloud or the other engines have the rest.
      await pause(100);
      continue;
    }
    const record = await search(session, analysis, pool, job);
    if (job.deep) {
      setDeep(session, job.index, record);
      if (++work.searched % PROGRESS_EVERY === 0)
        cacheProgress(analysis.gameId, work.nodes.length, work.deep);
    } else work.rough[job.index] = record;
    refresh(session, analysis);
  }
}

// One loop per engine the page will have: while some still boot, their
// loops' searches wait in the pool for the engines already up.
function runEngines(session: Session, analysis: Analysis, pool: EnginePool): Promise<void[]> {
  return Promise.all(
    Array.from({ length: engineCount() }, () => runWorker(session, analysis, pool)),
  );
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

function engineFailed(session: Session, what: string, error: unknown): void {
  console.error(`[LichessDotCom] ${what}`, error);
  session.view.error = session.language.ui.engineError;
  session.redraw(true);
}

export async function analyseGame(session: Session, analysis: Analysis): Promise<void> {
  const { work, view } = session;
  const gameId = analysis.gameId;
  work.nodes = analysis.mainline;
  const positions = work.nodes.length;
  await applyExport(session, analysis);
  seedBooks(session, analysis);
  for (const [i, record] of (readCachedRecords(gameId, positions) ?? []).entries())
    if (record) setDeep(session, i, record);
  refresh(session, analysis);
  if (view.review?.complete) return;
  if (!analysis.chess960) void lookUpCloud(session, analysis);
  let engine: EnginePool;
  try {
    engine = await engineFor(session, analysis);
  } catch (error) {
    engineFailed(session, 'engine boot failed', error);
    return;
  }
  try {
    await runEngines(session, analysis, engine);
  } catch (error) {
    engineFailed(session, 'engine failed', error);
    return;
  }
  cacheRecords(gameId, positions, work.deep);
}
