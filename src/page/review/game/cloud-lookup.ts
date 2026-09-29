import type { Analysis } from '#page/lichess/analysis.ts';
import { CloudEvalSchema, fromCloud } from '#page/review/engine/cloud.ts';
import { toRecord } from '#page/review/engine/record.ts';
import type { Session } from '#page/review/session.ts';
import { refresh, setDeep } from './work.ts';

// Lichess's cloud: positions someone already analyzed deep, which for a game
// means its opening. It asks for one position at a time, one request at a
// time, as Lichess asks. After a few misses in a row, the game has left the
// known lines.

const MISSES = 3;
const TIMEOUT_MS = 5000;

const cloudUrl = (fen: string): string =>
  `/api/cloud-eval?fen=${encodeURIComponent(fen)}&multiPv=2`;

type Answer = 'found' | 'miss' | 'stop';

async function lookUp(session: Session, analysis: Analysis, index: number): Promise<Answer> {
  const fen = session.work.nodes[index]?.fen ?? '';
  const response = await fetch(cloudUrl(fen), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (response.status === 404) return 'miss';
  // A refusal (too many requests) ends it.
  if (!response.ok) return 'stop';
  const cloud = CloudEvalSchema.safeParse(await response.json());
  if (!cloud.success) return 'stop';
  const result = fromCloud(fen, cloud.data);
  if (!result) return 'miss';
  setDeep(session, index, toRecord(fen, result));
  refresh(session, analysis);
  return 'found';
}

export async function lookUpCloud(session: Session, analysis: Analysis): Promise<void> {
  const { work } = session;
  let misses = 0;
  for (let i = 0; i < work.nodes.length && misses < MISSES; i++) {
    work.cloudAt = i;
    if (work.deep[i]) continue;
    let answer: Answer;
    try {
      answer = await lookUp(session, analysis, i);
    } catch {
      answer = 'stop';
    }
    if (answer === 'stop') break;
    misses = answer === 'miss' ? misses + 1 : 0;
  }
  work.cloudAt = Infinity;
}
