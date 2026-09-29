import { isParsing, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { pollUntil } from '#shared/poll.ts';
import { nonEmpty } from '#shared/text.ts';
import { translate } from '#page/lichess/globals.ts';

// The game page's flip button (src/content/game/board-tools.ts) uses Lichess's
// own label. Only the page world can read Lichess's translations, so this
// copies the label onto <html>.

const flipBoardLabel = (): string | null => nonEmpty(translate('flipBoard', '')) ?? null;

// The translations may still be on their way to a game page.
const mayCome = (): boolean => isParsing() || document.querySelector('main.round') !== null;

export const flipLabel: Feature = {
  name: 'flip label',
  start: () =>
    pollUntil(flipBoardLabel, label => setData(document.documentElement, 'cdcFlipLabel', label), {
      intervalMs: 250,
      giveUpMs: 30_000,
      worthWaiting: mayCome,
    }),
};
