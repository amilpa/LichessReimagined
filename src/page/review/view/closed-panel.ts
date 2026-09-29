import { html, type SafeHtml, setHtml } from '#shared/html.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { CLASS_COLORS, COUNTED } from '#page/review/classes/classes.ts';
import { classIcon } from '#page/review/classes/icon-svg.ts';
import type { Session } from '#page/review/session.ts';

// The review closed: the player's best moves over a big Game Review button.

function countsLine(session: Session, analysis: Analysis): SafeHtml {
  const { view, language } = session;
  const { review } = view;
  if (view.error) return html`<span class="cdc-review__progress">${view.error}</span>`;
  if (!review?.complete)
    return html`<span class="cdc-review__progress">${language.ui.analysing} ${Math.round(view.progress * 100)}%</span>`;
  const counts = review.counts[analysis.orientation()];
  const shown = COUNTED.flatMap(moveClass => {
    const count = counts[moveClass];
    return count
      ? [
          html`<span class="cdc-review__count" style="color:${CLASS_COLORS[moveClass]}">${classIcon(moveClass)}${language.countLabel(moveClass, count)}</span>`,
        ]
      : [];
  });
  return html`${shown}`;
}

export function renderClosed(session: Session, analysis: Analysis): void {
  const { ui } = session.language;
  setHtml(
    session.elements.panel,
    html`<div class="cdc-review__counts">${countsLine(session, analysis)}</div>
      <button class="cdc-btn cdc-btn--green cdc-review__open" data-cdc="summary"><span class="cdc-review__star">★</span>${ui.review}</button>`,
  );
}
