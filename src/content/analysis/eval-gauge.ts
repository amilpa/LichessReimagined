import type { Color } from '#shared/chess/types.ts';
import { queryOne, setData, setDataText } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// Copies the engine's score onto Lichess's eval bar, on the analysis board and
// on puzzles, so styles/board/coordinates.css can draw the bar like the Game Review's.

export interface GaugeScore {
  /** The short form ("1.2", "M3"), or '' when there's no score. */
  readonly label: string;
  readonly lead: Color;
}

// Lichess writes a negative score with a minus sign (U+2212), or a hyphen.
const MINUS = '\u2212';

/** The score of the engine line's pearl ("+1.2", "#-3"). */
export function gaugeScore(pearl: string): GaugeScore {
  const match = /^(#)?([+\-\u2212])?(\d+(?:\.\d+)?)$/.exec(pearl.trim());
  if (!match) return { label: '', lead: 'white' };
  const [, mate, sign, value = ''] = match;
  const lead = sign === '-' || sign === MINUS ? 'black' : 'white';
  return { label: mate ? `M${value}` : value, lead };
}

/** A sync task copying the engine line's score onto the eval bar. */
export function syncEvalGauge(): void {
  const main = queryOne(document, 'main.puzzle, main.analyse', HTMLElement);
  const gauge = main && queryOne(main, '.eval-gauge', HTMLElement);
  if (!main || !gauge) return;
  const { label, lead } = gaugeScore(main.querySelector('.ceval pearl')?.textContent ?? '');
  setDataText(gauge, 'cdcEval', label);
  setData(gauge, 'cdcLead', lead);
}

export const evalGauge: Feature = {
  name: 'eval gauge',
  start: () => onEveryTick('eval gauge', syncEvalGauge),
};
