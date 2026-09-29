import { COACH_COUNT, CoachMoodSchema } from '#shared/coach.ts';
import { queryOne } from '#shared/dom.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { postCoachState } from '#shared/protocol.ts';
import { StorageKey, writeStored } from '#shared/storage.ts';
import { CLASS_COLORS, classMood, type MoveClass } from '#page/review/classes/classes.ts';
import type { AvatarState, Session } from '#page/review/session.ts';

// The coach's face shows the verdict, played by the content script's rig
// (src/content/coach), which can reach the extension's files. Its marks over
// the head pop up once per move, not on every render of the same move.

/** Whether the marks pop for this verdict: the first time the coach reacts to it on this move. */
export function takeReaction(coach: AvatarState, moveClass: MoveClass | null, at: string): boolean {
  const key = moveClass && classMood(moveClass) ? `${at}|${moveClass}` : '';
  const react = key !== '' && key !== coach.reacted;
  coach.reacted = key;
  return react;
}

export interface AvatarInput {
  readonly coachId: number;
  /** The verdict the coach reacts to, if any. */
  readonly moveClass: MoveClass | null;
  /** The marks pop (see `takeReaction`). */
  readonly react: boolean;
  readonly label: string;
}

export function avatarMarkup({ coachId, moveClass, react, label }: AvatarInput): SafeHtml {
  const mood = moveClass ? classMood(moveClass) : null;
  const moodColor = mood && moveClass ? `--cdc-mood-c:${CLASS_COLORS[moveClass]}` : null;
  const style = moodColor === null ? '' : html` style="${moodColor}"`;
  return html`<button class="cdc-coach__avatar${react ? ' cdc-coach__avatar--react' : ''}" data-cdc="coach" data-cdc-coach-id="${coachId}" data-cdc-mood="${mood ?? 'neutral'}"${style} data-cdc-tip="${label}" aria-label="${label}"><span class="cdc-coach__face"></span></button>`;
}

/** Tells the content script which coach shows, how it looks, and whether it talks. */
export function tellCoach(session: Session): void {
  const { avatar } = session.coach;
  if (!avatar?.isConnected) return;
  const mood = CoachMoodSchema.safeParse(avatar.dataset.cdcMood);
  postCoachState({
    coach: Number(avatar.dataset.cdcCoachId),
    mood: mood.success ? mood.data : 'neutral',
    talking: session.stream.timer !== 0,
  });
}

const KEPT_ATTRIBUTES = ['data-cdc-coach-id', 'data-cdc-mood', 'style'];

// The panel is drawn again on every change, but the coach stays one element:
// a render hands it the new mood, so its animation carries on.
export function keepAvatar(session: Session): void {
  const fresh = queryOne(session.elements.panel, '.cdc-coach__avatar', HTMLElement);
  if (!fresh) return;
  const kept = session.coach.avatar;
  if (kept && kept !== fresh) {
    for (const name of KEPT_ATTRIBUTES) {
      const value = fresh.getAttribute(name);
      if (value === null) kept.removeAttribute(name);
      else kept.setAttribute(name, value);
    }
    kept.classList.remove('cdc-coach__avatar--react');
    if (fresh.classList.contains('cdc-coach__avatar--react')) {
      // Reading the layout restarts the marks' animation.
      void kept.offsetWidth;
      kept.classList.add('cdc-coach__avatar--react');
    }
    fresh.replaceWith(kept);
  } else session.coach.avatar = fresh;
  tellCoach(session);
}

/** The next coach, kept for the next review; each words the remarks their own way. */
export function nextCoach(session: Session, avatar: HTMLElement): void {
  const coach = (session.coach.id % COACH_COUNT) + 1;
  session.coach.id = coach;
  writeStored(StorageKey.coach, coach);
  avatar.dataset.cdcCoachId = String(coach);
  tellCoach(session);
}
