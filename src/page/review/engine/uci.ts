// Stockfish's UCI output, as the review reads it: the score and line of each
// MultiPV slot, and the final `bestmove`.

/** One engine line, scored from the side to move's view (mate 0: it is mated). */
export type EngineLine =
  | { readonly cp: number; readonly pv: readonly string[] }
  | { readonly mate: number; readonly pv: readonly string[] };

export interface EngineResult {
  readonly lines: readonly EngineLine[];
}

export type UciOutput =
  | { readonly kind: 'bestmove' }
  | { readonly kind: 'line'; readonly slot: number; readonly line: EngineLine };

const SCORED = / score /;
// A bound comes from a search still in progress, so its score isn't the line's.
const BOUND = / (lower|upper)bound/;

function parseScore(text: string, pv: readonly string[]): EngineLine | null {
  const cp = / score cp (-?\d+)/.exec(text)?.[1];
  if (cp !== undefined) return { cp: Number(cp), pv };
  const mate = / score mate (-?\d+)/.exec(text)?.[1];
  return mate === undefined ? null : { mate: Number(mate), pv };
}

/** Reads one line of engine output; null for anything the review ignores. */
export function parseUciOutput(text: string): UciOutput | null {
  if (text.startsWith('bestmove')) return { kind: 'bestmove' };
  if (!text.startsWith('info') || !SCORED.test(text) || BOUND.test(text)) return null;
  const slot = Number(/ multipv (\d+)/.exec(text)?.[1] ?? 1) - 1;
  const pv = (/ pv (.+)$/.exec(text)?.[1] ?? '').trim().split(/\s+/).filter(Boolean);
  const line = parseScore(text, pv);
  return line && slot >= 0 ? { kind: 'line', slot, line } : null;
}

/** Collects one search's lines, best first, until its `bestmove`. */
export class SearchCollector {
  readonly #lines: (EngineLine | undefined)[] = [];

  /** Takes a line of output; returns the result once the search is over. */
  read(text: string): EngineResult | null {
    const output = parseUciOutput(text);
    if (output?.kind === 'bestmove') {
      return { lines: this.#lines.filter(line => line !== undefined) };
    }
    if (output) this.#lines[output.slot] = output.line;
    return null;
  }
}
