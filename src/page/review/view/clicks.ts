import { closestTo } from '#shared/dom.ts';
import { analysis as pageAnalysis, type Analysis } from '#page/lichess/analysis.ts';
import type { Session } from '#page/review/session.ts';
import { type PanelAction, PanelActionSchema } from './actions.ts';
import { nextCoach } from './coach-avatar.ts';
import { goTo, jump, showBest, stepPath, stopPlaying, togglePlay } from './navigation.ts';

// The panel's and the controls' buttons, by their `data-cdc` action.

function act(session: Session, analysis: Analysis, action: Exclude<PanelAction, 'coach'>): void {
  const { view } = session;
  if (action === 'play') togglePlay(session, analysis);
  else if (action === 'explain') view.explain = !view.explain;
  else if (action === 'rows') view.allRows = !view.allRows;
  else if (action === 'first') jump(analysis, 0);
  else if (action === 'last') jump(analysis, analysis.mainline.length - 1);
  else if (action === 'prev' || action === 'next') {
    const path = stepPath(session, analysis, action === 'prev' ? -1 : 1);
    if (path !== null) goTo(analysis, path);
  } else if (action === 'best') showBest(session, analysis);
  else {
    // Starting the review goes to the first move.
    if (action === 'moves' && (!analysis.onMainline || analysis.node.ply === 0)) jump(analysis, 1);
    session.setMode(action);
  }
}

function onClick(session: Session, event: MouseEvent): void {
  const button = closestTo(event.target, '[data-cdc]', HTMLElement);
  if (!button || (button instanceof HTMLButtonElement && button.disabled)) return;
  const parsed = PanelActionSchema.safeParse(button.dataset.cdc);
  if (!parsed.success) return;
  const action = parsed.data;
  if (action === 'coach') {
    nextCoach(session, button);
    // Each coach words the remarks their own way.
    if (session.view.mode === 'moves' || session.view.mode === 'live') session.redraw(true);
    return;
  }
  const analysis = pageAnalysis();
  if (!analysis) return;
  if (action !== 'play') stopPlaying(session);
  act(session, analysis, action);
  session.redraw(true);
}

export function watchClicks(session: Session): void {
  const listener = (event: MouseEvent): void => onClick(session, event);
  session.elements.panel.addEventListener('click', listener);
  session.elements.controls.addEventListener('click', listener);
}
