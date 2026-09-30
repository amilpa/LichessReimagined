import { queryOne } from '#shared/dom.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { translate } from '#page/lichess/globals.ts';
import type { Session } from '#page/review/session.ts';

// "Learn from your mistakes", from the summary: Lichess's own exercise, which
// runs in its tools, so the review closes for it. A game without server
// analysis first asks for one through Lichess's own form, which our layout
// hides; the exercise waits for it.

const REQUEST = 'main.analyse > .analyse__underboard form.future-game-analysis';

const requestForm = (): HTMLFormElement | null => queryOne(document, REQUEST, HTMLFormElement);

/**
 * The button's label, Lichess's own in every language, or null when the
 * exercise can't start: Lichess offers no analysis request for a game too short
 * for one, and the exercise would wait for it forever.
 */
export function learnLabel(analysis: Analysis): string | null {
  if (!analysis.hasServerAnalysis && !requestForm()) return null;
  return translate('learnFromYourMistakes', 'Learn from your mistakes');
}

export function learnFromMistakes(session: Session, analysis: Analysis): void {
  if (!analysis.hasServerAnalysis) {
    const form = requestForm();
    if (form) queryOne(form, 'button', HTMLButtonElement)?.click();
    // Signed out, Lichess asks the user to sign in instead.
    if (form?.classList.contains('must-login')) return;
  }
  analysis.setRetro(true);
  session.setMode('normal');
  analysis.redraw();
}
