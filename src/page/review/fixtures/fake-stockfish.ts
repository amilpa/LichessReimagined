import { playUci, someMove } from './fake-chess.ts';
import { fnv } from './fnv.ts';

// Test support: a stand-in for Lichess's Stockfish build, loaded like it
// through `site.asset.url`. Its scores come from a hash of the position, so
// every run (and the original script and the port) sees the same lines.

/** A module that hands the factory's options to `globalThis.cdcFakeStockfish`. */
export const FAKE_STOCKFISH_URL = `data:text/javascript,${encodeURIComponent(
  'export default async options => globalThis.cdcFakeStockfish(options);',
)}`;

/** A line of five moves from `first`, each side then pushing a pawn. */
function lineFrom(fen: string, first: string): string[] {
  const line = [first];
  let at = playUci(fen, first).fen;
  for (let next = someMove(at); next && line.length < 5; next = someMove(at)) {
    line.push(next);
    at = playUci(at, next).fen;
  }
  return line;
}

/**
 * The fake engine's output for a search: two scored lines, then the best
 * move. Asked for one move (`searchmoves`), a line of several from it.
 */
function fakeSearch(fen: string, depth: number, only: string | undefined): string[] {
  const score = (fnv(fen) % 700) - 350;
  if (only) {
    const line = lineFrom(fen, only).join(' ');
    return [`info depth ${depth} multipv 1 score cp ${score} pv ${line}`, `bestmove ${only}`];
  }
  const best = someMove(fen);
  const second = score - (fnv(`${fen}:2`) % 300);
  const pv = best ? ` pv ${best}` : '';
  return [
    `info depth ${depth} multipv 1 score cp ${score}${pv}`,
    `info depth ${depth} multipv 2 score cp ${second}${pv}`,
    `bestmove ${best ?? '(none)'}`,
  ];
}

interface FakeModule {
  listen: (line: string) => void;
  uci: (command: string) => void;
  getRecommendedNnue: () => string;
  setNnueBuffer: () => void;
}

/** The FEN that `moves` (in the engine's notation) reach from `fen`. */
export type ResolvePosition = (fen: string, moves: readonly string[]) => string;

/** Installs the fake: each search answers after `delay(depth, fen)` ms of the (fake) clock. */
export function installFakeStockfish(
  delay: (depth: number, fen: string) => number,
  resolve: ResolvePosition = fen => fen,
): void {
  const factory = (): FakeModule => {
    let fen = '';
    const module: FakeModule = {
      listen: () => {},
      uci: command => {
        if (command.startsWith('position fen ')) {
          const [from = '', moves] = command.slice('position fen '.length).split(' moves ');
          fen = resolve(from, moves?.split(' ') ?? []);
        }
        const depth = /^go depth (\d+)/.exec(command)?.[1];
        if (depth === undefined) return;
        const only = / searchmoves (\S+)/.exec(command)?.[1];
        const lines = fakeSearch(fen, Number(depth), only);
        setTimeout(
          () => {
            for (const line of lines) module.listen(line);
          },
          delay(Number(depth), fen),
        );
      },
      getRecommendedNnue: () => '',
      setNnueBuffer: () => {},
    };
    return module;
  };
  Reflect.set(globalThis, 'cdcFakeStockfish', factory);
}
