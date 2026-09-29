import { someMove } from './fake-chess.ts';
import { fnv } from './fnv.ts';

// Test support: a stand-in for Lichess's Stockfish build, loaded like it
// through `site.asset.url`. Its scores come from a hash of the position, so
// every run (and the original script and the port) sees the same lines.

/** A module that hands the factory's options to `globalThis.cdcFakeStockfish`. */
export const FAKE_STOCKFISH_URL = `data:text/javascript,${encodeURIComponent(
  'export default async options => globalThis.cdcFakeStockfish(options);',
)}`;

/** The fake engine's output for a search: two scored lines, then the best move. */
function fakeSearch(fen: string, depth: number): string[] {
  const best = someMove(fen);
  const score = (fnv(fen) % 700) - 350;
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

/** Installs the fake: each search answers after `delay(depth)` ms of the (fake) clock. */
export function installFakeStockfish(delay: (depth: number) => number): void {
  const factory = (): FakeModule => {
    let fen = '';
    const module: FakeModule = {
      listen: () => {},
      uci: command => {
        if (command.startsWith('position fen ')) fen = command.slice('position fen '.length);
        const depth = /^go depth (\d+)/.exec(command)?.[1];
        if (depth === undefined) return;
        const lines = fakeSearch(fen, Number(depth));
        setTimeout(
          () => {
            for (const line of lines) module.listen(line);
          },
          delay(Number(depth)),
        );
      },
      getRecommendedNnue: () => '',
      setNnueBuffer: () => {},
    };
    return module;
  };
  Reflect.set(globalThis, 'cdcFakeStockfish', factory);
}
