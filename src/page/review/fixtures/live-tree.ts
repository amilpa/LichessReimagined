import { someMove } from './fake-chess.ts';
import { type FakeController, fakeController, type FakeNode, nodesAlong } from './fake-lichess.ts';
import { mountFakePage } from './fake-page.ts';
import { fixtureGame } from './review-script.ts';
import { LIVE_TREE, recordFor } from './unit-cases.ts';
import type { BookEntry } from '#page/review/session.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';

// Test support: the free board's tree of LIVE_TREE, played on a fake page,
// with what the engine and the masters know of its positions.

export interface LiveTree {
  readonly ctrl: FakeController;
  /** Every node's path, the line first. */
  readonly paths: readonly string[];
  readonly evals: ReadonlyMap<string, PositionRecord>;
  readonly books: ReadonlyMap<string, BookEntry>;
}

function playLine(ctrl: FakeController, moves: readonly string[]): string[] {
  const paths: string[] = [];
  for (const uci of moves) {
    ctrl.playUci(uci);
    paths.push(ctrl.path);
  }
  return paths;
}

export function liveTree(): LiveTree {
  const root = fixtureGame('opera').nodes[0];
  if (!root) throw new Error('no start position');
  const ctrl = fakeController({ id: 'synthetic', positions: [root], synthetic: true });
  mountFakePage(ctrl);
  const line = playLine(ctrl, LIVE_TREE.line);
  ctrl.userJump(line[LIVE_TREE.variation.from - 1] ?? '');
  const variation = playLine(ctrl, LIVE_TREE.variation.moves);
  ctrl.redraw();
  const paths = [...line, ...variation];
  const nodes: FakeNode[] = [
    ctrl.tree.root,
    ...paths.map(path => nodesAlong(ctrl.tree.root, path).at(-1) ?? ctrl.tree.root),
  ];
  const evals = new Map<string, PositionRecord>();
  const books = new Map<string, BookEntry>();
  for (const [i, node] of nodes.entries()) {
    if (!LIVE_TREE.unknown.includes(i))
      evals.set(node.fen, recordFor(node.fen, someMove(node.fen)));
    const fullmove = Math.ceil(node.ply / 2);
    const named: Readonly<Record<number, string>> = LIVE_TREE.named;
    if (node.ply > 0 && i !== 4)
      books.set(node.fen, {
        book: fullmove <= LIVE_TREE.bookMoves,
        name: node.ply % 2 === 0 ? (named[fullmove] ?? '') : '',
        eco: '',
      });
  }
  return { ctrl, paths, evals, books };
}
